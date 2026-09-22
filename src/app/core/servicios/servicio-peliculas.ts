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

  /* obtiene peliculas desde las cargadas a supabase */
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
  async obtenerPeliculaPorId(id: string): Promise<Pelicula> {
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
      .single();

    if (error) {
      throw error;
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

    /* const {
      error: errorActualizacion
    } = await cliente
      .from('peliculas')
      .update(datosActualizados)
      .eq('id', id);

    if (errorActualizacion) {
      /*
      * Si subimos una imagen nueva pero después falla
      * la actualización, eliminamos esa nueva imagen
      * para que no quede abandonada en Storage.
      
      if (rutaImagenNueva) {
        await cliente.storage
          .from('posters')
          .remove([rutaImagenNueva]);
      }
      throw errorActualizacion;
    } */

      const {
        data: peliculasActualizadas,
        error: errorActualizacion
      } = await cliente
        .from('peliculas')
        .update(datosActualizados)
        .eq('id', id)
        .select('id, nombre');

      if (errorActualizacion) {
        if (rutaImagenNueva) {
          await cliente.storage
            .from('posters')
            .remove([rutaImagenNueva]);
        }

        throw errorActualizacion;
      }

      if (
        !peliculasActualizadas ||
        peliculasActualizadas.length === 0
      ) {
        if (rutaImagenNueva) {
          await cliente.storage
            .from('posters')
            .remove([rutaImagenNueva]);
        }

        throw new Error(
          'No se actualizó ninguna película. Revisá la política RLS de UPDATE.'
        );
      }

      console.log(
        'Fila actualizada por Supabase:',
        peliculasActualizadas[0]
      );


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