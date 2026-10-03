export type EstadoCompra = 'pendiente' | 'completada' | 'cancelada';
export type EstadoEntrada = 'comprada' | 'cancelada';

export interface Compra {
  id: string;
  usuarioId?: string | null;
  emailContacto?: string | null;
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
}

export interface ResultadoCompra {
  compra_id: string;
  usuario_id: string | null;
  email_contacto: string;
  estado: EstadoCompra;
  creado_en: string;
  total: number | null;
  funcion: {
    id: string;
    pelicula_nombre: string;
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
