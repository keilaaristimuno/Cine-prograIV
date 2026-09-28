import { Component, inject, OnInit, signal } from '@angular/core';
import { Pelicula } from '../../../../core/modelos/pelicula';
import { ServicioPeliculas } from '../../../../core/servicios/servicio-peliculas';
import { TarjetaPelicula } from '../../componentes/tarjeta-pelicula/tarjeta-pelicula';

@Component({
  selector: 'app-cartelera',
  imports: [TarjetaPelicula],
  templateUrl: './cartelera.html',
  styleUrl: './cartelera.scss'
})
export class Cartelera implements OnInit {
  private readonly servicioPeliculas = inject(ServicioPeliculas);

  readonly peliculas = signal<Pelicula[]>([]);
  readonly cargando = signal(true);
  readonly mensajeError = signal('');

  ngOnInit(): void {
    void this.cargarCartelera();
  }

  /**
   * Consulta a Supabase las películas activas y actualiza los Signals de estado
   */
  async cargarCartelera(): Promise<void> {
    this.cargando.set(true);
    this.mensajeError.set('');

    try {
      const peliculasActivas =
        await this.servicioPeliculas.obtenerPeliculasCartelera();
      this.peliculas.set(peliculasActivas);
    } catch (error) {
      console.error('Error al cargar la cartelera:', error);
      this.mensajeError.set(
        'No pudimos cargar la cartelera de películas. Por favor, reintentá en unos momentos.'
      );
    } finally {
      this.cargando.set(false);
    }
  }
}
