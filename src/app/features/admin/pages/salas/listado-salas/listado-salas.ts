import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sala } from '../../../../../core/modelos/sala';
import { ServicioSalas } from '../../../../../core/servicios/servicio-salas';

@Component({
  selector: 'app-listado-salas',
  imports: [RouterLink],
  templateUrl: './listado-salas.html',
  styleUrl: './listado-salas.scss'
})
export class ListadoSalas implements OnInit {
  private readonly servicioSalas = inject(ServicioSalas);

  readonly salas = signal<Sala[]>([]);
  readonly cargando = signal(true);
  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');
  readonly cambiandoEstadoId = signal<string | null>(null);

  ngOnInit(): void {
    void this.cargarSalas();
  }

  /**
   * Obtiene la lista completa de salas desde el servicio
   */
  async cargarSalas(): Promise<void> {
    this.cargando.set(true);
    this.mensajeError.set('');

    try {
      const salasRecuperadas = await this.servicioSalas.obtenerSalas();
      this.salas.set(salasRecuperadas);
    } catch (error) {
      console.error('Error al cargar salas:', error);
      this.mensajeError.set('No se pudieron cargar las salas. Por favor, reintentá.');
    } finally {
      this.cargando.set(false);
    }
  }

  /**
   * Cambia el estado de activación operativa de la sala
   */
  async alternarEstado(sala: Sala): Promise<void> {
    if (this.cambiandoEstadoId() !== null) {
      return;
    }

    const nuevoEstado = !sala.estaActiva;
    this.cambiandoEstadoId.set(sala.id);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    try {
      await this.servicioSalas.cambiarEstadoSala(sala.id, nuevoEstado);

      // Actualización reactiva local sin recarga completa
      this.salas.update(actuales =>
        actuales.map(s => (s.id === sala.id ? { ...s, estaActiva: nuevoEstado } : s))
      );

      const mensaje = `La ${sala.nombre} ahora está ${nuevoEstado ? 'habilitada' : 'inhabilitada'}.`;
      this.mensajeExito.set(mensaje);

      window.setTimeout(() => {
        if (this.mensajeExito() === mensaje) {
          this.mensajeExito.set('');
        }
      }, 3500);
    } catch (error) {
      console.error('Error al cambiar estado de la sala:', error);
      this.mensajeError.set(`No se pudo cambiar el estado de la ${sala.nombre}.`);
    } finally {
      this.cambiandoEstadoId.set(null);
    }
  }
}
