export type ClasificacionEdad = 'ATP' | '+13' | '+18';

export interface Pelicula {
  id: string;
  nombre: string;
  sinopsis: string;
  duracionMinutos: number;
  imagenUrl: string;
  fechaEstreno: string;
  clasificacionEdad: ClasificacionEdad;
  generos: string[];
  estaActiva: boolean;
  permitePreventa?: boolean;
  porcentajeDescuentoPreventa?: number;
  diasAnticipacionPreventa?: number;
}
