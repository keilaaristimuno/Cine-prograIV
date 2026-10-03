export type TipoButaca = 'normal' | 'accesible' | 'vip';
export type BloqueButaca = 'izquierdo' | 'central' | 'derecho';

export type IdentificadorFila =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I'
  | 'JK'
  | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q'
  | 'R' | 'S' | 'T';

/**
 * Secuencia canónica física de las 19 filas de la sala.
 * Permite ordenar de forma segura e independiente del orden alfabético simple
 * para contemplar la fila especial accesible 'JK'.
 */
export const ORDEN_FILAS_CANONICO: readonly IdentificadorFila[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
  'JK',
  'L', 'M', 'N', 'O', 'P', 'Q',
  'R', 'S', 'T'
];

/**
 * Entidad física Butaca
 * Representa la posición estructural fija en la sala.
 * NO contiene estado 'ocupada' porque la ocupación depende de cada función particular.
 */
export interface Butaca {
  id: string;
  salaId: string;
  fila: IdentificadorFila;
  numero: number;            // Número correlativo dentro de la fila (1..28 o 1..14)
  bloque: BloqueButaca;      // 'izquierdo' | 'central' | 'derecho'
  posicionEnBloque: number;  // Posición interna dentro del bloque
  tipo: TipoButaca;          // 'normal' | 'accesible' | 'vip'
  estaActiva: boolean;       // Permite inhabilitar butacas físicas por mantenimiento
}
