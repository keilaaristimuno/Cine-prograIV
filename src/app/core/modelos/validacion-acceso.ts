export type EstadoValidacionAcceso =
  | 'autorizado'
  | 'ya_utilizado'
  | 'codigo_invalido'
  | 'funcion_cancelada'
  | 'compra_no_completada'
  | 'sin_entradas_activas'
  | 'inconsistencia_funciones'
  | 'no_autorizado'
  | 'error_desconocido';

export interface ButacaValidacion {
  fila: string;
  numero: number;
  bloque: string;
  tipo: string;
}

export interface ResultadoValidacionAcceso {
  ok: boolean;
  estado_validacion: EstadoValidacionAcceso;
  mensaje: string;
  codigo_alfanumerico?: string;
  pelicula_nombre?: string;
  clasificacion_edad?: string;
  formato?: string;
  sala_numero?: number;
  sala_nombre?: string;
  fecha_hora_inicio?: string;
  cantidad_entradas?: number;
  butacas?: ButacaValidacion[];
  validado_en?: string;
  validado_por_email?: string;
}
