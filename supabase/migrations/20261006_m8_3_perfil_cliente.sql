-- ==============================================================================
-- Migración M8.3: Seguridad y Edición Segura del Perfil de Cliente
-- Archivo local únicamente. NO ejecutar en Supabase a menos que sea requerido.
-- ==============================================================================

-- 1. Deshabilitar y revocar cualquier vía de UPDATE directo en public.perfiles
--    para usuarios anónimos o autenticados.
--    La edición de perfiles se realiza EXCLUSIVAMENTE mediante la RPC controlada
--    para evitar cualquier alteración no autorizada de rol, crédito, saldo de puntos, etc.
DO $$
BEGIN
  -- Eliminar posibles políticas de actualización directa permisivas
  DROP POLICY IF EXISTS perfiles_update_propio ON public.perfiles;
  DROP POLICY IF EXISTS perfiles_update ON public.perfiles;
  DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.perfiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.perfiles;
END $$;

REVOKE UPDATE ON TABLE public.perfiles FROM authenticated;
REVOKE UPDATE ON TABLE public.perfiles FROM anon;

-- 2. Función RPC atómica y segura para actualizar únicamente datos personales editables.
--    Campos inmutables y protegidos (usuario_id, rol, saldo_puntos, credito, creado_en)
--    están completamente excluidos de la sentencia UPDATE.
CREATE OR REPLACE FUNCTION public.actualizar_mi_perfil(
  p_nombre text,
  p_apellido text,
  p_fecha_nacimiento date,
  p_tipo_sangre text,
  p_color_ojos text,
  p_dias_vacaciones integer
)
RETURNS public.perfiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario_id uuid;
  v_perfil public.perfiles;
BEGIN
  -- 1. Validar sesión activa del usuario
  v_usuario_id := auth.uid();
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado. Se requiere sesión activa.';
  END IF;

  -- 2. Validar nombre y apellido obligatorios
  IF p_nombre IS NULL OR trim(p_nombre) = '' OR p_apellido IS NULL OR trim(p_apellido) = '' THEN
    RAISE EXCEPTION 'El nombre y el apellido son obligatorios.';
  END IF;

  -- 3. Validar fecha de nacimiento obligatoria y no futura
  IF p_fecha_nacimiento IS NULL THEN
    RAISE EXCEPTION 'La fecha de nacimiento es obligatoria.';
  END IF;

  IF p_fecha_nacimiento > CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha de nacimiento no puede ser futura.';
  END IF;

  -- 4. Validar grupo sanguíneo dentro del catálogo permitido
  IF p_tipo_sangre IS NULL OR p_tipo_sangre NOT IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') THEN
    RAISE EXCEPTION 'Grupo sanguíneo inválido: %', p_tipo_sangre;
  END IF;

  -- 5. Validar color de ojos obligatorio
  IF p_color_ojos IS NULL OR trim(p_color_ojos) = '' THEN
    RAISE EXCEPTION 'El color de ojos es obligatorio.';
  END IF;

  -- 6. Validar días de vacaciones en rango coherente
  IF p_dias_vacaciones IS NULL OR p_dias_vacaciones < 0 OR p_dias_vacaciones > 365 THEN
    RAISE EXCEPTION 'Los días de vacaciones deben estar comprendidos entre 0 y 365.';
  END IF;

  -- 7. Actualización estricta por usuario_id = auth.uid()
  --    Solo se modifican las 6 columnas personales permitidas.
  UPDATE public.perfiles
  SET
    nombre = trim(p_nombre),
    apellido = trim(p_apellido),
    fecha_nacimiento = p_fecha_nacimiento,
    tipo_sangre = p_tipo_sangre,
    color_ojos = trim(p_color_ojos),
    dias_vacaciones = p_dias_vacaciones
  WHERE usuario_id = v_usuario_id
  RETURNING * INTO v_perfil;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el perfil correspondiente al usuario autenticado.';
  END IF;

  RETURN v_perfil;
END;
$$;

COMMENT ON FUNCTION public.actualizar_mi_perfil(text, text, date, text, text, integer) IS 
'Actualiza datos personales del titular autenticado (auth.uid) blindando rol, credito y saldo_puntos.';

-- 3. Permisos de ejecución mínimos necesarios
REVOKE ALL ON FUNCTION public.actualizar_mi_perfil(text, text, date, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.actualizar_mi_perfil(text, text, date, text, text, integer) TO authenticated;
