import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../../../core/modelos/pelicula';

@Component({
  selector: 'app-tarjeta-pelicula',
  imports: [RouterLink],
  templateUrl: './tarjeta-pelicula.html',
  styleUrl: './tarjeta-pelicula.scss'
})
export class TarjetaPelicula {
  /** Película individual recibida desde el componente contenedor (Cartelera) */
  readonly pelicula = input.required<Pelicula>();

  /** Indica si la tarjeta se renderiza en la sección de próximos estrenos */
  readonly esProximamente = input<boolean>(false);

  /** Helper para formatear la duración en horas y minutos (ej. 148 -> "2h 28m") */
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

  /** Helper para formatear fecha AAAA-MM-DD a DD/MM/AAAA */
  formatearFecha(fechaIso: string): string {
    if (!fechaIso) {
      return 'Próximamente';
    }
    const partes = fechaIso.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fechaIso;
  }
}
