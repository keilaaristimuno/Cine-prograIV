import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../../../core/modelos/pelicula';
import { PeliculaRanking } from '../../../../core/modelos/resena';
import { ServicioPeliculas } from '../../../../core/servicios/servicio-peliculas';
import { ServicioResenas } from '../../../../core/servicios/servicio-resenas';
import { TarjetaPelicula } from '../../componentes/tarjeta-pelicula/tarjeta-pelicula';

@Component({
  selector: 'app-cartelera',
  imports: [TarjetaPelicula, RouterLink],
  templateUrl: './cartelera.html',
  styleUrl: './cartelera.scss'
})
export class Cartelera implements OnInit {
  private readonly servicioPeliculas = inject(ServicioPeliculas);
  private readonly servicioResenas = inject(ServicioResenas);

  /** Lista predefinida de géneros del sistema */
  readonly generosDisponibles: string[] = [
    'Acción',
    'Animación',
    'Aventura',
    'Ciencia ficción',
    'Comedia',
    'Drama',
    'Fantasía',
    'Terror'
  ];

  // 1. Estado principal (única fuente de la verdad desde Supabase)
  readonly peliculas = signal<Pelicula[]>([]);
  readonly cargando = signal(true);
  readonly mensajeError = signal('');

  // 2. Filtros locales en memoria
  readonly textoBusqueda = signal('');
  readonly generosSeleccionados = signal<string[]>([]);

  // 3. Separación cronológica basada en el día LOCAL del usuario (AAAA-MM-DD)
  readonly peliculasEnCartelera = computed<Pelicula[]>(() => {
    const hoy = this.obtenerFechaHoyLocal();
    return this.peliculas().filter(p => p.fechaEstreno <= hoy);
  });

  readonly peliculasProximamente = computed<Pelicula[]>(() => {
    const hoy = this.obtenerFechaHoyLocal();
    return this.peliculas().filter(p => p.fechaEstreno > hoy);
  });

  // 4. Hero y Destacadas: derivados exclusivamente de las películas actualmente en cartelera
  readonly peliculaHero = computed<Pelicula | null>(
    () => this.peliculasEnCartelera()[0] ?? null
  );

  readonly peliculasDestacadas = computed<Pelicula[]>(
    () => this.peliculasEnCartelera().slice(0, 3)
  );

  // 5. Catálogo filtrado por buscador (nombre) y multigénero (semántica OR)
  readonly peliculasFiltradas = computed<Pelicula[]>(() => {
    const query = this.textoBusqueda().trim().toLowerCase();
    const generos = this.generosSeleccionados();
    const catalogo = this.peliculasEnCartelera();

    return catalogo.filter(pelicula => {
      // Coincidencia por nombre (case-insensitive)
      const coincideTexto =
        !query || pelicula.nombre.toLowerCase().includes(query);

      // Coincidencia multigénero (OR: coincide con al menos uno si hay filtros activos)
      const coincideGenero =
        generos.length === 0 ||
        pelicula.generos.some(g => generos.includes(g));

      // Se combinan mediante AND
      return coincideTexto && coincideGenero;
    });
  });

  // Signals del Ranking Top 3 (M7)
  readonly top3Peliculas = signal<PeliculaRanking[]>([]);
  readonly cargandoTop3 = signal(true);

  ngOnInit(): void {
    void this.cargarCartelera();
    void this.cargarTop3();
  }

  /**
   * Consulta a Supabase las 3 películas mejor calificadas por los espectadores
   */
  async cargarTop3(): Promise<void> {
    this.cargandoTop3.set(true);

    try {
      const top3 = await this.servicioResenas.obtenerTop3Peliculas();
      this.top3Peliculas.set(top3);
    } catch (error) {
      console.error('Error al cargar Top 3 de películas:', error);
      this.top3Peliculas.set([]);
    } finally {
      this.cargandoTop3.set(false);
    }
  }

  /**
   * Consulta única a Supabase para obtener todas las películas activas
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

  /**
   * Obtiene la fecha actual en formato local AAAA-MM-DD sin desfase UTC
   */
  private obtenerFechaHoyLocal(): string {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  /**
   * Actualiza el signal de búsqueda por texto
   */
  actualizarBusqueda(valor: string): void {
    this.textoBusqueda.set(valor);
  }

  /**
   * Alterna la selección de un género (agrega o remueve)
   */
  alternarGenero(genero: string): void {
    this.generosSeleccionados.update(actuales => {
      if (actuales.includes(genero)) {
        return actuales.filter(g => g !== genero);
      }
      return [...actuales, genero];
    });
  }

  /**
   * Limpia la selección de géneros (equivale a "Todos")
   */
  limpiarGeneros(): void {
    this.generosSeleccionados.set([]);
  }

  /**
   * Limpia tanto el buscador como los géneros
   */
  limpiarFiltros(): void {
    this.textoBusqueda.set('');
    this.generosSeleccionados.set([]);
  }

  /**
   * Formatea la duración en horas y minutos para el Hero (ej. 148 -> "2h 28m")
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
}
