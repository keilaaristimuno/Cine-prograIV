import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FuncionConDetalle } from '../../../../../core/modelos/funcion';
import { ServicioFunciones } from '../../../../../core/servicios/servicio-funciones';

@Component({
  selector: 'app-listado-funciones',
  imports: [RouterLink],
  templateUrl: './listado-funciones.html',
  styleUrl: './listado-funciones.scss'
})
export class ListadoFunciones implements OnInit {
  private readonly servicioFunciones = inject(ServicioFunciones);

  readonly funciones = signal<FuncionConDetalle[]>([]);
  readonly cargando = signal(true);
  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

  // Control para el modal de confirmación de cancelación
  readonly funcionACancelar = signal<FuncionConDetalle | null>(null);
  readonly cancelando = signal(false);

  ngOnInit(): void {
    void this.cargarFunciones();
  }

  /**
   * Carga todas las funciones programadas y canceladas
   */
  async cargarFunciones(): Promise<void> {
    this.cargando.set(true);
    this.mensajeError.set('');

    try {
      const datos = await this.servicioFunciones.obtenerFunciones();
      this.funciones.set(datos);
    } catch (error) {
      console.error('Error al cargar funciones:', error);
      this.mensajeError.set(
        'No se pudieron cargar las funciones. Por favor, reintentá más tarde.'
      );
    } finally {
      this.cargando.set(false);
    }
  }

  /**
   * Abre el modal de confirmación para cancelar una función
   */
  abrirModalCancelar(funcion: FuncionConDetalle): void {
    if (funcion.estado === 'cancelada') {
      return;
    }
    this.funcionACancelar.set(funcion);
  }

  /**
   * Cierra el modal de confirmación
   */
  cerrarModalCancelar(): void {
    if (this.cancelando()) {
      return;
    }
    this.funcionACancelar.set(null);
  }

  /**
   * Confirma la cancelación de la función seleccionada
   */
  async confirmarCancelacion(): Promise<void> {
    const funcion = this.funcionACancelar();
    if (!funcion) {
      return;
    }

    this.cancelando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    try {
      await this.servicioFunciones.cancelarFuncion(funcion.id);

      // Actualizar estado en memoria reactivamente
      this.funciones.update(lista =>
        lista.map(f => (f.id === funcion.id ? { ...f, estado: 'cancelada' } : f))
      );

      const mensaje = `La función de "${funcion.pelicula?.nombre ?? 'la película'}" fue cancelada con éxito.`;
      this.mensajeExito.set(mensaje);
      this.funcionACancelar.set(null);

      window.setTimeout(() => {
        if (this.mensajeExito() === mensaje) {
          this.mensajeExito.set('');
        }
      }, 4000);
    } catch (error) {
      console.error('Error al cancelar función:', error);
      this.mensajeError.set(
        error instanceof Error ? error.message : 'No se pudo cancelar la función.'
      );
    } finally {
      this.cancelando.set(false);
    }
  }

  /**
   * Formatea la fecha ISO a presentación local DD/MM/AAAA
   */
  formatearFecha(fechaIso: string): string {
    const d = new Date(fechaIso);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Formatea el horario de inicio y fin HH:MM - HH:MM en hora local
   */
  formatearHorario(inicioIso: string, finIso: string): string {
    const inicio = new Date(inicioIso);
    const fin = new Date(finIso);

    const horaInicio = inicio.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const horaFin = fin.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return `${horaInicio} - ${horaFin}`;
  }
}
