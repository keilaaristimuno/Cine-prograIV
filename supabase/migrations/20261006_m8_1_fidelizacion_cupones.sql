-- ============================================================================
-- MIGRACIÓN M8.1: Núcleo de Fidelización, Puntos, Recompensas y Cupones
-- ============================================================================
-- 1. Extensión de public.configuracion_cine con parámetros de fidelización.
-- 2. Saldo de puntos cacheado en public.perfiles con garantía CHECK (saldo_puntos >= 0).
-- 3. Catálogo de recompensas en public.recompensas (gestión de admin con public.es_administrador()).
-- 4. Tenencia de cupones de cliente en public.cupones_cliente (formato CP-XXXX-XXXX).
-- 5. Libro mayor inmutable en public.movimientos_puntos con índices únicos parciales
--    para acreditación idempotente por compra_id y compra_candy_id.
-- 6. Helper interno de acreditación automática + triggers transaccionales.
-- 7. RPC transaccional de canje: public.canjear_recompensa con bloqueo pesimista FOR UPDATE.
-- 8. RPC de consulta de fidelización del cliente: public.obtener_mi_fidelizacion().
-- ============================================================================

-- 1. Extender configuracion_cine
ALTER TABLE public.configuracion_cine
  ADD COLUMN IF NOT EXISTS pesos_por_punto numeric(10,2) NOT NULL DEFAULT 1.00 CHECK (pesos_por_punto > 0),
  ADD COLUMN IF NOT EXISTS fidelizacion_activa boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.configuracion_cine.pesos_por_punto IS 'Monto en pesos gastados necesario para generar 1 punto (por defecto 1.00 = 1 peso 1 punto).';
COMMENT ON COLUMN public.configuracion_cine.fidelizacion_activa IS 'Habilita o pausa el programa de fidelización y canjes.';

-- 2. Extender perfiles con saldo operativo
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS saldo_puntos integer NOT NULL DEFAULT 0 CHECK (saldo_puntos >= 0);

COMMENT ON COLUMN public.perfiles.saldo_puntos IS 'Saldo actual de puntos del usuario, actualizado de forma transaccional.';

-- 3. Crear catálogo de recompensas
CREATE TABLE IF NOT EXISTS public.recompensas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL CHECK (char_length(trim(nombre)) >= 3),
  descripcion text NOT NULL,
  costo_puntos integer NOT NULL CHECK (costo_puntos > 0),
  tipo text NOT NULL CHECK (tipo IN ('entrada_gratis', 'descuento_porcentual', 'descuento_monto_fijo', 'producto_candy')),
  valor_beneficio numeric(10,2) NOT NULL DEFAULT 0 CHECK (valor_beneficio >= 0),
  producto_candy_id uuid REFERENCES public.productos_candy(id) ON DELETE SET NULL,
  dias_validez integer NOT NULL DEFAULT 30 CHECK (dias_validez > 0),
  activa boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.recompensas IS 'Catálogo de recompensas y beneficios canjeables por puntos.';
CREATE INDEX IF NOT EXISTS idx_recompensas_activa ON public.recompensas (activa, costo_puntos ASC);

-- 4. Crear tabla de cupones asignados al cliente
CREATE TABLE IF NOT EXISTS public.cupones_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_cupon text NOT NULL,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recompensa_id uuid REFERENCES public.recompensas(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada_gratis', 'descuento_porcentual', 'descuento_monto_fijo', 'producto_candy')),
  valor_beneficio numeric(10,2) NOT NULL CHECK (valor_beneficio >= 0),
  producto_candy_id uuid REFERENCES public.productos_candy(id) ON DELETE SET NULL,
  descripcion text NOT NULL,
  origen text NOT NULL DEFAULT 'canje_puntos' CHECK (origen IN ('canje_puntos', 'promocion_sistema', 'cortesia_admin')),
  estado text NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'utilizado', 'vencido', 'cancelado')),
  compra_id uuid REFERENCES public.compras(id) ON DELETE SET NULL,
  compra_candy_id uuid REFERENCES public.compras_candy(id) ON DELETE SET NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  vence_en timestamptz NOT NULL,
  utilizado_en timestamptz,
  CONSTRAINT uq_cupones_cliente_codigo UNIQUE (codigo_cupon),
  CONSTRAINT chk_cupon_cliente_codigo_formato CHECK (
    codigo_cupon ~ '^CP-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$'
  ),
  CONSTRAINT chk_cupon_cliente_fechas CHECK (vence_en > creado_en)
);

COMMENT ON TABLE public.cupones_cliente IS 'Instancias concretas de cupones asignadas a usuarios específicos.';
CREATE INDEX IF NOT EXISTS idx_cupones_cliente_usuario ON public.cupones_cliente (usuario_id, estado, vence_en);
CREATE INDEX IF NOT EXISTS idx_cupones_cliente_codigo ON public.cupones_cliente (codigo_cupon);

-- 5. Crear libro mayor de movimientos de puntos (Ledger)
CREATE TABLE IF NOT EXISTS public.movimientos_puntos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_movimiento text NOT NULL CHECK (
    tipo_movimiento IN (
      'acreditacion_compra_cine',
      'acreditacion_compra_candy',
      'debito_canje'
    )
  ),
  puntos integer NOT NULL CHECK (puntos > 0),
  saldo_resultante integer NOT NULL CHECK (saldo_resultante >= 0),
  compra_id uuid REFERENCES public.compras(id) ON DELETE RESTRICT,
  compra_candy_id uuid REFERENCES public.compras_candy(id) ON DELETE RESTRICT,
  cupon_id uuid REFERENCES public.cupones_cliente(id) ON DELETE SET NULL,
  motivo text NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),

  -- Restricción estricta de coherencia entre tipo de movimiento y llaves foráneas
  CONSTRAINT chk_movimiento_coherencia CHECK (
    (tipo_movimiento = 'acreditacion_compra_cine' AND compra_id IS NOT NULL AND compra_candy_id IS NULL AND cupon_id IS NULL)
    OR
    (tipo_movimiento = 'acreditacion_compra_candy' AND compra_candy_id IS NOT NULL AND compra_id IS NULL AND cupon_id IS NULL)
    OR
    (tipo_movimiento = 'debito_canje' AND cupon_id IS NOT NULL AND compra_id IS NULL AND compra_candy_id IS NULL)
  )
);

COMMENT ON TABLE public.movimientos_puntos IS 'Historial auditable e inmutable de créditos y débitos de puntos.';

-- Índices únicos parciales para garantizar IDEMPOTENCIA estricta por compra
CREATE UNIQUE INDEX IF NOT EXISTS uq_movimientos_acreditacion_cine
  ON public.movimientos_puntos (compra_id)
  WHERE tipo_movimiento = 'acreditacion_compra_cine';

CREATE UNIQUE INDEX IF NOT EXISTS uq_movimientos_acreditacion_candy
  ON public.movimientos_puntos (compra_candy_id)
  WHERE tipo_movimiento = 'acreditacion_compra_candy';

CREATE INDEX IF NOT EXISTS idx_movimientos_puntos_usuario ON public.movimientos_puntos (usuario_id, creado_en DESC);


-- 6. Configurar RLS (Row Level Security)

-- Recompensas: lectura pública, mutación solo administradores (public.es_administrador())
ALTER TABLE public.recompensas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recompensas_lectura_publica" ON public.recompensas;
CREATE POLICY "recompensas_lectura_publica"
  ON public.recompensas FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "recompensas_admin_insert" ON public.recompensas;
CREATE POLICY "recompensas_admin_insert"
  ON public.recompensas FOR INSERT
  WITH CHECK (public.es_administrador());

DROP POLICY IF EXISTS "recompensas_admin_update" ON public.recompensas;
CREATE POLICY "recompensas_admin_update"
  ON public.recompensas FOR UPDATE
  USING (public.es_administrador())
  WITH CHECK (public.es_administrador());

DROP POLICY IF EXISTS "recompensas_admin_delete" ON public.recompensas;
CREATE POLICY "recompensas_admin_delete"
  ON public.recompensas FOR DELETE
  USING (public.es_administrador());

-- Cupones cliente: lectura propia o administrador; inserción/actualización directa cliente bloqueada
ALTER TABLE public.cupones_cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cupones_cliente_select" ON public.cupones_cliente;
CREATE POLICY "cupones_cliente_select"
  ON public.cupones_cliente FOR SELECT
  USING (usuario_id = auth.uid() OR public.es_administrador());

-- Movimientos puntos: lectura propia o administrador; inserción directa cliente bloqueada
ALTER TABLE public.movimientos_puntos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movimientos_puntos_select" ON public.movimientos_puntos;
CREATE POLICY "movimientos_puntos_select"
  ON public.movimientos_puntos FOR SELECT
  USING (usuario_id = auth.uid() OR public.es_administrador());


-- 7. Generador criptográficamente seguro de códigos de cupones CP-XXXX-XXXX
CREATE OR REPLACE FUNCTION public.generar_codigo_cupon_fidelizacion()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_caracteres text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 caracteres (sin 0, O, 1, I)
  v_longitud integer := length(v_caracteres);
  v_parte1 text;
  v_parte2 text;
  v_codigo text;
  v_colision boolean := true;
  v_intentos integer := 0;
  v_max_intentos integer := 10;
  v_i integer;
BEGIN
  WHILE v_colision LOOP
    v_intentos := v_intentos + 1;
    IF v_intentos > v_max_intentos THEN
      RAISE EXCEPTION 'No se pudo generar un código único de cupón tras reiterados intentos.'
        USING ERRCODE = 'P0005';
    END IF;

    -- Generar 4 caracteres para la primera parte usando gen_random_bytes (pgcrypto)
    v_parte1 := '';
    FOR v_i IN 1..4 LOOP
      v_parte1 := v_parte1 || substr(v_caracteres, ((get_byte(gen_random_bytes(1), 0) % v_longitud) + 1), 1);
    END LOOP;

    -- Generar 4 caracteres para la segunda parte usando gen_random_bytes (pgcrypto)
    v_parte2 := '';
    FOR v_i IN 1..4 LOOP
      v_parte2 := v_parte2 || substr(v_caracteres, ((get_byte(gen_random_bytes(1), 0) % v_longitud) + 1), 1);
    END LOOP;

    v_codigo := 'CP-' || v_parte1 || '-' || v_parte2;

    -- Verificar unicidad contra la tabla de cupones de clientes
    SELECT EXISTS (
      SELECT 1 FROM public.cupones_cliente WHERE codigo_cupon = v_codigo
    ) INTO v_colision;
  END LOOP;

  RETURN v_codigo;
END;
$$;

REVOKE ALL ON FUNCTION public.generar_codigo_cupon_fidelizacion() FROM PUBLIC, anon, authenticated;


-- 8. Helper interno de acreditación idempotente de compras
CREATE OR REPLACE FUNCTION public.acreditar_puntos_compra(
  p_compra_id uuid,
  p_tipo text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario_id uuid;
  v_total numeric(10,2);
  v_estado text;
  v_pesos_por_punto numeric(10,2);
  v_fidelizacion_activa boolean;
  v_puntos_a_sumar integer;
  v_saldo_actual integer;
  v_nuevo_saldo integer;
  v_tipo_mov text;
  v_motivo text;
  v_insertado boolean := false;
BEGIN
  -- 1. Obtener parámetros comerciales vigentes
  SELECT pesos_por_punto, fidelizacion_activa
  INTO v_pesos_por_punto, v_fidelizacion_activa
  FROM public.configuracion_cine
  WHERE id = 1;

  IF NOT COALESCE(v_fidelizacion_activa, true) THEN
    RETURN 0;
  END IF;

  v_pesos_por_punto := COALESCE(v_pesos_por_punto, 1.00);
  IF v_pesos_por_punto <= 0 THEN
    v_pesos_por_punto := 1.00;
  END IF;

  -- 2. Inspeccionar la compra según su origen (Cine o Candy)
  IF p_tipo = 'cine' THEN
    SELECT usuario_id, total, estado
    INTO v_usuario_id, v_total, v_estado
    FROM public.compras
    WHERE id = p_compra_id;

    -- Validar elegibilidad: solo registrado, compra completada y total positivo
    IF v_usuario_id IS NULL OR v_estado <> 'completada' OR COALESCE(v_total, 0) <= 0 THEN
      RETURN 0;
    END IF;

    v_tipo_mov := 'acreditacion_compra_cine';
    v_motivo := 'Puntos por compra de entradas de cine';

  ELSIF p_tipo = 'candy' THEN
    SELECT usuario_id, total, estado
    INTO v_usuario_id, v_total, v_estado
    FROM public.compras_candy
    WHERE id = p_compra_id;

    -- En Candy Bar, la compra pagada debe encontrarse en 'pendiente_retiro'
    IF v_usuario_id IS NULL OR v_estado <> 'pendiente_retiro' OR COALESCE(v_total, 0) <= 0 THEN
      RETURN 0;
    END IF;

    v_tipo_mov := 'acreditacion_compra_candy';
    v_motivo := 'Puntos por compra en Candy Bar';

  ELSE
    RETURN 0;
  END IF;

  -- 3. Calcular puntos según backend: floor(total / pesos_por_punto)
  v_puntos_a_sumar := floor(v_total / v_pesos_por_punto)::integer;
  IF v_puntos_a_sumar <= 0 THEN
    RETURN 0;
  END IF;

  -- 4. Bloquear perfil del usuario para serializar cálculo de saldo
  SELECT saldo_puntos INTO v_saldo_actual
  FROM public.perfiles
  WHERE usuario_id = v_usuario_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_nuevo_saldo := v_saldo_actual + v_puntos_a_sumar;

  -- 5. Inserción idempotente en el libro mayor
  IF p_tipo = 'cine' THEN
    INSERT INTO public.movimientos_puntos (
      usuario_id,
      tipo_movimiento,
      puntos,
      saldo_resultante,
      compra_id,
      motivo
    )
    VALUES (
      v_usuario_id,
      v_tipo_mov,
      v_puntos_a_sumar,
      v_nuevo_saldo,
      p_compra_id,
      v_motivo
    )
    ON CONFLICT (compra_id) WHERE tipo_movimiento = 'acreditacion_compra_cine'
    DO NOTHING
    RETURNING true INTO v_insertado;

  ELSE
    INSERT INTO public.movimientos_puntos (
      usuario_id,
      tipo_movimiento,
      puntos,
      saldo_resultante,
      compra_candy_id,
      motivo
    )
    VALUES (
      v_usuario_id,
      v_tipo_mov,
      v_puntos_a_sumar,
      v_nuevo_saldo,
      p_compra_id,
      v_motivo
    )
    ON CONFLICT (compra_candy_id) WHERE tipo_movimiento = 'acreditacion_compra_candy'
    DO NOTHING
    RETURNING true INTO v_insertado;
  END IF;

  -- Si ya existía movimiento previo para esta compra, no actualizar saldo de nuevo
  IF v_insertado IS TRUE THEN
    UPDATE public.perfiles
    SET saldo_puntos = v_nuevo_saldo
    WHERE usuario_id = v_usuario_id;

    RETURN v_puntos_a_sumar;
  END IF;

  RETURN 0;
END;
$$;

-- Seguridad estricta: revocar acceso a roles externos
REVOKE ALL ON FUNCTION public.acreditar_puntos_compra(uuid, text) FROM PUBLIC, anon, authenticated;


-- 9. Triggers automáticos para vincular compras con fidelización sin alterar código previo
CREATE OR REPLACE FUNCTION public.tr_fn_compras_acreditar_puntos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Acredita solo si la compra pertenece a un usuario registrado y está en estado 'completada'.
  -- Dispara exclusivamente en el INSERT inicial si ya se crea 'completada',
  -- o en un UPDATE si transiciona desde un estado previo distinto de 'completada'.
  -- No reintenta en actualizaciones posteriores (ej: validación de acceso a sala QR).
  IF NEW.usuario_id IS NOT NULL AND NEW.estado = 'completada' THEN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM 'completada') THEN
      PERFORM public.acreditar_puntos_compra(NEW.id, 'cine');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_compras_fidelizacion ON public.compras;
CREATE TRIGGER tr_compras_fidelizacion
  AFTER INSERT OR UPDATE OF estado ON public.compras
  FOR EACH ROW
  WHEN (
    NEW.usuario_id IS NOT NULL
    AND NEW.estado = 'completada'
  )
  EXECUTE FUNCTION public.tr_fn_compras_acreditar_puntos();

CREATE OR REPLACE FUNCTION public.tr_fn_compras_candy_acreditar_puntos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Acredita solo si la compra pertenece a un usuario registrado y está en estado 'pendiente_retiro' (pagada).
  -- Dispara en el INSERT inicial de compra confirmada, o en UPDATE si transiciona desde otro estado a 'pendiente_retiro'.
  -- NO dispara cuando el pedido cambia a 'entregada' (retiro validado por empleado) ni en cancelaciones.
  IF NEW.usuario_id IS NOT NULL AND NEW.estado = 'pendiente_retiro' THEN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM 'pendiente_retiro') THEN
      PERFORM public.acreditar_puntos_compra(NEW.id, 'candy');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_compras_candy_fidelizacion ON public.compras_candy;
CREATE TRIGGER tr_compras_candy_fidelizacion
  AFTER INSERT OR UPDATE OF estado ON public.compras_candy
  FOR EACH ROW
  WHEN (
    NEW.usuario_id IS NOT NULL
    AND NEW.estado = 'pendiente_retiro'
  )
  EXECUTE FUNCTION public.tr_fn_compras_candy_acreditar_puntos();


-- 10. RPC transaccional de canje de recompensa
CREATE OR REPLACE FUNCTION public.canjear_recompensa(p_recompensa_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario_id uuid;
  v_rol text;
  v_fidelizacion_activa boolean;
  v_saldo_actual integer;
  v_nuevo_saldo integer;
  v_recompensa RECORD;
  v_codigo_cupon text;
  v_cupon_id uuid;
  v_vence_en timestamptz;
BEGIN
  v_usuario_id := auth.uid();

  -- 1. Validar autenticación
  IF v_usuario_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'codigo_error', 'no_autenticado',
      'mensaje', 'Debés iniciar sesión como cliente para canjear recompensas.'
    );
  END IF;

  -- 2. Validar rol de cliente en perfiles
  SELECT rol, saldo_puntos
  INTO v_rol, v_saldo_actual
  FROM public.perfiles
  WHERE usuario_id = v_usuario_id
  FOR UPDATE; -- Bloqueo pesimista sobre el perfil para serializar canjes

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'codigo_error', 'perfil_inexistente',
      'mensaje', 'No se encontró el perfil del usuario.'
    );
  END IF;

  IF v_rol <> 'cliente' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'codigo_error', 'rol_no_autorizado',
      'mensaje', 'Solo los clientes registrados pueden participar del programa de fidelización.'
    );
  END IF;

  -- 3. Verificar estado global del programa
  SELECT fidelizacion_activa INTO v_fidelizacion_activa
  FROM public.configuracion_cine
  WHERE id = 1;

  IF NOT COALESCE(v_fidelizacion_activa, true) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'codigo_error', 'programa_pausado',
      'mensaje', 'El programa de fidelización se encuentra momentáneamente pausado.'
    );
  END IF;

  -- 4. Buscar recompensa activa con FOR UPDATE
  SELECT *
  INTO v_recompensa
  FROM public.recompensas
  WHERE id = p_recompensa_id AND activa = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'codigo_error', 'recompensa_invalida',
      'mensaje', 'La recompensa seleccionada no existe o ya no se encuentra activa.'
    );
  END IF;

  -- 5. Validar saldo suficiente
  IF v_saldo_actual < v_recompensa.costo_puntos THEN
    RETURN jsonb_build_object(
      'ok', false,
      'codigo_error', 'saldo_insuficiente',
      'mensaje', 'No contás con suficientes puntos para canjear esta recompensa.',
      'saldo_actual', v_saldo_actual,
      'costo_puntos', v_recompensa.costo_puntos,
      'puntos_faltantes', (v_recompensa.costo_puntos - v_saldo_actual)
    );
  END IF;

  -- 6. Generar código seguro único CP-XXXX-XXXX
  v_codigo_cupon := public.generar_codigo_cupon_fidelizacion();
  v_vence_en := now() + (v_recompensa.dias_validez || ' days')::interval;

  -- 7. Insertar el cupón asignado al cliente
  INSERT INTO public.cupones_cliente (
    codigo_cupon,
    usuario_id,
    recompensa_id,
    tipo,
    valor_beneficio,
    producto_candy_id,
    descripcion,
    origen,
    estado,
    vence_en
  )
  VALUES (
    v_codigo_cupon,
    v_usuario_id,
    v_recompensa.id,
    v_recompensa.tipo,
    v_recompensa.valor_beneficio,
    v_recompensa.producto_candy_id,
    v_recompensa.nombre || ': ' || v_recompensa.descripcion,
    'canje_puntos',
    'disponible',
    v_vence_en
  )
  RETURNING id INTO v_cupon_id;

  -- 8. Actualizar saldo del perfil
  v_nuevo_saldo := v_saldo_actual - v_recompensa.costo_puntos;

  UPDATE public.perfiles
  SET saldo_puntos = v_nuevo_saldo
  WHERE usuario_id = v_usuario_id;

  -- 9. Registrar movimiento de débito en el libro mayor
  INSERT INTO public.movimientos_puntos (
    usuario_id,
    tipo_movimiento,
    puntos,
    saldo_resultante,
    cupon_id,
    motivo
  )
  VALUES (
    v_usuario_id,
    'debito_canje',
    v_recompensa.costo_puntos,
    v_nuevo_saldo,
    v_cupon_id,
    'Canje de recompensa: ' || v_recompensa.nombre
  );

  -- 10. Devolver respuesta exitosa
  RETURN jsonb_build_object(
    'ok', true,
    'mensaje', '¡Canje realizado con éxito! Tu cupón ya está listo para usar.',
    'nuevo_saldo', v_nuevo_saldo,
    'puntos_canjeados', v_recompensa.costo_puntos,
    'cupon', jsonb_build_object(
      'id', v_cupon_id,
      'codigo_cupon', v_codigo_cupon,
      'tipo', v_recompensa.tipo,
      'valor_beneficio', v_recompensa.valor_beneficio,
      'descripcion', v_recompensa.nombre || ': ' || v_recompensa.descripcion,
      'vence_en', v_vence_en,
      'estado', 'disponible'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.canjear_recompensa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.canjear_recompensa(uuid) TO authenticated;


-- 11. RPC: Obtener panel de fidelización completo del cliente
CREATE OR REPLACE FUNCTION public.obtener_mi_fidelizacion()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario_id uuid;
  v_saldo_actual integer;
  v_pesos_por_punto numeric(10,2);
  v_fidelizacion_activa boolean;
  v_recompensas_json jsonb;
  v_movimientos_json jsonb;
  v_cupones_json jsonb;
BEGIN
  v_usuario_id := auth.uid();

  IF v_usuario_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'mensaje', 'Debe iniciar sesión para ver sus puntos.'
    );
  END IF;

  -- 1. Saldo actual
  SELECT COALESCE(saldo_puntos, 0)
  INTO v_saldo_actual
  FROM public.perfiles
  WHERE usuario_id = v_usuario_id;

  -- 2. Parámetros de configuración
  SELECT pesos_por_punto, fidelizacion_activa
  INTO v_pesos_por_punto, v_fidelizacion_activa
  FROM public.configuracion_cine
  WHERE id = 1;

  -- 3. Catálogo de recompensas activas
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'nombre', r.nombre,
        'descripcion', r.descripcion,
        'costo_puntos', r.costo_puntos,
        'tipo', r.tipo,
        'valor_beneficio', r.valor_beneficio,
        'producto_candy_id', r.producto_candy_id,
        'dias_validez', r.dias_validez,
        'activa', r.activa
      )
      ORDER BY r.costo_puntos ASC
    ),
    '[]'::jsonb
  )
  INTO v_recompensas_json
  FROM public.recompensas r
  WHERE r.activa = true;

  -- 4. Historial de movimientos del usuario
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'tipo_movimiento', m.tipo_movimiento,
        'puntos', m.puntos,
        'saldo_resultante', m.saldo_resultante,
        'motivo', m.motivo,
        'creado_en', m.creado_en
      )
      ORDER BY m.creado_en DESC
    ),
    '[]'::jsonb
  )
  INTO v_movimientos_json
  FROM public.movimientos_puntos m
  WHERE m.usuario_id = v_usuario_id;

  -- 5. Cupones del usuario (marcando vencido si vence_en < now())
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'codigo_cupon', c.codigo_cupon,
        'tipo', c.tipo,
        'valor_beneficio', c.valor_beneficio,
        'descripcion', c.descripcion,
        'origen', c.origen,
        'estado', CASE
          WHEN c.estado = 'disponible' AND c.vence_en < now() THEN 'vencido'
          ELSE c.estado
        END,
        'creado_en', c.creado_en,
        'vence_en', c.vence_en,
        'utilizado_en', c.utilizado_en
      )
      ORDER BY c.creado_en DESC
    ),
    '[]'::jsonb
  )
  INTO v_cupones_json
  FROM public.cupones_cliente c
  WHERE c.usuario_id = v_usuario_id;

  RETURN jsonb_build_object(
    'ok', true,
    'saldo_puntos', COALESCE(v_saldo_actual, 0),
    'pesos_por_punto', COALESCE(v_pesos_por_punto, 1.00),
    'fidelizacion_activa', COALESCE(v_fidelizacion_activa, true),
    'recompensas', v_recompensas_json,
    'movimientos', v_movimientos_json,
    'cupones', v_cupones_json
  );
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_mi_fidelizacion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obtener_mi_fidelizacion() TO authenticated;
