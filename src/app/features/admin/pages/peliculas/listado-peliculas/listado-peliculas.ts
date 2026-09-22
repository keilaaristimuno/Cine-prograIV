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

  ngOnInit(): void {
    void this.cargarPeliculas();
  }

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