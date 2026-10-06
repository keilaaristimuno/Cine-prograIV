import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FuncionConDetalle } from '../../../../core/modelos/funcion';
import { Pelicula } from '../../../../core/modelos/pelicula';
import {
  ElegibilidadResena,
  ResumenResenasPelicula
} from '../../../../core/modelos/resena';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';
import { ServicioFunciones } from '../../../../core/servicios/servicio-funciones';
import { ServicioPeliculas } from '../../../../core/servicios/servicio-peliculas';
import { ServicioResenas } from '../../../../core/servicios/servicio-resenas';

export interface GrupoFuncionesDia {
  fechaKey: string;
  tituloDia: string;
  fechaLegible: string;
  funciones: FuncionConDetalle[];
}

@Component({
  selector: 'app-detalle-pelicula',
  imports: [RouterLink, FormsModule],
  templateUrl: './detalle-pelicula.html',
  styleUrl: './detalle-pelicula.scss'
})
export class DetallePelicula implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly servicioPeliculas = inject(ServicioPeliculas);
  private readonly servicioFunciones = inject(ServicioFunciones);
  readonly servicioAuth = inject(ServicioAuth);
  private readonly servicioResenas = inject(ServicioResenas);

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

  // 3. Signals de Reseñas y Calificaciones (M7)
  readonly resumenResenas = signal<ResumenResenasPelicula | null>(null);
  readonly cargandoResenas = signal(true);
  readonly errorResenas = signal('');

  readonly elegibilidad = signal<ElegibilidadResena | null>(null);
  readonly cargandoElegibilidad = signal(false);

  // Formulario interactivo de reseña
  readonly puntuacionForm = signal<number>(5);
  readonly puntuacionHover = signal<number>(0);
  readonly comentarioForm = signal<string>('');
  readonly guardandoResena = signal<boolean>(false);
  readonly errorFormResena = signal<string>('');
  readonly exitoFormResena = signal<string>('');

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
      this.cargandoResenas.set(false);
      return;
    }

    void this.cargarPelicula(this.idPelicula);
    void this.cargarFunciones(this.idPelicula);
    void this.cargarResenas(this.idPelicula);
    void this.cargarElegibilidad(this.idPelicula);
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
      void this.cargarResenas(this.idPelicula);
      void this.cargarElegibilidad(this.idPelicula);
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

  /**
   * Helper para formatear fecha ISO a formato local DD/MM/AAAA HH:MM
   */
  formatearFechaIso(fechaIso: string): string {
    if (!fechaIso) return '';
    const d = new Date(fechaIso);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Consulta a Supabase las reseñas y el promedio general de la película
   */
  async cargarResenas(id: string): Promise<void> {
    this.cargandoResenas.set(true);
    this.errorResenas.set('');

    try {
      const resumen = await this.servicioResenas.obtenerResenasPelicula(id);
      this.resumenResenas.set(resumen);
    } catch (error) {
      console.error('Error al cargar reseñas:', error);
      this.errorResenas.set('No pudimos cargar las opiniones de los espectadores.');
    } finally {
      this.cargandoResenas.set(false);
    }
  }

  /**
   * Verifica si el usuario actual cumple las condiciones para calificar
   */
  async cargarElegibilidad(id: string): Promise<void> {
    this.cargandoElegibilidad.set(true);

    try {
      await this.servicioAuth.asegurarSesionLista();

      if (!this.servicioAuth.estaAutenticado()) {
        this.elegibilidad.set({
          puedeResenar: false,
          motivo: 'no_autenticado',
          mensaje: 'Iniciá sesión como cliente para calificar y dejar tu opinión sobre esta película.',
          yaReseno: false,
          resenaExistente: null
        });
        return;
      }

      if (!this.servicioAuth.esCliente()) {
        this.elegibilidad.set({
          puedeResenar: false,
          motivo: 'rol_no_autorizado',
          mensaje: 'Solo los espectadores con perfil de cliente pueden calificar películas.',
          yaReseno: false,
          resenaExistente: null
        });
        return;
      }

      const res = await this.servicioResenas.verificarElegibilidad(id);
      this.elegibilidad.set(res);

      // Si el usuario ya contaba con una reseña previa, precargar los campos
      if (res.resenaExistente) {
        this.puntuacionForm.set(res.resenaExistente.puntuacion);
        this.comentarioForm.set(res.resenaExistente.comentario);
      }
    } catch (error) {
      console.error('Error al verificar elegibilidad de reseña:', error);
    } finally {
      this.cargandoElegibilidad.set(false);
    }
  }

  /**
   * Manejador del selector interactivo de estrellas
   */
  seleccionarPuntuacion(valor: number): void {
    this.puntuacionForm.set(valor);
    this.errorFormResena.set('');
  }

  establecerHover(valor: number): void {
    this.puntuacionHover.set(valor);
  }

  limpiarHover(): void {
    this.puntuacionHover.set(0);
  }

  /**
   * Valida y envía la reseña mediante RPC transaccional
   */
  async enviarResena(): Promise<void> {
    if (!this.idPelicula) return;

    this.errorFormResena.set('');
    this.exitoFormResena.set('');

    const puntuacion = this.puntuacionForm();
    const comentario = this.comentarioForm().trim();

    if (puntuacion < 1 || puntuacion > 5) {
      this.errorFormResena.set('Por favor seleccioná una puntuación de 1 a 5 estrellas.');
      return;
    }

    if (comentario.length < 10) {
      this.errorFormResena.set('El comentario debe contener al menos 10 caracteres.');
      return;
    }

    if (comentario.length > 1000) {
      this.errorFormResena.set('El comentario no puede superar los 1000 caracteres.');
      return;
    }

    this.guardandoResena.set(true);

    try {
      const resultado = await this.servicioResenas.guardarResena({
        peliculaId: this.idPelicula,
        puntuacion,
        comentario
      });

      if (!resultado.ok) {
        this.errorFormResena.set(resultado.mensaje || 'No se pudo guardar la reseña.');
        return;
      }

      this.exitoFormResena.set(resultado.mensaje);

      // Recargar listado de reseñas y estado de elegibilidad
      await this.cargarResenas(this.idPelicula);
      await this.cargarElegibilidad(this.idPelicula);
    } catch (error: any) {
      console.error('Error al guardar reseña:', error);
      this.errorFormResena.set(
        error.message || 'Ocurrió un error inesperado al publicar tu reseña.'
      );
    } finally {
      this.guardandoResena.set(false);
    }
  }
}
