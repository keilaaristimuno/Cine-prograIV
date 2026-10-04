export type FormatoProyeccion = '2D' | '3D' | '4D' | '5D';

export type TipoDescuentoCompra = 'ninguno' | 'preventa' | 'primera_compra';

export interface TarifaFormato {
  formato: FormatoProyeccion;
  precioBase: number;
  actualizadoEn?: string;
}

export interface ConfiguracionCine {
  id: number;
  porcentajeRecargoVip: number;
  porcentajeDescuentoPrimeraCompra: number;
  descuentoPrimeraCompraActivo: boolean;
  diasAnticipacionPreventa: number;
  actualizadoEn?: string;
}

export interface ResumenPreciosFuncion {
  formato: FormatoProyeccion;
  precioBase: number;
  precioVip: number;
  recargoVipPorcentaje: number;
  enPreventa: boolean;
  porcentajeDescuentoPreventa: number;
  esPrimeraCompra: boolean;
  aplicaPrimeraCompra: boolean;
  porcentajeDescuentoPrimeraCompra: number;
  mejorDescuentoPorcentaje: number;
  tipoMejorDescuento: TipoDescuentoCompra;
}
