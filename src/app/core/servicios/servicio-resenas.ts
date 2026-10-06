import { inject, Injectable } from '@angular/core';
import {
  DatosGuardarResena,
  ElegibilidadResena,
  PeliculaRanking,
  ResultadoGuardarResena,
  ResumenResenasPelicula
} from '../modelos/resena';
import { ServicioSupabase } from './servicio-supabase';

@Injectable({
  providedIn: 'root'
})
export class ServicioResenas {
  private readonly servicioSupabase = inject(ServicioSupabase);

  /**
   * Obtiene las reseñas y el resumen de puntuación de una película
   */
  async obtenerResenasPelicula(peliculaId: string): Promise<ResumenResenasPelicula> {
    const { data, error } = await this.servicioSupabase.cliente.rpc(
      'obtener_resenas_pelicula',
      { p_pelicula_id: peliculaId }
    );

    if (error) {
      console.error('Error al obtener reseñas de película:', error);
      throw new Error('No pudimos cargar las reseñas de esta película.');
    }

    const payload = data as {
      pelicula_id: string;
      promedio: number;
      cantidad_resenas: number;
      resenas: Array<{
        id: string;
        usuario_id: string;
        puntuacion: number;
        comentario: string;
        creado_en: string;
        actualizado_en: string;
        nombre_autor: string;
      }>;
    };

    return {
      peliculaId: payload.pelicula_id || peliculaId,
      promedio: Number(payload.promedio) || 0,
      cantidadResenas: Number(payload.cantidad_resenas) || 0,
      resenas: (payload.resenas || []).map(r => ({
        id: r.id,
        usuarioId: r.usuario_id,
        puntuacion: Number(r.puntuacion),
        comentario: r.comentario,
        creadoEn: r.creado_en,
        actualizadoEn: r.actualizado_en,
        nombreAutor: r.nombre_autor || 'Espectador'
      }))
    };
  }

  /**
   * Verifica si el usuario actual cumple las condiciones para calificar y opinar
   */
  async verificarElegibilidad(peliculaId: string): Promise<ElegibilidadResena> {
    const { data, error } = await this.servicioSupabase.cliente.rpc(
      'verificar_elegibilidad_resena',
      { p_pelicula_id: peliculaId }
    );

    if (error) {
      console.error('Error al verificar elegibilidad de reseña:', error);
      return {
        puedeResenar: false,
        motivo: 'no_autenticado',
        mensaje: 'No se pudo verificar la elegibilidad para calificar.',
        yaReseno: false,
        resenaExistente: null
      };
    }

    const res = data as {
      puede_resenar: boolean;
      motivo: string;
      mensaje: string;
      yaReseno?: boolean;
      ya_reseno?: boolean;
      resena_existente: {
        id: string;
        puntuacion: number;
        comentario: string;
        creado_en: string;
        actualizado_en: string;
      } | null;
    };

    return {
      puedeResenar: Boolean(res.puede_resenar),
      motivo: res.motivo as ElegibilidadResena['motivo'],
      mensaje: res.mensaje || '',
      yaReseno: Boolean(res.ya_reseno ?? res.yaReseno),
      resenaExistente: res.resena_existente
        ? {
            id: res.resena_existente.id,
            puntuacion: Number(res.resena_existente.puntuacion),
            comentario: res.resena_existente.comentario,
            creadoEn: res.resena_existente.creado_en,
            actualizadoEn: res.resena_existente.actualizado_en
          }
        : null
    };
  }

  /**
   * Guarda o actualiza la reseña del usuario mediante RPC transaccional
   */
  async guardarResena(datos: DatosGuardarResena): Promise<ResultadoGuardarResena> {
    const { data, error } = await this.servicioSupabase.cliente.rpc(
      'guardar_resena_pelicula',
      {
        p_pelicula_id: datos.peliculaId,
        p_puntuacion: datos.puntuacion,
        p_comentario: datos.comentario
      }
    );

    if (error) {
      console.error('Error al guardar reseña de película:', error);
      throw new Error(error.message || 'No se pudo registrar la reseña.');
    }

    const res = data as {
      ok: boolean;
      accion?: 'creada' | 'actualizada';
      mensaje: string;
      codigo_error?: string;
      resena?: {
        id: string;
        pelicula_id: string;
        puntuacion: number;
        comentario: string;
        creado_en: string;
        actualizado_en: string;
      };
    };

    if (!res.ok) {
      return {
        ok: false,
        mensaje: res.mensaje,
        codigoError: res.codigo_error
      };
    }

    return {
      ok: true,
      accion: res.accion,
      mensaje: res.mensaje,
      resena: res.resena
        ? {
            id: res.resena.id,
            peliculaId: res.resena.pelicula_id,
            puntuacion: Number(res.resena.puntuacion),
            comentario: res.resena.comentario,
            creadoEn: res.resena.creado_en,
            actualizadoEn: res.resena.actualizado_en
          }
        : undefined
    };
  }

  /**
   * Obtiene el Top 3 de películas mejor calificadas para la cartelera
   */
  async obtenerTop3Peliculas(): Promise<PeliculaRanking[]> {
    const { data, error } = await this.servicioSupabase.cliente.rpc(
      'obtener_top_3_peliculas'
    );

    if (error) {
      console.error('Error al obtener ranking de películas:', error);
      return [];
    }

    const lista = (data || []) as Array<{
      id: string;
      nombre: string;
      imagen_url: string | null;
      fecha_estreno: string;
      duracion_minutos: number;
      clasificacion_edad: string;
      promedio: number;
      cantidad_resenas: number;
    }>;

    return lista.map(p => ({
      id: p.id,
      nombre: p.nombre,
      imagenUrl: p.imagen_url,
      fechaEstreno: p.fecha_estreno,
      duracionMinutos: p.duracion_minutos,
      clasificacionEdad: p.clasificacion_edad,
      promedio: Number(p.promedio) || 0,
      cantidadResenas: Number(p.cantidad_resenas) || 0
    }));
  }
}
