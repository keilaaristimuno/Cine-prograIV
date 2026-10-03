import { Component, computed, input, output } from '@angular/core';
import {
  Butaca,
  IdentificadorFila,
  ORDEN_FILAS_CANONICO,
  TipoButaca
} from '../../../core/modelos/butaca';
import { TipoButacaDirective } from '../../directivas/tipo-butaca.directive';

export type EstadoButacaFuncion = 'disponible' | 'ocupada' | 'seleccionada';

/**
 * Estructura de presentación para renderizar una fila completa de la sala
 * con sus 3 bloques físicos y su tipo predominante.
 */
export interface FilaMapa {
  identificador: IdentificadorFila;
  bloqueIzquierdo: Butaca[];
  bloqueCentral: Butaca[];
  bloqueDerecho: Butaca[];
  tipoFila: TipoButaca;
}

/**
 * Componente visual reutilizable para representar la distribución física
 * de las 518 butacas de una sala de cine (19 filas: 15 normales, 1 accesible 'JK' y 3 VIP).
 *
 * Características arquitectónicas (M4.2 y M4.3):
 * - Componente puro de presentación (Dumb component): NO conoce Supabase.
 * - Recibe las butacas a través de un Input Signal (`butacas`).
 * - Admite de forma opcional los conjuntos de IDs ocupados y seleccionados para una función.
 * - Si esInteractivo es false (como en /admin/salas/:id/butacas), mantiene la vista física estática.
 * - Si esInteractivo es true, emite el evento butacaClick al seleccionar butacas disponibles.
 * - Respeta estrictamente la secuencia física canónica A-I, JK, L-Q, R-T.
 * - Los pasillos se generan mediante separación visual de layout (CSS Grid / Flexbox).
 */
@Component({
  selector: 'app-mapa-butacas',
  imports: [TipoButacaDirective],
  templateUrl: './mapa-butacas.html',
  styleUrl: './mapa-butacas.scss'
})
export class MapaButacas {
  /** Colección de butacas físicas activas a renderizar */
  readonly butacas = input<Butaca[]>([]);

  /** Conjunto de IDs de butacas ocupadas para una función específica */
  readonly ocupadasIds = input<Set<string>>(new Set());

  /** Conjunto de IDs de butacas seleccionadas localmente por el usuario */
  readonly seleccionadasIds = input<Set<string>>(new Set());

  /** Habilita la interacción de selección para el flujo de compra */
  readonly esInteractivo = input<boolean>(false);

  /** Emite la butaca seleccionada o deseleccionada cuando el mapa es interactivo */
  readonly butacaClick = output<Butaca>();

  /**
   * Agrupación reactiva de las butacas por fila y por bloque,
   * preservando el orden canónico A-I, JK, L-Q, R-T.
   */
  readonly filas = computed<FilaMapa[]>(() => {
    const lista = this.butacas();
    if (!lista || lista.length === 0) {
      return [];
    }

    // 1. Agrupar las butacas por su fila
    const mapaFilas = new Map<IdentificadorFila, Butaca[]>();
    for (const b of lista) {
      let grupo = mapaFilas.get(b.fila);
      if (!grupo) {
        grupo = [];
        mapaFilas.set(b.fila, grupo);
      }
      grupo.push(b);
    }

    // 2. Reconstruir las filas en la secuencia física canónica
    const resultado: FilaMapa[] = [];

    for (const filaId of ORDEN_FILAS_CANONICO) {
      const butacasFila = mapaFilas.get(filaId);
      if (!butacasFila || butacasFila.length === 0) {
        continue;
      }

      const bloqueIzquierdo: Butaca[] = [];
      const bloqueCentral: Butaca[] = [];
      const bloqueDerecho: Butaca[] = [];

      for (const b of butacasFila) {
        if (b.bloque === 'izquierdo') {
          bloqueIzquierdo.push(b);
        } else if (b.bloque === 'central') {
          bloqueCentral.push(b);
        } else if (b.bloque === 'derecho') {
          bloqueDerecho.push(b);
        }
      }

      // Ordenar ascendentemente por posición interna en cada bloque
      bloqueIzquierdo.sort((a, b) => a.posicionEnBloque - b.posicionEnBloque);
      bloqueCentral.sort((a, b) => a.posicionEnBloque - b.posicionEnBloque);
      bloqueDerecho.sort((a, b) => a.posicionEnBloque - b.posicionEnBloque);

      // Determinar el tipo representativo de la fila
      let tipoFila: TipoButaca = 'normal';
      if (filaId === 'JK') {
        tipoFila = 'accesible';
      } else if (filaId === 'R' || filaId === 'S' || filaId === 'T') {
        tipoFila = 'vip';
      }

      resultado.push({
        identificador: filaId,
        bloqueIzquierdo,
        bloqueCentral,
        bloqueDerecho,
        tipoFila
      });
    }

    return resultado;
  });

  /** Conteo total de butacas cargadas */
  readonly totalButacas = computed(() => this.butacas().length);

  /**
   * Resuelve el estado puntual de una butaca para la función actual:
   * 'ocupada' | 'seleccionada' | 'disponible'
   */
  obtenerEstadoButaca(butaca: Butaca): EstadoButacaFuncion {
    if (this.ocupadasIds().has(butaca.id)) {
      return 'ocupada';
    }
    if (this.seleccionadasIds().has(butaca.id)) {
      return 'seleccionada';
    }
    return 'disponible';
  }

  /**
   * Manejador del evento de clic sobre una butaca física.
   */
  alHacerClick(butaca: Butaca): void {
    if (!this.esInteractivo() || !butaca.estaActiva || this.ocupadasIds().has(butaca.id)) {
      return;
    }
    this.butacaClick.emit(butaca);
  }

  /**
   * Construye el texto descriptivo accesible para el atributo title / tooltip nativo.
   */
  construirTooltip(filaId: IdentificadorFila, butaca: Butaca): string {
    if (!butaca.estaActiva) {
      return `Fila ${filaId}, Butaca ${butaca.numero} (${butaca.tipo}) - Inactiva por mantenimiento`;
    }

    const estado = this.obtenerEstadoButaca(butaca);
    if (estado === 'ocupada') {
      return `Fila ${filaId}, Butaca ${butaca.numero} (${butaca.tipo}) - Ocupada`;
    }
    if (estado === 'seleccionada') {
      return `Fila ${filaId}, Butaca ${butaca.numero} (${butaca.tipo}) - Seleccionada por vos`;
    }

    return `Fila ${filaId}, Butaca ${butaca.numero} (${butaca.tipo}) - Disponible`;
  }
}
