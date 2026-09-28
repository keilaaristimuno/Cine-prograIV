import { Component, input } from '@angular/core';
import { Pelicula } from '../../../../core/modelos/pelicula';

@Component({
  selector: 'app-tarjeta-pelicula',
  imports: [],
  templateUrl: './tarjeta-pelicula.html',
  styleUrl: './tarjeta-pelicula.scss'
})
export class TarjetaPelicula {
  /** Película individual recibida desde el componente contenedor (Cartelera)*/
  readonly pelicula = input.required<Pelicula>();

  /** Helper para formatear la duración en horas y minutos (ej. 148 -> "2h 28m")*/
  formatearDuracion(minutos: number): string {
    if (!minutos || minutos <= 0) {
      return 'N/D';
    }
    const horas = Math.floor(minutos / 60);
    const minRestantes = minutos % 60;
    if (horas === 0) {
      return `${minRestantes}m`;
    }
    return minRestantes > 0 ? `${horas}h ${minRestantes}m` : `${horas}h`;
  }
}
