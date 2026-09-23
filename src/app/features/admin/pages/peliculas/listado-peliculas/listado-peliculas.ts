import {Component, inject, OnInit, signal} from '@angular/core';
import {RouterLink} from '@angular/router';

import {Pelicula} from '../../../../../core/modelos/pelicula';
import {ServicioPeliculas} from '../../../../../core/servicios/servicio-peliculas';

@Component({
  selector: 'app-listado-peliculas',
  imports: [RouterLink],
  templateUrl: './listado-peliculas.html',
  styleUrl: './listado-peliculas.scss'
})
export class ListadoPeliculas implements OnInit {
  /* readonly: no puede reemplazarse por otro servicio después de inicializarse. */
  private readonly servicioPeliculas = inject(ServicioPeliculas);
  readonly peliculas = signal<Pelicula[]>([]);
  readonly cargando = signal(true);
  readonly mensajeError = signal('');
  readonly eliminandoId = signal<string | null>(null);
  readonly mensajeExito = signal('');
  readonly peliculaPendienteEliminacion = signal<Pelicula | null>(null);

  ngOnInit(): void {
    void this.cargarPeliculas();
  }

  /* ==============================
      ELIMINAR PELICULA
      ============================ */
  solicitarEliminacion(pelicula: Pelicula): void {
    if (this.eliminandoId() !== null) {
      return;
    }

    this.peliculaPendienteEliminacion.set(pelicula);
  }

  cancelarEliminacion(): void {
    // No permitir cerrar el modal mientras Supabase está trabajando.
    if (this.eliminandoId() !== null) {
      return;
    }
    this.peliculaPendienteEliminacion.set(null);
  }

  async confirmarEliminacion(): Promise<void> {
    const pelicula = this.peliculaPendienteEliminacion();

    if (!pelicula || this.eliminandoId() !== null) {
      return;
    }

    this.eliminandoId.set(pelicula.id);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    try {
      await this.servicioPeliculas.eliminarPelicula(
        pelicula.id
      );

      this.peliculas.update(peliculasActuales =>
        peliculasActuales.filter(
          peliculaActual => peliculaActual.id !== pelicula.id
        )
      );

      const mensaje =
        `La película "${pelicula.nombre}" se eliminó correctamente.`;

      this.mensajeExito.set(mensaje);

      window.setTimeout(() => {
        if (this.mensajeExito() === mensaje) {
          this.mensajeExito.set('');
        }
      }, 3500);
    } catch (error) {
      console.error(
        'Error al eliminar la película:',
        error
      );

      this.mensajeError.set(
        `No se pudo eliminar "${pelicula.nombre}".`
      );
    } finally {
      this.eliminandoId.set(null);
      this.peliculaPendienteEliminacion.set(null);
    }
  }
  /* ==============================
      CARGAR PELICULA
      ============================ */
  private async cargarPeliculas(): Promise<void> {
    this.cargando.set(true);
    this.mensajeError.set('');

    try {
      const peliculas = await this.servicioPeliculas.obtenerPeliculas();
      this.peliculas.set(peliculas);
    } catch (error) {
      console.error(
        'Error al obtener las películas:',
        error
      );

      this.mensajeError.set(
        'No se pudieron cargar las películas.'
      );
    } finally {
      this.cargando.set(false);
    }
  }
}