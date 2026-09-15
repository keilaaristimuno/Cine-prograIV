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

  private obtenerExtension(imagen: File): string {
    const extensiones: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };

    return extensiones[imagen.type] ?? 'jpg';
  }
}