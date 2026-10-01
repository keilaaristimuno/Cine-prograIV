export type FormatoProyeccion = '2D' | '3D' | '4D' | '5D';

export interface Sala {
  id: string;
  numero: number;
  nombre: string;
  formato: FormatoProyeccion;
  /** Indica si la sala está habilitada operativamente para recibir nuevas funciones */
  estaActiva: boolean;
}

export interface DatosNuevaSala {
  numero: number;
  nombre: string;
  formato: FormatoProyeccion;
  estaActiva: boolean;
}
