/**
 * Modelos para el Módulo 8: Fidelización, Puntos, Recompensas y Cupones
 */

export type TipoBeneficio =
  | 'entrada_gratis'
  | 'descuento_porcentual'
  | 'descuento_monto_fijo'
  | 'producto_candy';

export type TipoMovimientoPuntos =
  | 'acreditacion_compra_cine'
  | 'acreditacion_compra_candy'
  | 'debito_canje';

export type EstadoCupon =
  | 'disponible'
  | 'utilizado'
  | 'vencido'
  | 'cancelado';

export interface Recompensa {
  id: string;
  nombre: string;
  descripcion: string;
  costoPuntos: number;
  tipo: TipoBeneficio;
  valorBeneficio: number;
  productoCandyId?: string | null;
  diasValidez: number;
  activa: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface CuponCliente {
  id: string;
  codigoCupon: string;
  usuarioId?: string;
  recompensaId?: string | null;
  tipo: TipoBeneficio;
  valorBeneficio: number;
  descripcion: string;
  origen: string;
  estado: EstadoCupon;
  creadoEn: string;
  venceEn: string;
  utilizadoEn?: string | null;
}

export interface MovimientoPuntos {
  id: string;
  tipoMovimiento: TipoMovimientoPuntos;
  puntos: number;
  saldoResultante: number;
  motivo: string;
  creadoEn: string;
}

export interface PanelFidelizacionCliente {
  ok: boolean;
  saldoPuntos: number;
  pesosPorPunto: number;
  fidelizacionActiva: boolean;
  recompensas: Recompensa[];
  movimientos: MovimientoPuntos[];
  cupones: CuponCliente[];
}

export interface ResultadoCanje {
  ok: boolean;
  mensaje: string;
  nuevoSaldo?: number;
  puntosCanjeados?: number;
  cupon?: CuponCliente;
  codigoError?: string;
}

export interface DatosNuevaRecompensa {
  nombre: string;
  descripcion: string;
  costoPuntos: number;
  tipo: TipoBeneficio;
  valorBeneficio: number;
  productoCandyId?: string | null;
  diasValidez: number;
  activa?: boolean;
}
