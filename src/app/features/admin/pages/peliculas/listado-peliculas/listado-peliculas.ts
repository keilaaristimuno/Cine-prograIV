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
  readonly cambiandoEstadoId = signal<string | null>(null);
  readonly peliculaPendienteCambioEstado = signal<Pelicula | null>(null);

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
      CAMBIA ESTADO PELICULA
      ============================ */
  solicitarCambioEstado(pelicula: Pelicula): void {
    /*No permite iniciar esta acción si ya existe
     una eliminación o un cambio de estado en proceso*/
    if (
      this.eliminandoId() !== null ||
      this.cambiandoEstadoId() !== null
    ) {
      return;
    }

    this.peliculaPendienteCambioEstado.set(pelicula);
  }

  cancelarCambioEstado(): void {
    /*  Mientras Supabase está procesando la solicitud, el modal no se puede cerrar*/
    if (this.cambiandoEstadoId() !== null) {
      return;
    }
    this.peliculaPendienteCambioEstado.set(null);
  }

  async confirmarCambioEstado(): Promise<void> {
    const pelicula = this.peliculaPendienteCambioEstado();

    if (
      !pelicula ||
      this.cambiandoEstadoId() !== null ||
      this.eliminandoId() !== null
    ) {
      return;
    }

    /* Si está activa, la ocultamos. 
    Si está inactiva, la publicamos*/
    const nuevoEstado = !pelicula.estaActiva;

    this.cambiandoEstadoId.set(pelicula.id);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    try {
      await this.servicioPeliculas
        .cambiarEstadoPublicacion(
          pelicula.id,
          nuevoEstado
        );

      /* Actualizamos solamente la película modificada
       dentro del signal, sin recargar toda la página*/
      this.peliculas.update(peliculasActuales =>
        peliculasActuales.map(peliculaActual =>
          peliculaActual.id === pelicula.id
            ? {
                ...peliculaActual,
                estaActiva: nuevoEstado
              }
            : peliculaActual
        )
      );

      const accionRealizada = nuevoEstado ? 'publicó' : 'ocultó';

      const mensaje =
        `La película "${pelicula.nombre}" se ` +
        `${accionRealizada} correctamente.`;

      this.mensajeExito.set(mensaje);

      window.setTimeout(() => {
        if (this.mensajeExito() === mensaje) {
          this.mensajeExito.set('');
        }
      }, 5000);
    } catch (error) {
      console.error(
        'Error al cambiar el estado de la película:',
        error
      );

      const accionFallida = nuevoEstado ? 'publicar' : 'ocultar';

      this.mensajeError.set(
        `No se pudo ${accionFallida} ` +
        `"${pelicula.nombre}".`
      );
    } finally {
      this.cambiandoEstadoId.set(null);
      this.peliculaPendienteCambioEstado.set(null);
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