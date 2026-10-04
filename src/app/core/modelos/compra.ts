export type EstadoCompra = 'pendiente' | 'completada' | 'cancelada';
export type EstadoEntrada = 'comprada' | 'cancelada';
export type TipoDescuentoCompra = 'ninguno' | 'preventa' | 'primera_compra';

export interface Compra {
  id: string;
  usuarioId?: string | null;
  emailContacto?: string | null;
  subtotal?: number | null;
  porcentajeDescuentoAplicado?: number | null;
  montoDescuento?: number | null;
  tipoDescuentoAplicado?: TipoDescuentoCompra;
  esPrimeraCompra?: boolean | null;
  total?: number | null;
  estado: EstadoCompra;
  creadoEn: string;
}

export interface ButacaCompradaResumen {
  id: string;
  fila: string;
  numero: number;
  bloque: string;
  tipo: string;
  precio_unitario?: number | null;
  precioUnitario?: number;
}

export interface ResultadoCompra {
  compra_id: string;
  usuario_id: string | null;
  email_contacto: string;
  estado: EstadoCompra;
  creado_en: string;
  subtotal: number;
  porcentaje_descuento_aplicado: number;
  monto_descuento: number;
  tipo_descuento_aplicado: TipoDescuentoCompra;
  es_primera_compra: boolean;
  total: number;
  funcion: {
    id: string;
    pelicula_nombre: string;
    clasificacion_edad: string;
    fecha_hora_inicio: string;
    formato: string;
    sala_numero: number;
    sala_nombre: string;
  };
  butacas: ButacaCompradaResumen[];
}

export interface DatosConfirmarCompra {
  funcionId: string;
  butacaIds: string[];
  emailContacto?: string;
}
