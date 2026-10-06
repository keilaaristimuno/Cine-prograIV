-- ============================================================================
-- MIGRACIÓN M6.4: Validación Atómica de Retiro / Entrega de Candy Bar
-- ============================================================================
-- 1. Función RPC transaccional: public.validar_entrega_candy(p_codigo text)
--    - Autorización estricta: solo roles 'empleado' o 'administrador'
--    - Validación estricta del formato CD-XXXX-XXXX con alfabeto seguro
--    - Bloqueo pesimista con FOR UPDATE en public.compras_candy
--    - Verificación estricta de estado inicial 'pendiente_retiro'
--    - Detección y rechazo de pedidos ya entregados o cancelados
--    - Transición atómica de estado a 'entregada' y registro de auditoría
--    - Retorno de información operacional mínima (productos, cantidades, auditoría)
--
-- 2. Privilegio mínimo:
--    - REVOKE a PUBLIC y anon
--    - GRANT EXECUTE solo a usuarios autenticados
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validar_entrega_candy(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_codigo_normalizado text;
  v_compra RECORD;
  v_validador_id uuid;
  v_validador_email text;
  v_validador_previo_email text;
  v_ahora timestamptz;
  v_lineas_json jsonb;
  v_total_unidades integer;
BEGIN
  -- 1. Verificar autorización de rol (solo empleado o administrador)
  IF NOT public.es_empleado_o_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren permisos de empleado o administrador para validar retiro de Candy.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Normalizar código recibido
  v_codigo_normalizado := upper(trim(COALESCE(p_codigo, '')));

  -- Validación estricta de formato: CD-XXXX-XXXX usando exclusivamente el alfabeto del generador
  IF v_codigo_normalizado !~ '^CD-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'estado_validacion', 'codigo_invalido',
      'mensaje', 'El código de retiro no tiene un formato válido (debe ser CD-XXXX-XXXX).'
    );
  END IF;

  -- 3. Buscar la compra y bloquear la fila con FOR UPDATE para prevenir carreras concurrentes
  SELECT
    c.id,
    c.codigo_alfanumerico,
    c.total,
    c.estado,
    c.retiro_validado,
    c.retiro_validado_en,
    c.retiro_validado_por,
    c.creado_en
  INTO v_compra
  FROM public.compras_candy c
  WHERE c.codigo_alfanumerico = v_codigo_normalizado
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'estado_validacion', 'codigo_inexistente',
      'mensaje', 'No se encontró ningún pedido de Candy Bar con el código ingresado.'
    );
  END IF;

  -- 4. Verificar si el pedido ya fue entregado previamente (uso único del QR / código)
  IF v_compra.retiro_validado OR v_compra.estado = 'entregada' THEN
    -- Auditoría: obtener email del empleado que realizó la entrega previa desde auth.users
    SELECT COALESCE(email, 'Empleado')
    INTO v_validador_previo_email
    FROM auth.users
    WHERE id = v_compra.retiro_validado_por;

    -- Obtener resumen de los productos entregados previamente
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'nombre_producto', l.nombre_producto,
          'categoria_producto', l.categoria_producto,
          'cantidad', l.cantidad,
          'precio_unitario', l.precio_unitario,
          'subtotal', l.subtotal
        ) ORDER BY l.creado_en, l.nombre_producto
      ),
      COALESCE(sum(l.cantidad), 0)
    INTO
      v_lineas_json,
      v_total_unidades
    FROM public.lineas_compra_candy l
    WHERE l.compra_candy_id = v_compra.id;

    RETURN jsonb_build_object(
      'ok', false,
      'estado_validacion', 'ya_entregado',
      'mensaje', 'Este pedido de Candy Bar ya fue entregado previamente.',
      'codigo_alfanumerico', v_compra.codigo_alfanumerico,
      'total', v_compra.total,
      'total_unidades', v_total_unidades,
      'fecha_compra', v_compra.creado_en,
      'entregado_en', v_compra.retiro_validado_en,
      'entregado_por_email', COALESCE(v_validador_previo_email, 'Empleado'),
      'productos', COALESCE(v_lineas_json, '[]'::jsonb)
    );
  END IF;

  -- 5. Verificar si el pedido se encuentra cancelado
  IF v_compra.estado = 'cancelada' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'estado_validacion', 'pedido_cancelado',
      'mensaje', 'El pedido se encuentra cancelado y no puede ser entregado.',
      'codigo_alfanumerico', v_compra.codigo_alfanumerico,
      'total', v_compra.total,
      'fecha_compra', v_compra.creado_en
    );
  END IF;

  -- 6. Verificación estricta de estado inicial: SOLO 'pendiente_retiro'
  IF v_compra.estado <> 'pendiente_retiro' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'estado_validacion', 'estado_invalido',
      'mensaje', 'El pedido no se encuentra en estado pendiente de retiro.'
    );
  END IF;

  -- 7. Registrar atómicamente la entrega
  v_ahora := clock_timestamp();
  v_validador_id := auth.uid();

  UPDATE public.compras_candy
  SET
    estado = 'entregada',
    retiro_validado = true,
    retiro_validado_en = v_ahora,
    retiro_validado_por = v_validador_id
  WHERE id = v_compra.id;

  -- Obtener email del empleado validador actual directamente desde auth.users
  SELECT COALESCE(email, 'Empleado')
  INTO v_validador_email
  FROM auth.users
  WHERE id = v_validador_id;

  -- 8. Obtener líneas snapshot de productos para armar el pedido en mostrador
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'nombre_producto', l.nombre_producto,
        'categoria_producto', l.categoria_producto,
        'cantidad', l.cantidad,
        'precio_unitario', l.precio_unitario,
        'subtotal', l.subtotal
      ) ORDER BY l.creado_en, l.nombre_producto
    ),
    COALESCE(sum(l.cantidad), 0)
  INTO
    v_lineas_json,
    v_total_unidades
  FROM public.lineas_compra_candy l
  WHERE l.compra_candy_id = v_compra.id;

  -- 9. Retornar payload operacional completo y exitoso
  RETURN jsonb_build_object(
    'ok', true,
    'estado_validacion', 'entrega_autorizada',
    'mensaje', 'Entrega autorizada. Entregar los productos detallados al cliente.',
    'codigo_alfanumerico', v_compra.codigo_alfanumerico,
    'estado', 'entregada',
    'total', v_compra.total,
    'total_unidades', v_total_unidades,
    'fecha_compra', v_compra.creado_en,
    'entregado_en', v_ahora,
    'entregado_por_email', COALESCE(v_validador_email, 'Empleado'),
    'productos', COALESCE(v_lineas_json, '[]'::jsonb)
  );
END;
$$;

-- Concesión de privilegios
REVOKE ALL ON FUNCTION public.validar_entrega_candy(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validar_entrega_candy(text) TO authenticated;
