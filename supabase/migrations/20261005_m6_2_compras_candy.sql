-- ============================================================================
-- MIGRACIÓN M6.2: Compras de Candy Bar y Transacción Atómica
-- ============================================================================
-- 1. Tabla public.compras_candy
--    - id UUID PK DEFAULT gen_random_uuid()
--    - usuario_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL
--    - email_contacto TEXT NOT NULL
--    - codigo_alfanumerico TEXT NOT NULL UNIQUE (formato CD-XXXX-XXXX)
--    - total NUMERIC(10,2) NOT NULL CHECK (total >= 0)
--    - estado TEXT NOT NULL DEFAULT 'pendiente_retiro' CHECK (estado IN ('pendiente_retiro', 'comprada', 'entregada', 'cancelada'))
--    - retiro_validado BOOLEAN NOT NULL DEFAULT false
--    - retiro_validado_en TIMESTAMPTZ NULL
--    - retiro_validado_por UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL
--    - creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
--
-- 2. Tabla public.lineas_compra_candy (Snapshots históricos inmutables)
--    - id UUID PK DEFAULT gen_random_uuid()
--    - compra_candy_id UUID NOT NULL REFERENCES public.compras_candy(id) ON DELETE CASCADE
--    - producto_id UUID NULL REFERENCES public.productos_candy(id) ON DELETE SET NULL
--    - nombre_producto TEXT NOT NULL
--    - categoria_producto TEXT NOT NULL
--    - cantidad INTEGER NOT NULL CHECK (cantidad > 0)
--    - precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0)
--    - subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0)
--    - creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
--
-- 3. Índices de rendimiento
--
-- 4. Políticas RLS de privilegio mínimo
--    - Clientes autenticados: solo leen sus compras y líneas
--    - Empleados y Administradores: leen todas para validación y control
--    - Inserción y actualización directa denegada (solo vía RPC)
--
-- 5. RPC transaccional: public.realizar_compra_candy(p_email_contacto text, p_lineas jsonb)
--    - search_path seguro: public, extensions, pg_temp
--    - Bloqueo FOR UPDATE ordenado por id para prevenir deadlocks
--    - Validación estricta de stock y actividad
--    - Descuento atómico de stock
--    - Generación segura de código CD-XXXX-XXXX con detección de colisiones
-- ============================================================================

-- 1. Tabla de compras de Candy
CREATE TABLE IF NOT EXISTS public.compras_candy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  email_contacto TEXT NOT NULL,
  codigo_alfanumerico TEXT NOT NULL UNIQUE,
  total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  estado TEXT NOT NULL DEFAULT 'pendiente_retiro' CHECK (estado IN ('pendiente_retiro', 'comprada', 'entregada', 'cancelada')),
  retiro_validado BOOLEAN NOT NULL DEFAULT false,
  retiro_validado_en TIMESTAMPTZ NULL,
  retiro_validado_por UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla de líneas de compra de Candy (Snapshots)
CREATE TABLE IF NOT EXISTS public.lineas_compra_candy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_candy_id UUID NOT NULL REFERENCES public.compras_candy(id) ON DELETE CASCADE,
  producto_id UUID NULL REFERENCES public.productos_candy(id) ON DELETE SET NULL,
  nombre_producto TEXT NOT NULL,
  categoria_producto TEXT NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Índices de optimización
CREATE INDEX IF NOT EXISTS idx_compras_candy_codigo
  ON public.compras_candy (codigo_alfanumerico);

CREATE INDEX IF NOT EXISTS idx_compras_candy_usuario
  ON public.compras_candy (usuario_id);

CREATE INDEX IF NOT EXISTS idx_compras_candy_estado
  ON public.compras_candy (estado);

CREATE INDEX IF NOT EXISTS idx_lineas_compra_candy_compra
  ON public.lineas_compra_candy (compra_candy_id);

CREATE INDEX IF NOT EXISTS idx_lineas_compra_candy_producto
  ON public.lineas_compra_candy (producto_id);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.compras_candy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineas_compra_candy ENABLE ROW LEVEL SECURITY;

-- 4.1 Políticas RLS en compras_candy
DROP POLICY IF EXISTS "compras_candy_select_usuario" ON public.compras_candy;
CREATE POLICY "compras_candy_select_usuario"
  ON public.compras_candy
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "compras_candy_select_empleado_admin" ON public.compras_candy;
CREATE POLICY "compras_candy_select_empleado_admin"
  ON public.compras_candy
  FOR SELECT
  TO authenticated
  USING (public.es_empleado_o_admin());

-- 4.2 Políticas RLS en lineas_compra_candy
DROP POLICY IF EXISTS "lineas_compra_candy_select_usuario" ON public.lineas_compra_candy;
CREATE POLICY "lineas_compra_candy_select_usuario"
  ON public.lineas_compra_candy
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.compras_candy c
      WHERE c.id = lineas_compra_candy.compra_candy_id
        AND c.usuario_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lineas_compra_candy_select_empleado_admin" ON public.lineas_compra_candy;
CREATE POLICY "lineas_compra_candy_select_empleado_admin"
  ON public.lineas_compra_candy
  FOR SELECT
  TO authenticated
  USING (public.es_empleado_o_admin());

-- 5. RPC transaccional: realizar_compra_candy
CREATE OR REPLACE FUNCTION public.realizar_compra_candy(
  p_email_contacto text,
  p_lineas jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_usuario_id uuid;
  v_email_limpio text;
  v_compra_id uuid;
  v_total_calculado numeric(10,2) := 0;
  v_codigo_generado text;
  v_colision boolean := true;
  v_intentos integer := 0;
  v_max_intentos integer := 10;
  v_caracteres text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Sin 0, O, 1, I para evitar ambigüedades
  v_longitud integer := length(v_caracteres);
  v_parte1 text;
  v_parte2 text;
  v_i integer;
  v_cant_items integer;
  v_prod_ids uuid[];
  v_prod_record RECORD;
  v_item jsonb;
  v_prod_id uuid;
  v_cantidad integer;
  v_subtotal numeric(10,2);
  v_lineas_insertadas jsonb := '[]'::jsonb;
BEGIN
  -- 1. Validar parámetros de entrada
  v_email_limpio := trim(p_email_contacto);
  IF v_email_limpio IS NULL OR v_email_limpio = '' OR position('@' in v_email_limpio) = 0 THEN
    RAISE EXCEPTION 'Debe proporcionar un correo electrónico de contacto válido.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_lineas IS NULL OR jsonb_typeof(p_lineas) <> 'array' THEN
    RAISE EXCEPTION 'El detalle del pedido debe ser una lista de productos válida.'
      USING ERRCODE = 'P0002';
  END IF;

  v_cant_items := jsonb_array_length(p_lineas);
  IF v_cant_items = 0 THEN
    RAISE EXCEPTION 'El carrito de Candy está vacío. Agregá al menos un producto para continuar.'
      USING ERRCODE = 'P0003';
  END IF;

  -- 2. Validar formato de cada elemento y comprobar duplicados en el array
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_lineas)
  LOOP
    IF (v_item->>'producto_id') IS NULL OR trim(v_item->>'producto_id') = '' THEN
      RAISE EXCEPTION 'Cada línea del pedido debe especificar un identificador de producto válido.'
        USING ERRCODE = 'P0002';
    END IF;
  END LOOP;

  SELECT array_agg((item->>'producto_id')::uuid)
  INTO v_prod_ids
  FROM jsonb_array_elements(p_lineas) AS item;

  IF array_length(v_prod_ids, 1) <> (
    SELECT count(DISTINCT pid) FROM unnest(v_prod_ids) AS pid
  ) THEN
    RAISE EXCEPTION 'El pedido contiene productos duplicados. Consolidá las cantidades en una sola línea.'
      USING ERRCODE = 'P0004';
  END IF;

  -- 3. Bloquear filas de productos en public.productos_candy mediante FOR UPDATE
  --    Garantiza concurrencia atómica estricta y previene deadlocks ordenando por id
  PERFORM 1
  FROM public.productos_candy
  WHERE id = ANY(v_prod_ids)
  ORDER BY id
  FOR UPDATE;

  -- Comprobar que todos los productos existan
  IF (SELECT count(*) FROM public.productos_candy WHERE id = ANY(v_prod_ids)) <> v_cant_items THEN
    RAISE EXCEPTION 'Uno o más productos seleccionados ya no se encuentran disponibles en el catálogo.'
      USING ERRCODE = 'P0005';
  END IF;

  -- 4. Validar estado y stock de cada producto, y calcular totales con precio real de la base de datos
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_lineas)
  LOOP
    v_prod_id := (v_item->>'producto_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::integer;

    IF v_cantidad IS NULL OR v_cantidad <= 0 THEN
      RAISE EXCEPTION 'La cantidad solicitada para cada producto debe ser mayor a cero.'
        USING ERRCODE = 'P0006';
    END IF;

    SELECT id, nombre, categoria, precio, stock, esta_activo, imagen_url
    INTO v_prod_record
    FROM public.productos_candy
    WHERE id = v_prod_id;

    IF NOT v_prod_record.esta_activo THEN
      RAISE EXCEPTION 'El producto "%" se encuentra temporalmente inactivo.', v_prod_record.nombre
        USING ERRCODE = 'P0007';
    END IF;

    IF v_prod_record.stock < v_cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente para el producto "%". Stock disponible: %, cantidad solicitada: %.',
        v_prod_record.nombre, v_prod_record.stock, v_cantidad
        USING ERRCODE = 'P0008';
    END IF;

    v_subtotal := round(v_prod_record.precio * v_cantidad, 2);
    v_total_calculado := v_total_calculado + v_subtotal;
  END LOOP;

  -- 5. Generar código alfanumérico seguro con formato CD-XXXX-XXXX y reintento anti-colisión
  WHILE v_colision LOOP
    v_intentos := v_intentos + 1;
    IF v_intentos > v_max_intentos THEN
      RAISE EXCEPTION 'No se pudo generar un código único para el pedido Candy tras reiterados intentos.'
        USING ERRCODE = 'P0009';
    END IF;

    -- Generar 4 caracteres para la primera parte
    v_parte1 := '';
    FOR v_i IN 1..4 LOOP
      v_parte1 := v_parte1 || substr(v_caracteres, ((get_byte(gen_random_bytes(1), 0) % v_longitud) + 1), 1);
    END LOOP;

    -- Generar 4 caracteres para la segunda parte
    v_parte2 := '';
    FOR v_i IN 1..4 LOOP
      v_parte2 := v_parte2 || substr(v_caracteres, ((get_byte(gen_random_bytes(1), 0) % v_longitud) + 1), 1);
    END LOOP;

    v_codigo_generado := 'CD-' || v_parte1 || '-' || v_parte2;

    -- Verificar unicidad
    SELECT EXISTS (
      SELECT 1 FROM public.compras_candy WHERE codigo_alfanumerico = v_codigo_generado
    ) INTO v_colision;
  END LOOP;

  -- 6. Identificar usuario autenticado opcional
  v_usuario_id := auth.uid();

  -- 7. Insertar cabecera de la compra en public.compras_candy
  INSERT INTO public.compras_candy (
    usuario_id,
    email_contacto,
    codigo_alfanumerico,
    total,
    estado,
    retiro_validado
  )
  VALUES (
    v_usuario_id,
    v_email_limpio,
    v_codigo_generado,
    v_total_calculado,
    'pendiente_retiro',
    false
  )
  RETURNING id INTO v_compra_id;

  -- 8. Insertar cada línea histórica (snapshot) y descontar stock atómicamente
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_lineas)
  LOOP
    v_prod_id := (v_item->>'producto_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::integer;

    SELECT id, nombre, categoria, precio, stock, imagen_url
    INTO v_prod_record
    FROM public.productos_candy
    WHERE id = v_prod_id;

    v_subtotal := round(v_prod_record.precio * v_cantidad, 2);

    -- Descuento atómico de stock
    UPDATE public.productos_candy
    SET stock = stock - v_cantidad,
        actualizado_en = now()
    WHERE id = v_prod_id;

    -- Inserción de la línea con snapshot inmutable
    INSERT INTO public.lineas_compra_candy (
      compra_candy_id,
      producto_id,
      nombre_producto,
      categoria_producto,
      cantidad,
      precio_unitario,
      subtotal
    )
    VALUES (
      v_compra_id,
      v_prod_id,
      v_prod_record.nombre,
      v_prod_record.categoria,
      v_cantidad,
      v_prod_record.precio,
      v_subtotal
    );

    -- Acumular en payload de retorno
    v_lineas_insertadas := v_lineas_insertadas || jsonb_build_object(
      'producto_id', v_prod_id,
      'nombre_producto', v_prod_record.nombre,
      'categoria_producto', v_prod_record.categoria,
      'cantidad', v_cantidad,
      'precio_unitario', v_prod_record.precio,
      'subtotal', v_subtotal,
      'imagen_url', v_prod_record.imagen_url
    );
  END LOOP;

  -- 9. Retornar payload estructurado para confirmación/voucher
  RETURN jsonb_build_object(
    'ok', true,
    'compra_id', v_compra_id,
    'usuario_id', v_usuario_id,
    'email_contacto', v_email_limpio,
    'codigo_alfanumerico', v_codigo_generado,
    'total', v_total_calculado,
    'estado', 'pendiente_retiro',
    'retiro_validado', false,
    'retiro_validado_en', null,
    'creado_en', now(),
    'lineas', v_lineas_insertadas
  );
END;
$$;

-- 6. Concesión de permisos para la función RPC
REVOKE ALL ON FUNCTION public.realizar_compra_candy(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.realizar_compra_candy(text, jsonb) TO anon, authenticated;
