/**
 * Modelos de datos para el Módulo 7: Reseñas, Calificaciones y Ranking Top 3
 */

export interface Resena {
  id: string;
  usuarioId: string;
  puntuacion: number;
  comentario: string;
  creadoEn: string;
  actualizadoEn: string;
  nombreAutor: string;
}

export interface ResumenResenasPelicula {
  peliculaId: string;
  promedio: number;
  cantidadResenas: number;
  resenas: Resena[];
}

export type MotivoElegibilidadResena =
  | 'no_autenticado'
  | 'pelicula_invalida'
  | 'rol_no_autorizado'
  | 'sin_asistencia_validada'
  | 'elegible'
  | 'elegible_con_resena_previa';

export interface ResenaExistenteSnapshot {
  id: string;
  puntuacion: number;
  comentario: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ElegibilidadResena {
  puedeResenar: boolean;
  motivo: MotivoElegibilidadResena;
  mensaje: string;
  yaReseno: boolean;
  resenaExistente: ResenaExistenteSnapshot | null;
}

export interface PeliculaRanking {
  id: string;
  nombre: string;
  imagenUrl: string | null;
  fechaEstreno: string;
  duracionMinutos: number;
  clasificacionEdad: string;
  promedio: number;
  cantidadResenas: number;
}

export interface DatosGuardarResena {
  peliculaId: string;
  puntuacion: number;
  comentario: string;
}

export interface ResultadoGuardarResena {
  ok: boolean;
  accion?: 'creada' | 'actualizada';
  mensaje: string;
  codigoError?: string;
  resena?: {
    id: string;
    peliculaId: string;
    puntuacion: number;
    comentario: string;
    creadoEn: string;
    actualizadoEn: string;
  };
}
