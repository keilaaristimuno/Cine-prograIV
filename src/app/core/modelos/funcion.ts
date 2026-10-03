import { ClasificacionEdad } from './pelicula';
import { FormatoProyeccion, Sala } from './sala';

export type EstadoFuncion = 'programada' | 'cancelada';

/**
 * Entidad base Función del dominio
 */
export interface Funcion {
  id: string;
  peliculaId: string;
  salaId: string;
  fechaHoraInicio: string; // ISO 8601 string
  fechaHoraFin: string;    // ISO 8601 string (inicio + duracionMinutos)
  formato: FormatoProyeccion;
  estado: EstadoFuncion;
}

/**
 * DTO para la creación interna de una función con sala ya asignada.
 * Requiere duracionMinutos para derivar siempre fechaHoraFin de forma consistente.
 */
export interface DatosNuevaFuncion {
  peliculaId: string;
  salaId: string;
  fechaHoraInicio: string;
  duracionMinutos: number;
  formato: FormatoProyeccion;
}

/**
 * DTO para la solicitud de programación automática de una función.
 * El administrador no elige la sala: el sistema la resuelve automáticamente.
 */
export interface DatosProgramarFuncion {
  peliculaId: string;
  fechaHoraInicio: string; // ISO 8601 string
  formato: FormatoProyeccion;
}

/**
 * Resultado devuelto tras programar exitosamente una función con asignación automática.
 */
export interface ResultadoProgramacion {
  funcion: Funcion;
  salaAsignada: Sala;
}

/**
 * Representación de Función enriquecida con información de película y sala
 * para listados y vistas administrativas.
 */
export interface FuncionConDetalle extends Funcion {
  pelicula?: {
    id: string;
    nombre: string;
    duracionMinutos: number;
    imagenUrl: string;
    clasificacionEdad?: ClasificacionEdad;
  };
  sala?: {
    id: string;
    numero: number;
    nombre: string;
    formato: FormatoProyeccion;
  };
}
