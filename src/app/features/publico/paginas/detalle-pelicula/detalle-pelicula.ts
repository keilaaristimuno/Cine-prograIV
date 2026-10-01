import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FuncionConDetalle } from '../../../../core/modelos/funcion';
import { Pelicula } from '../../../../core/modelos/pelicula';
import { ServicioFunciones } from '../../../../core/servicios/servicio-funciones';
import { ServicioPeliculas } from '../../../../core/servicios/servicio-peliculas';

export interface GrupoFuncionesDia {
  fechaKey: string;
  tituloDia: string;
  fechaLegible: string;
  funciones: FuncionConDetalle[];
}

@Component({
  selector: 'app-detalle-pelicula',
  imports: [RouterLink],
  templateUrl: './detalle-pelicula.html',
  styleUrl: './detalle-pelicula.scss'
})
export class DetallePelicula implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly servicioPeliculas = inject(ServicioPeliculas);
  private readonly servicioFunciones = inject(ServicioFunciones);

  /** ID de la película obtenido de la URL */
  private idPelicula: string | null = null;

  // 1. Signals de estado principal de la película
  readonly pelicula = signal<Pelicula | null>(null);
  readonly cargando = signal(true);
  readonly mensajeError = signal('');

  // 2. Signals de estado de funciones disponibles
  readonly funciones = signal<FuncionConDetalle[]>([]);
  readonly cargandoFunciones = signal(true);
  readonly errorFunciones = signal('');

  // 3. Determina si la película es un próximo estreno según la fecha local (AAAA-MM-DD)
  readonly esProximamente = computed<boolean>(() => {
    const p = this.pelicula();
    if (!p) {
      return false;
    }
    return p.fechaEstreno > this.obtenerFechaHoyLocal();
  });

  // 4. Agrupa las funciones disponibles por día para la presentación visual
  readonly gruposFunciones = computed<GrupoFuncionesDia[]>(() => {
    const lista = this.funciones();
    if (lista.length === 0) {
      return [];
    }

    const mapa = new Map<string, GrupoFuncionesDia>();

    for (const funcion of lista) {
      const fecha = new Date(funcion.fechaHoraInicio);
      const anio = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      const fechaKey = `${anio}-${mes}-${dia}`;

      if (!mapa.has(fechaKey)) {
        mapa.set(fechaKey, {
          fechaKey,
          tituloDia: this.obtenerEtiquetaDia(fecha),
          fechaLegible: this.obtenerFechaLegible(fecha),
          funciones: []
        });
      }

      mapa.get(fechaKey)!.funciones.push(funcion);
    }

    return Array.from(mapa.values());
  });

  ngOnInit(): void {
    this.idPelicula = this.ruta.snapshot.paramMap.get('id');

    if (!this.idPelicula) {
      this.cargando.set(false);
      this.cargandoFunciones.set(false);
      return;
    }

    void this.cargarPelicula(this.idPelicula);
    void this.cargarFunciones(this.idPelicula);
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
      void this.cargarFunciones(this.idPelicula);
    }
  }

  /**
   * Consulta las funciones disponibles y futuras para esta película
   */
  async cargarFunciones(id: string): Promise<void> {
    this.cargandoFunciones.set(true);
    this.errorFunciones.set('');

    try {
      const lista =
        await this.servicioFunciones.obtenerFuncionesDisponiblesPorPelicula(id);
      this.funciones.set(lista);
    } catch (error) {
      console.error('Error al cargar funciones disponibles:', error);
      this.errorFunciones.set(
        'No pudimos cargar los horarios de las funciones. Podés reintentar.'
      );
    } finally {
      this.cargandoFunciones.set(false);
    }
  }

  /**
   * Reintenta exclusivamente la carga de funciones
   */
  reintentarFunciones(): void {
    if (this.idPelicula) {
      void this.cargarFunciones(this.idPelicula);
    }
  }

  /**
   * Helper para obtener la etiqueta de presentación del día (Hoy, Mañana o día completo)
   */
  private obtenerEtiquetaDia(fechaFuncion: Date): string {
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const dia = new Date(
      fechaFuncion.getFullYear(),
      fechaFuncion.getMonth(),
      fechaFuncion.getDate()
    );

    const msPorDia = 24 * 60 * 60 * 1000;
    const difDias = Math.round((dia.getTime() - hoy.getTime()) / msPorDia);

    if (difDias === 0) {
      return 'Hoy';
    }
    if (difDias === 1) {
      return 'Mañana';
    }

    const texto = dia.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  /**
   * Helper para obtener la fecha en formato legible DD/MM/AAAA
   */
  private obtenerFechaLegible(fechaFuncion: Date): string {
    return fechaFuncion.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Helper para formatear la hora en formato 24 horas HH:MM en hora local
   */
  formatearHora(fechaIso: string): string {
    const d = new Date(fechaIso);
    return d.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
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
