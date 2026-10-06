import { inject, Injectable } from '@angular/core';
import { CategoriaCandy, ProductoCandy, ProductoCandyFormDTO } from '../modelos/producto-candy';
import { ServicioSupabase } from './servicio-supabase';

@Injectable({
  providedIn: 'root'
})
export class ServicioCandy {
  private readonly servicioSupabase = inject(ServicioSupabase);

  /**
   * Obtiene los productos activos para el catálogo público.
   * Ordena primero los destacados y luego por nombre.
   */
  async obtenerProductosActivos(categoria?: CategoriaCandy): Promise<ProductoCandy[]> {
    const cliente = this.servicioSupabase.cliente;

    let consulta = cliente
      .from('productos_candy')
      .select('*')
      .eq('esta_activo', true)
      .order('es_destacado', { ascending: false })
      .order('nombre', { ascending: true });

    if (categoria) {
      consulta = consulta.eq('categoria', categoria);
    }

    const { data, error } = await consulta;

    if (error) {
      console.error('Error al obtener productos de Candy:', error);
      throw new Error('No se pudieron cargar los productos del Candy Bar.');
    }

    return (data || []).map(fila => this.mapearProducto(fila));
  }

  /**
   * Obtiene todos los productos (activos e inactivos) para el panel de administración.
   * Requiere rol administrador por RLS.
   */
  async obtenerTodosLosProductos(): Promise<ProductoCandy[]> {
    const cliente = this.servicioSupabase.cliente;

    const { data, error } = await cliente
      .from('productos_candy')
      .select('*')
      .order('categoria', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error al obtener listado administrativo de Candy:', error);
      throw new Error('No se pudo cargar el listado de productos de Candy.');
    }

    return (data || []).map(fila => this.mapearProducto(fila));
  }

  /**
   * Obtiene un producto individual por su ID.
   */
  async obtenerProductoPorId(id: string): Promise<ProductoCandy | null> {
    const cliente = this.servicioSupabase.cliente;

    const { data, error } = await cliente
      .from('productos_candy')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener el producto:', error);
      throw new Error('Error al consultar el producto.');
    }

    return data ? this.mapearProducto(data) : null;
  }

  /**
   * Da de alta un nuevo producto con soporte para subida de imagen a Supabase Storage.
   */
  async crearProducto(
    datos: ProductoCandyFormDTO,
    imagen?: File | null
  ): Promise<ProductoCandy> {
    const cliente = this.servicioSupabase.cliente;

    let urlImagenPublica: string | null = null;
    let rutaArchivoStorage: string | null = null;

    if (imagen) {
      const { data: usuario, error: errorUsuario } = await cliente.auth.getUser();
      if (errorUsuario || !usuario.user) {
        throw new Error('No existe una sesión de administrador activa.');
      }

      const extension = this.obtenerExtension(imagen);
      const nombreArchivo = `${crypto.randomUUID()}.${extension}`;
      rutaArchivoStorage = `${usuario.user.id}/${nombreArchivo}`;

      const { error: errorSubida } = await cliente.storage
        .from('candy-productos')
        .upload(rutaArchivoStorage, imagen, {
          contentType: imagen.type,
          upsert: false
        });

      if (errorSubida) {
        console.error('Error al subir imagen de Candy:', errorSubida);
        throw new Error('No se pudo subir la imagen del producto.');
      }

      const { data: datosUrl } = cliente.storage
        .from('candy-productos')
        .getPublicUrl(rutaArchivoStorage);

      urlImagenPublica = datosUrl.publicUrl;
    }

    const { data: productoCreado, error: errorInsert } = await cliente
      .from('productos_candy')
      .insert({
        nombre: datos.nombre.trim(),
        descripcion: datos.descripcion?.trim() || null,
        categoria: datos.categoria,
        precio: datos.precio,
        stock: datos.stock,
        imagen_url: urlImagenPublica,
        es_destacado: datos.esDestacado,
        esta_activo: datos.estaActivo
      })
      .select('*')
      .single();

    if (errorInsert) {
      console.error('Error al insertar producto de Candy:', errorInsert);
      // Limpieza de imagen huérfana en caso de fallo
      if (rutaArchivoStorage) {
        await cliente.storage.from('candy-productos').remove([rutaArchivoStorage]);
      }
      throw new Error(errorInsert.message || 'No se pudo guardar el producto.');
    }

    return this.mapearProducto(productoCreado);
  }

  /**
   * Actualiza los datos de un producto existente con reemplazo opcional de imagen.
   */
  async actualizarProducto(
    id: string,
    datos: Partial<ProductoCandyFormDTO>,
    imagenNueva?: File | null
  ): Promise<ProductoCandy> {
    const cliente = this.servicioSupabase.cliente;

    const cargaActualizacion: Record<string, any> = {
      actualizado_en: new Date().toISOString()
    };

    if (datos.nombre !== undefined) cargaActualizacion['nombre'] = datos.nombre.trim();
    if (datos.descripcion !== undefined) {
      cargaActualizacion['descripcion'] = datos.descripcion?.trim() || null;
    }
    if (datos.categoria !== undefined) cargaActualizacion['categoria'] = datos.categoria;
    if (datos.precio !== undefined) cargaActualizacion['precio'] = datos.precio;
    if (datos.stock !== undefined) cargaActualizacion['stock'] = datos.stock;
    if (datos.esDestacado !== undefined) cargaActualizacion['es_destacado'] = datos.esDestacado;
    if (datos.estaActivo !== undefined) cargaActualizacion['esta_activo'] = datos.estaActivo;

    let rutaArchivoNueva: string | null = null;

    if (imagenNueva) {
      const { data: usuario, error: errorUsuario } = await cliente.auth.getUser();
      if (errorUsuario || !usuario.user) {
        throw new Error('No existe una sesión de administrador activa.');
      }

      const extension = this.obtenerExtension(imagenNueva);
      const nombreArchivo = `${crypto.randomUUID()}.${extension}`;
      rutaArchivoNueva = `${usuario.user.id}/${nombreArchivo}`;

      const { error: errorSubida } = await cliente.storage
        .from('candy-productos')
        .upload(rutaArchivoNueva, imagenNueva, {
          contentType: imagenNueva.type,
          upsert: false
        });

      if (errorSubida) {
        console.error('Error al subir imagen nueva de Candy:', errorSubida);
        throw new Error('No se pudo subir la nueva imagen del producto.');
      }

      const { data: datosUrl } = cliente.storage
        .from('candy-productos')
        .getPublicUrl(rutaArchivoNueva);

      cargaActualizacion['imagen_url'] = datosUrl.publicUrl;
    }

    const { data: productoActualizado, error: errorUpdate } = await cliente
      .from('productos_candy')
      .update(cargaActualizacion)
      .eq('id', id)
      .select('*')
      .single();

    if (errorUpdate) {
      console.error('Error al actualizar producto de Candy:', errorUpdate);
      if (rutaArchivoNueva) {
        await cliente.storage.from('candy-productos').remove([rutaArchivoNueva]);
      }
      throw new Error(errorUpdate.message || 'No se pudo actualizar el producto.');
    }

    return this.mapearProducto(productoActualizado);
  }

  /**
   * Cambia el estado activo/inactivo de un producto de forma ágil.
   */
  async cambiarEstadoActivo(id: string, estaActivo: boolean): Promise<void> {
    const cliente = this.servicioSupabase.cliente;

    const { error } = await cliente
      .from('productos_candy')
      .update({
        esta_activo: estaActivo,
        actualizado_en: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error al cambiar estado activo del producto:', error);
      throw new Error('No se pudo cambiar el estado del producto.');
    }
  }

  /**
   * Elimina un producto del catálogo (o lanza error si tiene restricciones).
   */
  async eliminarProducto(id: string): Promise<void> {
    const cliente = this.servicioSupabase.cliente;

    const { error } = await cliente
      .from('productos_candy')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar producto de Candy:', error);
      throw new Error('No se pudo eliminar el producto.');
    }
  }

  private mapearProducto(fila: any): ProductoCandy {
    return {
      id: fila.id,
      nombre: fila.nombre,
      descripcion: fila.descripcion ?? null,
      categoria: fila.categoria as CategoriaCandy,
      precio: Number(fila.precio),
      stock: Number(fila.stock),
      imagenUrl: fila.imagen_url ?? null,
      esDestacado: Boolean(fila.es_destacado),
      estaActivo: Boolean(fila.esta_activo),
      creadoEn: fila.creado_en,
      actualizadoEn: fila.actualizado_en ?? undefined
    };
  }

  private obtenerExtension(imagen: File): string {
    const extensiones: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };
    return extensiones[imagen.type] ?? 'jpg';
  }
}
