-- ============================================================================
-- MIGRACIÓN M5.4: Validación de Acceso a Sala para Empleados y Administradores
-- ============================================================================
-- 1. Función auxiliar para verificar si el usuario autenticado es empleado o admin
-- 2. Función RPC public.validar_acceso_sala(p_codigo text)
--    - Seguridad DEFINER, search_path = public, pg_temp
--    - Control de concurrencia mediante FOR UPDATE
--    - Validación explícita COUNT(DISTINCT e.funcion_id) = 1
--    - Validación de uso único del código grupal (acceso_sala_validado)
--    - Validación de función no cancelada
--    - Email de validador actual y previo obtenido exclusivamente de auth.users
--    - Retorno de payload operacional mínimo (sin precios ni PII del comprador)
-- 3. Revocación de acceso anónimo / público y concesión a usuarios autenticados
-- ============================================================================

-- 1. Helper para comprobación de rol empleado o admin
CREATE OR REPLACE FUNCTION public.es_empleado_o_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles
    WHERE usuario_id = auth.uid()
      AND rol IN ('empleado', 'administrador')
  );
$$;

REVOKE ALL ON FUNCTION public.es_empleado_o_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_empleado_o_admin() TO authenticated;

-- 2. Función RPC transaccional de validación atómica de acceso a sala
CREATE OR REPLACE FUNCTION public.validar_acceso_sala(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_codigo_normalizado text;
  v_compra RECORD;
  v_cant_funciones integer;
  v_cant_entradas integer;
  v_funcion_id uuid;
  v_funcion_estado text;
  v_funcion_inicio timestamptz;
  v_funcion_formato text;
  v_pelicula_nombre text;
  v_pelicula_clasificacion text;
  v_sala_numero integer;
  v_sala_nombre text;
  v_validador_id uuid;
  v_validador_email text;
  v_ahora timestamptz;
  v_butacas_json jsonb;
BEGIN
  -- 1. Verificar autorización de rol (empleado o administrador)
  IF NOT public.es_empleado_o_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren permisos de empleado o administrador para validar entradas.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Normalizar código recibido
  v_codigo_normalizado := upper(trim(COALESCE(p_codigo, '')));

  IF v_codigo_normalizado = '' OR length(v_codigo_normalizado) < 5 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'estado_validacion', 'codigo_invalido',
      'mensaje', 'El código de acceso no tiene un formato válido.'
    );
  END IF;

  -- 3. Buscar la compra y bloquear la fila para prevenir carreras concurrentes
  SELECT
    c.id,
    c.estado,
    c.acceso_sala_validado,
    c.acceso_sala_validado_en,
    c.acceso_sala_validado_por
  INTO v_compra
  FROM public.compras c
  WHERE c.codigo_alfanumerico = v_codigo_normalizado
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'estado_validacion', 'codigo_invalido',
      'mensaje', 'No se encontró ninguna compra registrada con el código ingresado.'
    );
  END IF;

  -- 4. Verificar estado completada de la compra
  IF v_compra.estado <> 'completada' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'estado_validacion', 'compra_no_completada',
      'mensaje', 'La compra no se encuentra completada o fue cancelada.'
    );
  END IF;

  -- 5. Validar explícitamente COUNT(DISTINCT e.funcion_id) = 1 sobre entradas activas
  SELECT
    count(DISTINCT e.funcion_id),
    count(e.id)
  INTO
    v_cant_funciones,
    v_cant_entradas
  FROM public.entradas e
  WHERE e.compra_id = v_compra.id
    AND e.estado = 'comprada';

  IF v_cant_entradas = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'estado_validacion', 'sin_entradas_activas',
      'mensaje', 'Esta compra no posee entradas activas válidas para ingresar.'
    );
  END IF;

  IF v_cant_funciones <> 1 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'estado_validacion', 'inconsistencia_funciones',
      'mensaje', 'Inconsistencia interna: las entradas de la compra pertenecen a más de una función o a ninguna.'
    );
  END IF;

  -- 6. Verificar si la compra ya fue validada previamente
  IF v_compra.acceso_sala_validado THEN
    -- Obtener datos para desplegar información de la entrada ya consumida y auditoría del validador previo
    SELECT
      f.id,
      f.estado,
      f.fecha_hora_inicio,
      f.formato,
      p.nombre,
      p.clasificacion_edad,
      s.numero,
      s.nombre,
      u_val.email
    INTO
      v_funcion_id,
      v_funcion_estado,
      v_funcion_inicio,
      v_funcion_formato,
      v_pelicula_nombre,
      v_pelicula_clasificacion,
      v_sala_numero,
      v_sala_nombre,
      v_validador_email
    FROM public.entradas e
    JOIN public.funciones f ON f.id = e.funcion_id
    JOIN public.peliculas p ON p.id = f.pelicula_id
    JOIN public.salas s ON s.id = f.sala_id
    LEFT JOIN auth.users u_val ON u_val.id = v_compra.acceso_sala_validado_por
    WHERE e.compra_id = v_compra.id
      AND e.estado = 'comprada'
    LIMIT 1;

    -- Butacas de la compra
    SELECT jsonb_agg(
      jsonb_build_object(
        'fila', b.fila,
        'numero', b.numero,
        'bloque', b.bloque,
        'tipo', b.tipo
      ) ORDER BY b.fila, b.numero
    )
    INTO v_butacas_json
    FROM public.entradas e
    JOIN public.butacas b ON b.id = e.butaca_id
    WHERE e.compra_id = v_compra.id
      AND e.estado = 'comprada';

    RETURN jsonb_build_object(
      'ok', false,
      'estado_validacion', 'ya_utilizado',
      'mensaje', 'Esta entrada ya fue utilizada para ingresar a la sala.',
      'codigo_alfanumerico', v_codigo_normalizado,
      'pelicula_nombre', v_pelicula_nombre,
      'clasificacion_edad', v_pelicula_clasificacion,
      'formato', v_funcion_formato,
      'sala_numero', v_sala_numero,
      'sala_nombre', v_sala_nombre,
      'fecha_hora_inicio', v_funcion_inicio,
      'cantidad_entradas', v_cant_entradas,
      'butacas', COALESCE(v_butacas_json, '[]'::jsonb),
      'validado_en', v_compra.acceso_sala_validado_en,
      'validado_por_email', COALESCE(v_validador_email, 'Empleado')
    );
  END IF;

  -- 7. Obtener datos de la función y película
  SELECT
    f.id,
    f.estado,
    f.fecha_hora_inicio,
    f.formato,
    p.nombre,
    p.clasificacion_edad,
    s.numero,
    s.nombre
  INTO
    v_funcion_id,
    v_funcion_estado,
    v_funcion_inicio,
    v_funcion_formato,
    v_pelicula_nombre,
    v_pelicula_clasificacion,
    v_sala_numero,
    v_sala_nombre
  FROM public.entradas e
  JOIN public.funciones f ON f.id = e.funcion_id
  JOIN public.peliculas p ON p.id = f.pelicula_id
  JOIN public.salas s ON s.id = f.sala_id
  WHERE e.compra_id = v_compra.id
    AND e.estado = 'comprada'
  LIMIT 1;

  -- 8. Validar si la función fue cancelada
  IF v_funcion_estado = 'cancelada' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'estado_validacion', 'funcion_cancelada',
      'mensaje', 'La función correspondiente a esta entrada se encuentra cancelada.',
      'codigo_alfanumerico', v_codigo_normalizado,
      'pelicula_nombre', v_pelicula_nombre,
      'clasificacion_edad', v_pelicula_clasificacion,
      'formato', v_funcion_formato,
      'sala_numero', v_sala_numero,
      'sala_nombre', v_sala_nombre,
      'fecha_hora_inicio', v_funcion_inicio,
      'cantidad_entradas', v_cant_entradas
    );
  END IF;

  -- 9. Registrar la validación atómica del acceso
  v_ahora := clock_timestamp();
  v_validador_id := auth.uid();

  UPDATE public.compras
  SET
    acceso_sala_validado = true,
    acceso_sala_validado_en = v_ahora,
    acceso_sala_validado_por = v_validador_id
  WHERE id = v_compra.id;

  -- Obtener email del validador actual exclusivamente desde auth.users
  SELECT COALESCE(email, 'Empleado')
  INTO v_validador_email
  FROM auth.users
  WHERE id = v_validador_id;

  -- 10. Agrupar butacas (sin precios ni importes)
  SELECT jsonb_agg(
    jsonb_build_object(
      'fila', b.fila,
      'numero', b.numero,
      'bloque', b.bloque,
      'tipo', b.tipo
    ) ORDER BY b.fila, b.numero
  )
  INTO v_butacas_json
  FROM public.entradas e
  JOIN public.butacas b ON b.id = e.butaca_id
  WHERE e.compra_id = v_compra.id
    AND e.estado = 'comprada';

  -- 11. Retornar payload operacional mínimo y exitoso
  RETURN jsonb_build_object(
    'ok', true,
    'estado_validacion', 'autorizado',
    'mensaje', 'Acceso autorizado. ¡Que disfruten la función!',
    'codigo_alfanumerico', v_codigo_normalizado,
    'pelicula_nombre', v_pelicula_nombre,
    'clasificacion_edad', v_pelicula_clasificacion,
    'formato', v_funcion_formato,
    'sala_numero', v_sala_numero,
    'sala_nombre', v_sala_nombre,
    'fecha_hora_inicio', v_funcion_inicio,
    'cantidad_entradas', v_cant_entradas,
    'butacas', COALESCE(v_butacas_json, '[]'::jsonb),
    'validado_en', v_ahora,
    'validado_por_email', COALESCE(v_validador_email, 'Empleado')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validar_acceso_sala(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validar_acceso_sala(text) TO authenticated;
