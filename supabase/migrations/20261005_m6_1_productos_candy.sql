-- ============================================================================
-- MIGRACIÓN M6.1: Catálogo y Gestión de Productos Candy
-- ============================================================================
-- 1. Tabla public.productos_candy
--    - id UUID PK DEFAULT gen_random_uuid()
--    - nombre TEXT NOT NULL
--    - descripcion TEXT NULL
--    - categoria TEXT NOT NULL CHECK ('combos', 'pochoclos', 'bebidas', 'snacks')
--    - precio NUMERIC(10,2) NOT NULL CHECK (precio >= 0)
--    - stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)
--    - imagen_url TEXT NULL
--    - es_destacado BOOLEAN NOT NULL DEFAULT false
--    - esta_activo BOOLEAN NOT NULL DEFAULT true
--    - creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
--    - actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
--
-- 2. Índices de optimización
--    - idx_productos_candy_activo_categoria: para consultas públicas por categoría
--    - idx_productos_candy_destacados: para destacar combos en portada / catálogo
--
-- 3. Row Level Security (RLS) en public.productos_candy
--    - SELECT público/autenticado: solo productos activos (esta_activo = true)
--    - SELECT admin: todos los productos (activos e inactivos)
--    - INSERT, UPDATE, DELETE admin: solo administradores (public.es_administrador())
--    - Clientes sin permisos de escritura ni modificación de stock/precios
--
-- 4. Bucket de Supabase Storage: candy-productos
--    - Bucket público para lectura de imágenes
--    - Políticas en storage.objects: lectura pública, escritura/eliminación solo admin
-- ============================================================================

-- 1. Creación de la tabla de productos de Candy
CREATE TABLE IF NOT EXISTS public.productos_candy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT NOT NULL CHECK (categoria IN ('combos', 'pochoclos', 'bebidas', 'snacks')),
  precio NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  imagen_url TEXT,
  es_destacado BOOLEAN NOT NULL DEFAULT false,
  esta_activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Índices de optimización
CREATE INDEX IF NOT EXISTS idx_productos_candy_activo_categoria
  ON public.productos_candy (esta_activo, categoria);

CREATE INDEX IF NOT EXISTS idx_productos_candy_destacado
  ON public.productos_candy (es_destacado)
  WHERE (esta_activo = true);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.productos_candy ENABLE ROW LEVEL SECURITY;

-- 3.1 Política SELECT para público y clientes: solo productos activos
DROP POLICY IF EXISTS "productos_candy_select_public" ON public.productos_candy;
CREATE POLICY "productos_candy_select_public"
  ON public.productos_candy
  FOR SELECT
  TO public
  USING (esta_activo = true);

-- 3.2 Política SELECT para administradores: ver todos los productos (activos e inactivos)
DROP POLICY IF EXISTS "productos_candy_admin_select" ON public.productos_candy;
CREATE POLICY "productos_candy_admin_select"
  ON public.productos_candy
  FOR SELECT
  TO authenticated
  USING (public.es_administrador());

-- 3.3 Política INSERT para administradores
DROP POLICY IF EXISTS "productos_candy_admin_insert" ON public.productos_candy;
CREATE POLICY "productos_candy_admin_insert"
  ON public.productos_candy
  FOR INSERT
  TO authenticated
  WITH CHECK (public.es_administrador());

-- 3.4 Política UPDATE para administradores
DROP POLICY IF EXISTS "productos_candy_admin_update" ON public.productos_candy;
CREATE POLICY "productos_candy_admin_update"
  ON public.productos_candy
  FOR UPDATE
  TO authenticated
  USING (public.es_administrador())
  WITH CHECK (public.es_administrador());

-- 3.5 Política DELETE para administradores
DROP POLICY IF EXISTS "productos_candy_admin_delete" ON public.productos_candy;
CREATE POLICY "productos_candy_admin_delete"
  ON public.productos_candy
  FOR DELETE
  TO authenticated
  USING (public.es_administrador());

-- 4. Bucket de Supabase Storage para imágenes de productos de Candy
INSERT INTO storage.buckets (id, name, public)
VALUES ('candy-productos', 'candy-productos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4.1 Políticas de almacenamiento en storage.objects
-- Lectura pública de imágenes del bucket candy-productos
DROP POLICY IF EXISTS "candy_productos_storage_public_select" ON storage.objects;
CREATE POLICY "candy_productos_storage_public_select"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'candy-productos');

-- Subida de imágenes: solo administrador
DROP POLICY IF EXISTS "candy_productos_storage_admin_insert" ON storage.objects;
CREATE POLICY "candy_productos_storage_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'candy-productos'
    AND public.es_administrador()
  );

-- Actualización de imágenes: solo administrador
DROP POLICY IF EXISTS "candy_productos_storage_admin_update" ON storage.objects;
CREATE POLICY "candy_productos_storage_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'candy-productos'
    AND public.es_administrador()
  )
  WITH CHECK (
    bucket_id = 'candy-productos'
    AND public.es_administrador()
  );

-- Eliminación de imágenes: solo administrador
DROP POLICY IF EXISTS "candy_productos_storage_admin_delete" ON storage.objects;
CREATE POLICY "candy_productos_storage_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'candy-productos'
    AND public.es_administrador()
  );
