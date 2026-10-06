-- ============================================================================
-- MIGRACIÓN M7: Reseñas, Calificaciones y Ranking Top 3 de Películas
-- ============================================================================
-- 1. Tabla public.resenas:
--    - FK a auth.users(id) con ON DELETE CASCADE
--    - FK a public.peliculas(id) con ON DELETE RESTRICT (integridad histórica)
--    - Puntuación 1 a 5 estrellas
--    - Comentario con longitud válida (10 a 1000 caracteres recortados)
--    - Restricción UNIQUE (usuario_id, pelicula_id) -> una reseña por película
--    - RLS activado con SELECT público
--    - Mutaciones directas bloqueadas: control absoluto vía RPC SECURITY DEFINER
--
-- 2. Funciones RPC transaccionales y seguras:
--    - public.verificar_elegibilidad_resena(p_pelicula_id uuid)
--    - public.guardar_resena_pelicula(p_pelicula_id uuid, p_puntuacion integer, p_comentario text)
--    - public.obtener_resenas_pelicula(p_pelicula_id uuid)
--    - public.obtener_top_3_peliculas()
--
-- 3. Criterio de desempate en Top 3:
--    - promedio DESC, cantidad_resenas DESC, fecha_estreno DESC, nombre ASC LIMIT 3
-- ============================================================================

-- 1. Crear tabla de reseñas
CREATE TABLE IF NOT EXISTS public.resenas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pelicula_id uuid NOT NULL REFERENCES public.peliculas(id) ON DELETE RESTRICT,
  puntuacion integer NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
  comentario text NOT NULL CHECK (char_length(trim(comentario)) >= 10 AND char_length(comentario) <= 1000),
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_resenas_usuario_pelicula UNIQUE (usuario_id, pelicula_id)
);

-- Comentarios explicativos de tabla y columnas
COMMENT ON TABLE public.resenas IS 'Reseñas y calificaciones de películas dejadas por clientes con asistencia validada.';
COMMENT ON COLUMN public.resenas.puntuacion IS 'Calificación de 1 a 5 estrellas otorgada por el espectador.';
COMMENT ON COLUMN public.resenas.comentario IS 'Opinión textual del espectador (entre 10 y 1000 caracteres recortados).';

-- Índices de consulta y rendimiento
CREATE INDEX IF NOT EXISTS idx_resenas_pelicula_id ON public.resenas (pelicula_id);
CREATE INDEX IF NOT EXISTS idx_resenas_usuario_id ON public.resenas (usuario_id);
CREATE INDEX IF NOT EXISTS idx_resenas_pelicula_puntuacion ON public.resenas (pelicula_id, puntuacion);

-- 2. Configurar RLS (Row Level Security)
ALTER TABLE public.resenas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resenas_lectura_publica" ON public.resenas;
CREATE POLICY "resenas_lectura_publica"
  ON public.resenas
  FOR SELECT
  USING (true);

-- Al no crear políticas de INSERT / UPDATE / DELETE para los roles cliente/anon,
-- cualquier intento directo desde la API de Supabase será denegado por defecto.
-- La inserción y actualización se realizan exclusivamente a través de la función
-- SECURITY DEFINER public.guardar_resena_pelicula().


-- 3. RPC: Verificar elegibilidad para reseñar
CREATE OR REPLACE FUNCTION public.verificar_elegibilidad_resena(p_pelicula_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario_id uuid;
  v_rol text;
  v_pelicula_existe boolean;
  v_asistio boolean;
  v_resena RECORD;
BEGIN
  v_usuario_id := auth.uid();

  -- 1. Verificar si el usuario está autenticado
  IF v_usuario_id IS NULL THEN
    RETURN jsonb_build_object(
      'puede_resenar', false,
      'motivo', 'no_autenticado',
      'mensaje', 'Iniciá sesión como cliente para calificar y dejar tu opinión sobre esta película.',
      'ya_reseno', false,
      'resena_existente', null
    );
  END IF;

  -- 2. Verificar existencia de la película activa
  SELECT EXISTS (
    SELECT 1 FROM public.peliculas
    WHERE id = p_pelicula_id AND esta_activa = true AND eliminada_en IS NULL
  ) INTO v_pelicula_existe;

  IF NOT v_pelicula_existe THEN
    RETURN jsonb_build_object(
      'puede_resenar', false,
      'motivo', 'pelicula_invalida',
      'mensaje', 'La película seleccionada no se encuentra disponible o no existe.',
      'ya_reseno', false,
      'resena_existente', null
    );
  END IF;

  -- 3. Verificar que el rol sea estrictamente 'cliente'
  SELECT rol INTO v_rol
  FROM public.perfiles
  WHERE usuario_id = v_usuario_id;

  IF v_rol IS NULL OR v_rol <> 'cliente' THEN
    RETURN jsonb_build_object(
      'puede_resenar', false,
      'motivo', 'rol_no_autorizado',
      'mensaje', 'Solo las cuentas con perfil de cliente pueden calificar y opinar sobre las películas.',
      'ya_reseno', false,
      'resena_existente', null
    );
  END IF;

  -- 4. Verificar asistencia validada a la sala (compra completada, acceso validado, entrada comprada para esta película)
  SELECT EXISTS (
    SELECT 1
    FROM public.compras c
    JOIN public.entradas e ON e.compra_id = c.id
    JOIN public.funciones f ON f.id = e.funcion_id
    WHERE c.usuario_id = v_usuario_id
      AND c.estado = 'completada'
      AND c.acceso_sala_validado = true
      AND e.estado = 'comprada'
      AND f.pelicula_id = p_pelicula_id
  ) INTO v_asistio;

  IF NOT v_asistio THEN
    RETURN jsonb_build_object(
      'puede_resenar', false,
      'motivo', 'sin_asistencia_validada',
      'mensaje', 'Para calificar esta película necesitás haber comprado una entrada y que tu acceso a la sala haya sido validado por el personal del cine.',
      'ya_reseno', false,
      'resena_existente', null
    );
  END IF;

  -- 5. Verificar si el usuario ya cuenta con una reseña previa
  SELECT id, puntuacion, comentario, creado_en, actualizado_en
  INTO v_resena
  FROM public.resenas
  WHERE usuario_id = v_usuario_id AND pelicula_id = p_pelicula_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'puede_resenar', true,
      'motivo', 'elegible_con_resena_previa',
      'mensaje', 'Ya calificaste esta película. Podés actualizar tu reseña y puntuación cuando lo desees.',
      'ya_reseno', true,
      'resena_existente', jsonb_build_object(
        'id', v_resena.id,
        'puntuacion', v_resena.puntuacion,
        'comentario', v_resena.comentario,
        'creado_en', v_resena.creado_en,
        'actualizado_en', v_resena.actualizado_en
      )
    );
  END IF;

  -- 6. Elegible sin reseña previa
  RETURN jsonb_build_object(
    'puede_resenar', true,
    'motivo', 'elegible',
    'mensaje', '¡Cumplís con los requisitos para calificar y dejar tu opinión sobre esta película!',
    'ya_reseno', false,
    'resena_existente', null
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verificar_elegibilidad_resena(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verificar_elegibilidad_resena(uuid) TO anon, authenticated;


-- 4. RPC: Guardar o actualizar reseña de forma atómica y protegida
CREATE OR REPLACE FUNCTION public.guardar_resena_pelicula(
  p_pelicula_id uuid,
  p_puntuacion integer,
  p_comentario text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario_id uuid;
  v_rol text;
  v_pelicula_existe boolean;
  v_asistio boolean;
  v_comentario_limpio text;
  v_resena_id uuid;
  v_creado_en timestamptz;
  v_actualizado_en timestamptz;
  v_es_nueva boolean;
  v_ahora timestamptz;
BEGIN
  v_usuario_id := auth.uid();

  -- 1. Validar autenticación
  IF v_usuario_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'codigo_error', 'no_autenticado',
      'mensaje', 'Debés iniciar sesión como cliente para calificar una película.'
    );
  END IF;

  -- 2. Validar rango de puntuación (1 a 5)
  IF p_puntuacion IS NULL OR p_puntuacion < 1 OR p_puntuacion > 5 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'codigo_error', 'puntuacion_invalida',
      'mensaje', 'La puntuación debe ser un número entero entre 1 y 5 estrellas.'
    );
  END IF;

  -- 3. Validar comentario (10 a 1000 caracteres recortados)
  v_comentario_limpio := trim(COALESCE(p_comentario, ''));
  IF length(v_comentario_limpio) < 10 OR length(v_comentario_limpio) > 1000 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'codigo_error', 'comentario_invalido',
      'mensaje', 'El comentario debe contener entre 10 y 1000 caracteres.'
    );
  END IF;

  -- 4. Validar existencia de la película
  SELECT EXISTS (
    SELECT 1 FROM public.peliculas
    WHERE id = p_pelicula_id AND esta_activa = true AND eliminada_en IS NULL
  ) INTO v_pelicula_existe;

  IF NOT v_pelicula_existe THEN
    RETURN jsonb_build_object(
      'ok', false,
      'codigo_error', 'pelicula_invalida',
      'mensaje', 'La película seleccionada no se encuentra activa o no existe.'
    );
  END IF;

  -- 5. Validar rol de cliente en perfiles
  SELECT rol INTO v_rol
  FROM public.perfiles
  WHERE usuario_id = v_usuario_id;

  IF v_rol IS NULL OR v_rol <> 'cliente' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'codigo_error', 'rol_no_autorizado',
      'mensaje', 'Solo las cuentas con perfil de cliente pueden calificar y opinar.'
    );
  END IF;

  -- 6. Validar asistencia obligatoria a la función
  SELECT EXISTS (
    SELECT 1
    FROM public.compras c
    JOIN public.entradas e ON e.compra_id = c.id
    JOIN public.funciones f ON f.id = e.funcion_id
    WHERE c.usuario_id = v_usuario_id
      AND c.estado = 'completada'
      AND c.acceso_sala_validado = true
      AND e.estado = 'comprada'
      AND f.pelicula_id = p_pelicula_id
  ) INTO v_asistio;

  IF NOT v_asistio THEN
    RETURN jsonb_build_object(
      'ok', false,
      'codigo_error', 'sin_asistencia_validada',
      'mensaje', 'No tenés una entrada con acceso a sala validado para esta película.'
    );
  END IF;

  -- 7. Upsert atómico en public.resenas
  v_ahora := clock_timestamp();

  -- Detectar previamente si ya existe para registrar la acción adecuada
  SELECT EXISTS (
    SELECT 1 FROM public.resenas
    WHERE usuario_id = v_usuario_id AND pelicula_id = p_pelicula_id
  ) INTO v_es_nueva;
  v_es_nueva := NOT v_es_nueva;

  INSERT INTO public.resenas (
    usuario_id,
    pelicula_id,
    puntuacion,
    comentario,
    creado_en,
    actualizado_en
  )
  VALUES (
    v_usuario_id,
    p_pelicula_id,
    p_puntuacion,
    v_comentario_limpio,
    v_ahora,
    v_ahora
  )
  ON CONFLICT (usuario_id, pelicula_id) DO UPDATE
  SET
    puntuacion = excluded.puntuacion,
    comentario = excluded.comentario,
    actualizado_en = v_ahora
  RETURNING id, creado_en, actualizado_en
  INTO v_resena_id, v_creado_en, v_actualizado_en;

  RETURN jsonb_build_object(
    'ok', true,
    'accion', CASE WHEN v_es_nueva THEN 'creada' ELSE 'actualizada' END,
    'mensaje', CASE
      WHEN v_es_nueva THEN '¡Tu reseña fue publicada con éxito!'
      ELSE '¡Tu reseña fue actualizada con éxito!'
    END,
    'resena', jsonb_build_object(
      'id', v_resena_id,
      'pelicula_id', p_pelicula_id,
      'puntuacion', p_puntuacion,
      'comentario', v_comentario_limpio,
      'creado_en', v_creado_en,
      'actualizado_en', v_actualizado_en
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.guardar_resena_pelicula(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_resena_pelicula(uuid, integer, text) TO authenticated;


-- 5. RPC: Obtener listado de reseñas de una película y su promedio general
-- Protege la privacidad de los usuarios devolviendo únicamente 'Nombre I.'
CREATE OR REPLACE FUNCTION public.obtener_resenas_pelicula(p_pelicula_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_promedio numeric;
  v_cantidad integer;
  v_resenas_json jsonb;
BEGIN
  -- Calcular promedio redondeado a 1 decimal y cantidad total de reseñas
  SELECT
    COALESCE(round(avg(r.puntuacion)::numeric, 1), 0),
    count(r.id)::integer
  INTO
    v_promedio,
    v_cantidad
  FROM public.resenas r
  WHERE r.pelicula_id = p_pelicula_id;

  -- Obtener array de reseñas con formato higiénico de autor (Nombre + Inicial Apellido)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'usuario_id', r.usuario_id,
        'puntuacion', r.puntuacion,
        'comentario', r.comentario,
        'creado_en', r.creado_en,
        'actualizado_en', r.actualizado_en,
        'nombre_autor', COALESCE(
          NULLIF(trim(p.nombre), ''),
          'Espectador'
        ) || CASE
          WHEN p.apellido IS NOT NULL AND length(trim(p.apellido)) > 0
          THEN ' ' || upper(substr(trim(p.apellido), 1, 1)) || '.'
          ELSE ''
        END
      )
      ORDER BY r.creado_en DESC
    ),
    '[]'::jsonb
  )
  INTO v_resenas_json
  FROM public.resenas r
  LEFT JOIN public.perfiles p ON p.usuario_id = r.usuario_id
  WHERE r.pelicula_id = p_pelicula_id;

  RETURN jsonb_build_object(
    'pelicula_id', p_pelicula_id,
    'promedio', v_promedio,
    'cantidad_resenas', v_cantidad,
    'resenas', v_resenas_json
  );
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_resenas_pelicula(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_resenas_pelicula(uuid) TO anon, authenticated;


-- 6. RPC: Obtener Ranking Top 3 de películas mejor calificadas
-- Orden estricto según especificación:
-- 1. promedio DESC
-- 2. cantidad_resenas DESC
-- 3. fecha_estreno DESC
-- 4. nombre ASC
-- LIMIT 3
CREATE OR REPLACE FUNCTION public.obtener_top_3_peliculas()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_resultado jsonb;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', sub.id,
        'nombre', sub.nombre,
        'imagen_url', sub.imagen_url,
        'fecha_estreno', sub.fecha_estreno,
        'duracion_minutos', sub.duracion_minutos,
        'clasificacion_edad', sub.clasificacion_edad,
        'promedio', sub.promedio,
        'cantidad_resenas', sub.cantidad_resenas
      )
    ),
    '[]'::jsonb
  )
  INTO v_resultado
  FROM (
    SELECT
      p.id,
      p.nombre,
      p.imagen_url,
      p.fecha_estreno,
      p.duracion_minutos,
      p.clasificacion_edad,
      round(avg(r.puntuacion)::numeric, 1) AS promedio,
      count(r.id)::integer AS cantidad_resenas
    FROM public.peliculas p
    JOIN public.resenas r ON r.pelicula_id = p.id
    WHERE p.esta_activa = true AND p.eliminada_en IS NULL
    GROUP BY p.id, p.nombre, p.imagen_url, p.fecha_estreno, p.duracion_minutos, p.clasificacion_edad
    HAVING count(r.id) >= 1
    ORDER BY
      promedio DESC,
      cantidad_resenas DESC,
      p.fecha_estreno DESC,
      p.nombre ASC
    LIMIT 3
  ) sub;

  RETURN v_resultado;
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_top_3_peliculas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_top_3_peliculas() TO anon, authenticated;
