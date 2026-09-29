import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Pelicula } from '../../../../core/modelos/pelicula';
import { ServicioPeliculas } from '../../../../core/servicios/servicio-peliculas';

@Component({
  selector: 'app-detalle-pelicula',
  imports: [RouterLink],
  templateUrl: './detalle-pelicula.html',
  styleUrl: './detalle-pelicula.scss'
})
export class DetallePelicula implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly servicioPeliculas = inject(ServicioPeliculas);

  /** ID de la película obtenido de la URL */
  private idPelicula: string | null = null;

  // 1. Signals de estado principal
  readonly pelicula = signal<Pelicula | null>(null);
  readonly cargando = signal(true);
  readonly mensajeError = signal('');

  // 2. Determina si la película es un próximo estreno según la fecha local (AAAA-MM-DD)
  readonly esProximamente = computed<boolean>(() => {
    const p = this.pelicula();
    if (!p) {
      return false;
    }
    return p.fechaEstreno > this.obtenerFechaHoyLocal();
  });

  ngOnInit(): void {
    this.idPelicula = this.ruta.snapshot.paramMap.get('id');

    if (!this.idPelicula) {
      this.cargando.set(false);
      return;
    }

    void this.cargarPelicula(this.idPelicula);
  }

  /**
   * Consulta a Supabase los datos de la película mediante la consulta pública
   */
  async cargarPelicula(id: string): Promise<void> {
    this.cargando.set(true);
    this.mensajeError.set('');

    try {
      const peliculaRecuperada =
        await this.servicioPeliculas.obtenerPeliculaPublicaPorId(id);
      this.pelicula.set(peliculaRecuperada);
    } catch (error) {
      console.error('Error al cargar detalle de película:', error);
      this.mensajeError.set(
        'No pudimos cargar la información de la película. Por favor, reintentá en unos momentos.'
      );
    } finally {
      this.cargando.set(false);
    }
  }

  /**
   * Reintenta la carga si ocurrió un error de red o consulta
   */
  reintentar(): void {
    if (this.idPelicula) {
      void this.cargarPelicula(this.idPelicula);
    }
  }

  /**
   * Helper para obtener la fecha local AAAA-MM-DD sin desfase UTC
   */
  private obtenerFechaHoyLocal(): string {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  /**
   * Helper para formatear duración en horas y minutos (ej. 148 -> "2h 28m")
   */
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

  /**
   * Helper para formatear fecha AAAA-MM-DD a DD/MM/AAAA
   */
  formatearFecha(fechaIso: string): string {
    if (!fechaIso) {
      return 'Fecha a confirmar';
    }
    const partes = fechaIso.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fechaIso;
  }
}
