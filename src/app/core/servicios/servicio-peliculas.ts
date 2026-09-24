import { inject, Injectable } from '@angular/core';
import { Pelicula } from '../modelos/pelicula';

import {
  ServicioSupabase
} from './servicio-supabase';

export interface DatosNuevaPelicula {
  nombre: string;
  sinopsis: string;
  duracionMinutos: number;
  fechaEstreno: string;
  clasificacionEdad: 'ATP' | '+13' | '+18';
  estaActiva: boolean;
  generos: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ServicioPeliculas {
  private readonly servicioSupabase =
    inject(ServicioSupabase);

  async guardarPelicula(
    pelicula: DatosNuevaPelicula,
    imagen: File
  ): Promise<void> {
    const cliente = this.servicioSupabase.cliente;

    // Obtener el administrador actualmente autenticado.
    const {
      data: datosUsuario,
      error: errorUsuario
    } = await cliente.auth.getUser();

    if (errorUsuario || !datosUsuario.user) {
      throw new Error(
        'No existe una sesión de administrador activa.'
      );
    }

    // Crear una ruta única para evitar nombres repetidos.
    const extension = this.obtenerExtension(imagen);
    /* crypto API: UUID generado + punto + extensión */
    const nombreArchivo =
      `${crypto.randomUUID()}.${extension}`;

    const rutaImagen =
      `${datosUsuario.user.id}/${nombreArchivo}`;

    // Subir el póster al bucket.
    const {
      error: errorSubida
    } = await cliente.storage
      .from('posters')
      .upload(rutaImagen, imagen, {
        contentType: imagen.type,
        upsert: false
      });

    if (errorSubida) {
      throw errorSubida;
    }

    // Obtener la dirección pública del póster.
    const {
      data: datosUrl
    } = cliente.storage
      .from('posters')
      .getPublicUrl(rutaImagen);

    // Insertar los datos en la tabla.
    const {
      error: errorInsercion
    } = await cliente
      .from('peliculas')
      .insert({
        nombre: pelicula.nombre,
        sinopsis: pelicula.sinopsis,
        duracion_minutos: pelicula.duracionMinutos,
        fecha_estreno: pelicula.fechaEstreno,
        clasificacion_edad: pelicula.clasificacionEdad,
        esta_activa: pelicula.estaActiva,
        generos: pelicula.generos,
        imagen_url: datosUrl.publicUrl
      });

    if (errorInsercion) {
      // Si falla la tabla, eliminar el archivo que acabamos de subir.
      await cliente.storage
        .from('posters')
        .remove([rutaImagen]);

      throw errorInsercion;
    }
  }

  /* obtiene peliculas que no fueron eliminadas logicamente */
  async obtenerPeliculas(): Promise<Pelicula[]> {
    const cliente = this.servicioSupabase.cliente;

    const {
      data,
      error
    } = await cliente
      .from('peliculas')
      .select(`
        id,
        nombre,
        sinopsis,
        duracion_minutos,
        imagen_url,
        fecha_estreno,
        clasificacion_edad,
        generos,
        esta_activa
      `)
      .is('eliminada_en', null)
      .order('creado_en', {
        ascending: false
      });

    if (error) {
      throw error;
    }

    return data.map(fila => ({
      id: fila.id,
      nombre: fila.nombre,
      sinopsis: fila.sinopsis,
      duracionMinutos: fila.duracion_minutos,
      imagenUrl: fila.imagen_url,
      fechaEstreno: fila.fecha_estreno,
      clasificacionEdad:
        fila.clasificacion_edad as Pelicula['clasificacionEdad'],
      generos: fila.generos,
      estaActiva: fila.esta_activa
    }));
  }

  /*==============================
    Obtener una pelicula por ID 
  =============================== */
  async obtenerPeliculaPorId(id: string): Promise<Pelicula | null> {
    const cliente = this.servicioSupabase.cliente;

    const {
      data,
      error
    } = await cliente
      .from('peliculas')
      .select(`
        id,
        nombre,
        sinopsis,
        duracion_minutos,
        imagen_url,
        fecha_estreno,
        clasificacion_edad,
        generos,
        esta_activa
      `)
      /* Busca la fila del id que coincida con el de URL */
      .eq('id', id)
      .is('eliminada_en', null)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
    return null;
  }

    return {
      id: data.id,
      nombre: data.nombre,
      sinopsis: data.sinopsis,
      duracionMinutos: data.duracion_minutos,
      imagenUrl: data.imagen_url,
      fechaEstreno: data.fecha_estreno,
      clasificacionEdad:
        data.clasificacion_edad as Pelicula['clasificacionEdad'],
      generos: data.generos,
      estaActiva: data.esta_activa
    };
  }

  /*==============================
    ACTUALIZA pelicula existente
  =============================== */
  async actualizarPelicula(
    id: string,
    pelicula: DatosNuevaPelicula,
    imagen: File | null
  ): Promise<void> {
    const cliente = this.servicioSupabase.cliente;

    const datosActualizados: Record<string, unknown> = {
      nombre: pelicula.nombre,
      sinopsis: pelicula.sinopsis,
      duracion_minutos: pelicula.duracionMinutos,
      fecha_estreno: pelicula.fechaEstreno,
      clasificacion_edad: pelicula.clasificacionEdad,
      esta_activa: pelicula.estaActiva,
      generos: pelicula.generos
    };

    let rutaImagenNueva: string | null = null;

    /*
    * Si el administrador seleccionó una imagen nueva,
    * la subimos y reemplazamos imagen_url.
    *
    * Si no seleccionó una imagen, imagen_url no se incluye
    * y Supabase conserva el póster anterior.
    */
    if (imagen) {
      const {
        data: datosUsuario,
        error: errorUsuario
      } = await cliente.auth.getUser();

      if (errorUsuario || !datosUsuario.user) {
        throw new Error(
          'No existe una sesión de administrador activa.'
        );
      }
      const extension = this.obtenerExtension(imagen);

      const nombreArchivo =
        `${crypto.randomUUID()}.${extension}`;

      rutaImagenNueva =
        `${datosUsuario.user.id}/${nombreArchivo}`;

      const {
        error: errorSubida
      } = await cliente.storage
        .from('posters')
        .upload(rutaImagenNueva, imagen, {
          contentType: imagen.type,
          upsert: false
        });

      if (errorSubida) {
        throw errorSubida;
      }

      const {
        data: datosUrl
      } = cliente.storage
        .from('posters')
        .getPublicUrl(rutaImagenNueva);

      datosActualizados['imagen_url'] =
        datosUrl.publicUrl;
    }

      const {data: peliculaActualizada, error: errorActualizacion
      } = await cliente
        .from('peliculas')
        .update(datosActualizados)
        .eq('id', id)
        .select('id, nombre')
        .maybeSingle();

      if (errorActualizacion) {
        // Evitar dejar una imagen nueva abandonada si falla la actualización.
        if (rutaImagenNueva) {
          await cliente.storage
            .from('posters')
            .remove([rutaImagenNueva]);
        }

        throw errorActualizacion;
      }

      if (!peliculaActualizada) {
        // También eliminamos la imagen si RLS impidió actualizar la fila.
        if (rutaImagenNueva) {
          await cliente.storage
            .from('posters')
            .remove([rutaImagenNueva]);
        }
        throw new Error(
          'No se actualizó la película. Puede que no exista o que no tengas permisos.'
        );
      }
  }

  /**
  ELIMINICACION LOGICA de una película.
 
  No elimina el registro ni el póster.
  Registra la fecha y el administrador responsable,
  y además oculta la película de la página pública.
 */
async eliminarPelicula(id: string): Promise<void> {
  const cliente = this.servicioSupabase.cliente;

  // Obtener el administrador actualmente autenticado.
  const {
    data: datosUsuario,
    error: errorUsuario
  } = await cliente.auth.getUser();

  if (errorUsuario || !datosUsuario.user) {
    throw new Error(
      'No existe una sesión de administrador activa.'
    );
  }

  // Realizar la eliminación lógica mediante un UPDATE.
  const {
    data: peliculaEliminada,
    error: errorEliminacion
  } = await cliente
    .from('peliculas')
    .update({
      esta_activa: false,
      eliminada_en: new Date().toISOString(),
      eliminada_por: datosUsuario.user.id
    })
    .eq('id', id)
    .is('eliminada_en', null)
    .select('id, nombre')
    .maybeSingle();

  if (errorEliminacion) {
    throw errorEliminacion;
  }

  if (!peliculaEliminada) {
    throw new Error(
      'No se eliminó ninguna película. Puede que ya esté eliminada o que no tengas permisos.'
    );
  }

  console.log(
    'Película eliminada lógicamente:',
    peliculaEliminada
  );
}

/**
  Publica u oculta una película sin eliminarla
 
  @param id Identificador de la película
  @param estaActiva Nuevo estado de publicación
 */
async cambiarEstadoPublicacion(
  id: string,
  estaActiva: boolean
): Promise<void> {
  const cliente = this.servicioSupabase.cliente;

  const {
    data: peliculaActualizada,
    error
  } = await cliente
    .from('peliculas')
    .update({
      esta_activa: estaActiva
    })
    .eq('id', id)
    .is('eliminada_en', null)
    .select('id, esta_activa')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!peliculaActualizada) {
    throw new Error(
      'No se pudo cambiar el estado de publicación. ' +
      'La película no existe, fue eliminada o no tenés permisos.'
    );
  }
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