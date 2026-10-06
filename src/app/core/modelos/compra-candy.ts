import { ProductoCandy } from './producto-candy';

export type EstadoCompraCandy = 'pendiente_retiro' | 'comprada' | 'entregada' | 'cancelada';

/**
 * Representa un producto dentro del carrito de compras activo en memoria / local.
 */
export interface ItemCarritoCandy {
  producto: ProductoCandy;
  cantidad: number;
  subtotal: number;
}

/**
 * Payload enviado al servicio y RPC para formalizar la transacción de compra de Candy.
 */
export interface DatosConfirmarCompraCandy {
  emailContacto: string;
  lineas: Array<{
    productoId: string;
    cantidad: number;
  }>;
}

/**
 * Snapshot histórico inmutable de una línea de compra vendida.
 */
export interface LineaCompraCandyResultado {
  id?: string;
  producto_id: string;
  nombre_producto: string;
  categoria_producto?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  imagen_url?: string | null;
}

/**
 * Resultado completo retornado tras una compra exitosa de Candy.
 * Se utiliza para visualizar el voucher digital, código CD, QR y descarga de PDF.
 */
export interface ResultadoCompraCandy {
  compra_id: string;
  usuario_id?: string | null;
  email_contacto: string;
  codigo_alfanumerico: string;
  total: number;
  estado: EstadoCompraCandy;
  retiro_validado: boolean;
  retiro_validado_en?: string | null;
  creado_en: string;
  lineas: LineaCompraCandyResultado[];
}

export type EstadoValidacionCandy =
  | 'entrega_autorizada'
  | 'ya_entregado'
  | 'pedido_cancelado'
  | 'codigo_inexistente'
  | 'codigo_invalido'
  | 'estado_invalido';

export interface ProductoEntregaCandy {
  nombre_producto: string;
  categoria_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

/**
 * Payload retornado por la RPC validar_entrega_candy para el personal operativo.
 */
export interface ResultadoValidarEntregaCandy {
  ok: boolean;
  estado_validacion: EstadoValidacionCandy;
  mensaje: string;
  codigo_alfanumerico?: string;
  estado?: string;
  total?: number;
  total_unidades?: number;
  fecha_compra?: string;
  entregado_en?: string;
  entregado_por_email?: string;
  productos?: ProductoEntregaCandy[];
}
