import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Butaca } from '../../../../core/modelos/butaca';
import { FuncionConDetalle } from '../../../../core/modelos/funcion';
import { ServicioButacas } from '../../../../core/servicios/servicio-butacas';
import { ServicioFunciones } from '../../../../core/servicios/servicio-funciones';
import { MapaButacas } from '../../../../shared/components/mapa-butacas/mapa-butacas';

/**
 * Página pública de disponibilidad y selección interactiva de butacas (/funcion/:id/butacas).
 *
 * Características:
 * - Accesible tanto para usuarios anónimos como autenticados.
 * - Carga en paralelo la función, sus datos de película/sala y las butacas físicas.
 * - Recupera el conjunto de butacas ocupadas desde la tabla 'entradas'.
 * - Mantiene la selección 100% local en memoria en un Signal reactivo (seleccionadasIds).
 * - Se suscribe a Supabase Realtime para recibir cambios concurrentes en vivo.
 * - Deselecciona automáticamente y advierte si otra compra ocupa una butaca elegida.
 * - Limpia estrictamente el canal Realtime al destruirse el componente.
 */
@Component({
  selector: 'app-seleccion-butacas',
  imports: [RouterLink, MapaButacas],
  templateUrl: './seleccion-butacas.html',
  styleUrl: './seleccion-butacas.scss'
})
export class SeleccionButacas implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly servicioFunciones = inject(ServicioFunciones);
  private readonly servicioButacas = inject(ServicioButacas);

  readonly funcion = signal<FuncionConDetalle | null>(null);
  readonly butacas = signal<Butaca[]>([]);
  readonly ocupadasIds = signal<Set<string>>(new Set());
  readonly seleccionadasIds = signal<Set<string>>(new Set());

  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly avisoConflicto = signal<string | null>(null);

  /** Indica si la función admite selección de butacas */
  readonly permiteSeleccion = signal<boolean>(true);

  private canalRealtime: RealtimeChannel | null = null;
  private timerAviso: any = null;

  /** Cantidad total de butacas seleccionadas */
  readonly cantidadSeleccionadas = computed(() => this.seleccionadasIds().size);

  /**
   * Colección ordenada de butacas seleccionadas para mostrar en la barra resumen.
   */
  readonly butacasSeleccionadas = computed<Butaca[]>(() => {
    const ids = this.seleccionadasIds();
    if (ids.size === 0) {
      return [];
    }
    const seleccionadas = this.butacas().filter(b => ids.has(b.id));
    return this.servicioButacas.ordenarButacas(seleccionadas);
  });

  ngOnInit(): void {
    this.cargarDatos();

    // Limpieza segura del canal Realtime al navegar o destruir el componente
    this.destroyRef.onDestroy(() => {
      this.limpiarCanalRealtime();
      if (this.timerAviso) {
        clearTimeout(this.timerAviso);
      }
    });
  }

  /**
   * Carga la función solicitada, la sala, las butacas físicas y las ocupadas.
   */
  async cargarDatos(): Promise<void> {
    const funcionId = this.route.snapshot.paramMap.get('id');
    if (!funcionId) {
      this.error.set('No se especificó un identificador de función válido.');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    this.permiteSeleccion.set(true);

    try {
      // 1. Obtener datos de la función con película y sala
      const funcionData = await this.servicioFunciones.obtenerFuncionPorId(funcionId);
      if (!funcionData) {
        this.error.set('La función solicitada no existe o no se encuentra disponible.');
        this.permiteSeleccion.set(false);
        return;
      }

      this.funcion.set(funcionData);

      // 2. Validaciones de casos borde de la función
      if (funcionData.estado === 'cancelada') {
        this.error.set('Esta función ha sido cancelada y no admite venta ni selección de butacas.');
        this.permiteSeleccion.set(false);
        return;
      }

      const fechaInicio = new Date(funcionData.fechaHoraInicio);
      if (fechaInicio.getTime() <= Date.now()) {
        this.error.set('Esta función ya ha comenzado y no admite selección de butacas.');
        this.permiteSeleccion.set(false);
        return;
      }

      // 3. Cargar butacas físicas de la sala y butacas ocupadas en paralelo
      const [butacasData, ocupadasSet] = await Promise.all([
        this.servicioButacas.obtenerButacasPorSala(funcionData.salaId),
        this.servicioButacas.obtenerIdsButacasOcupadas(funcionId)
      ]);

      if (butacasData.length === 0) {
        this.error.set('No se encontraron butacas físicas registradas para la sala de esta función.');
        this.permiteSeleccion.set(false);
        return;
      }

      this.butacas.set(butacasData);
      this.ocupadasIds.set(ocupadasSet);

      // 4. Iniciar suscripción Realtime para detectar ocupaciones concurrentes
      this.iniciarSuscripcionRealtime(funcionId);
    } catch (err: any) {
      console.error('Error al inicializar la pantalla de selección de butacas:', err);
      this.error.set(
        err?.message || 'Ocurrió un error al cargar la disponibilidad de la sala.'
      );
    } finally {
      this.cargando.set(false);
    }
  }

  /**
   * Conecta el canal Realtime de Supabase para la función actual.
   */
  private iniciarSuscripcionRealtime(funcionId: string): void {
    this.limpiarCanalRealtime();

    this.canalRealtime = this.servicioButacas.suscribirOcupacionFuncion(
      funcionId,
      evento => this.procesarCambioRealtime(evento)
    );
  }

  /**
   * Procesa las notificaciones en tiempo real provenientes de la base de datos.
   */
  private procesarCambioRealtime(evento: { tipo: 'ocupada' | 'liberada'; butacaId: string }): void {
    if (evento.tipo === 'ocupada') {
      // 1. Marcar como ocupada en el signal
      this.ocupadasIds.update(set => {
        const nuevo = new Set(set);
        nuevo.add(evento.butacaId);
        return nuevo;
      });

      // 2. Si el usuario actual tenía esta butaca seleccionada localmente, expulsarla y alertar
      if (this.seleccionadasIds().has(evento.butacaId)) {
        this.seleccionadasIds.update(set => {
          const nuevo = new Set(set);
          nuevo.delete(evento.butacaId);
          return nuevo;
        });

        const butaca = this.butacas().find(b => b.id === evento.butacaId);
        const identificacion = butaca
          ? `Fila ${butaca.fila} — Butaca ${butaca.numero}`
          : 'Una de tus butacas';

        this.mostrarAvisoConflicto(
          `¡Atención! ${identificacion} acaba de ser confirmada por otro usuario y fue deseleccionada.`
        );
      }
    } else if (evento.tipo === 'liberada') {
      // Liberar la butaca en la vista
      this.ocupadasIds.update(set => {
        const nuevo = new Set(set);
        nuevo.delete(evento.butacaId);
        return nuevo;
      });
    }
  }

  /**
   * Alterna la selección local de una butaca disponible.
   */
  alternarSeleccion(butaca: Butaca): void {
    if (!this.permiteSeleccion() || !butaca.estaActiva || this.ocupadasIds().has(butaca.id)) {
      return;
    }

    this.seleccionadasIds.update(actuales => {
      const nuevo = new Set(actuales);
      if (nuevo.has(butaca.id)) {
        nuevo.delete(butaca.id);
      } else {
        nuevo.add(butaca.id);
      }
      return nuevo;
    });
  }

  /**
   * Deselecciona todas las butacas elegidas localmente.
   */
  limpiarSeleccion(): void {
    this.seleccionadasIds.set(new Set());
  }

  /**
   * Muestra un mensaje temporal de conflicto cuando Realtime ocupa una butaca seleccionada.
   */
  private mostrarAvisoConflicto(mensaje: string): void {
    this.avisoConflicto.set(mensaje);
    if (this.timerAviso) {
      clearTimeout(this.timerAviso);
    }
    this.timerAviso = setTimeout(() => {
      this.avisoConflicto.set(null);
    }, 7000);
  }

  cerrarAvisoConflicto(): void {
    this.avisoConflicto.set(null);
    if (this.timerAviso) {
      clearTimeout(this.timerAviso);
    }
  }

  private limpiarCanalRealtime(): void {
    if (this.canalRealtime) {
      this.servicioButacas.desuscribirCanal(this.canalRealtime);
      this.canalRealtime = null;
    }
  }

  /**
   * Helper para formatear fecha completa en español (ej: "Jueves 15 de Octubre - 20:30 hs")
   */
  formatearFechaHora(fechaIso: string): string {
    if (!fechaIso) return '';
    const fecha = new Date(fechaIso);
    const opcionesFecha: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    };
    const fechaTexto = fecha.toLocaleDateString('es-AR', opcionesFecha);
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    return `${fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1)} • ${horas}:${minutos} hs`;
  }
}
