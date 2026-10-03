export type EstadoEntrada = 'comprada' | 'cancelada';

/**
 * Entidad Entrada (detalle individual de butaca por función).
 * Representa la adquisición de una butaca física específica en una función determinada.
 * Toda entrada pertenece obligatoriamente a una compra (compraId no nulo).
 */
export interface Entrada {
  id: string;
  compraId: string;
  funcionId: string;
  butacaId: string;
  estado: EstadoEntrada;
  creadoEn: string;
}
