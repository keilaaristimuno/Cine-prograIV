import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormatoProyeccion, Sala } from '../../../../../core/modelos/sala';
import { Pelicula } from '../../../../../core/modelos/pelicula';
import { ServicioFunciones } from '../../../../../core/servicios/servicio-funciones';
import { ServicioPeliculas } from '../../../../../core/servicios/servicio-peliculas';

@Component({
  selector: 'app-formulario-funcion',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './formulario-funcion.html',
  styleUrl: './formulario-funcion.scss'
})
export class FormularioFuncion implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly servicioFunciones = inject(ServicioFunciones);
  private readonly servicioPeliculas = inject(ServicioPeliculas);
  private readonly enrutador = inject(Router);

  readonly peliculas = signal<Pelicula[]>([]);
  readonly cargandoPeliculas = signal(true);
  readonly guardando = signal(false);
  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');
  readonly salaAsignada = signal<Sala | null>(null);

  readonly formatosDisponibles: FormatoProyeccion[] = ['2D', '3D', '4D', '5D'];

  readonly peliculaIdSeleccionada = signal<string>('');
  readonly peliculaSeleccionada = computed(() => {
    const id = this.peliculaIdSeleccionada();
    return this.peliculas().find(p => p.id === id) ?? null;
  });

  // Fecha mínima para el input datetime-local (momento actual local)
  readonly fechaMinima = this.obtenerFechaMinimaInput();

  readonly formularioFuncion = this.fb.nonNullable.group({
    peliculaId: ['', [Validators.required]],
    fechaHoraInicio: ['', [Validators.required]],
    formato: this.fb.nonNullable.control<FormatoProyeccion>('2D', [
      Validators.required
    ])
  });

  ngOnInit(): void {
    void this.cargarPeliculas();
  }

  /**
   * Carga únicamente las películas activas para programar funciones
   */
  async cargarPeliculas(): Promise<void> {
    this.cargandoPeliculas.set(true);
    this.mensajeError.set('');

    try {
      const lista = await this.servicioPeliculas.obtenerPeliculas();
      // Filtrar películas activas y ordenar alfabéticamente
      const activas = lista
        .filter(p => p.estaActiva)
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

      this.peliculas.set(activas);

      if (activas.length === 0) {
        this.mensajeError.set(
          'No hay películas activas registradas. Para programar una función primero debés activar o dar de alta una película.'
        );
      }
    } catch (error) {
      console.error('Error al cargar películas para funciones:', error);
      this.mensajeError.set('No se pudieron cargar las películas disponibles.');
    } finally {
      this.cargandoPeliculas.set(false);
    }
  }

  /**
   * Actualiza la película seleccionada para previsualizar detalles
   */
  onPeliculaChange(): void {
    const id = this.formularioFuncion.controls.peliculaId.value;
    this.peliculaIdSeleccionada.set(id);
  }

  /**
   * Envía los datos para la asignación automática y guardado de la función
   */
  async guardar(): Promise<void> {
    if (this.formularioFuncion.invalid) {
      this.formularioFuncion.markAllAsTouched();
      return;
    }

    const { peliculaId, fechaHoraInicio, formato } =
      this.formularioFuncion.getRawValue();

    // Validación de fecha no pasada
    const fechaInicioIso = this.convertirDatetimeLocalAIso(fechaHoraInicio);
    const timestampInicio = new Date(fechaInicioIso).getTime();

    // Margen de 1 minuto de tolerancia respecto a la hora actual
    if (timestampInicio < Date.now() - 60000) {
      this.mensajeError.set(
        'La fecha y hora de inicio no puede ser anterior al momento actual.'
      );
      return;
    }

    this.guardando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.salaAsignada.set(null);

    try {
      const resultado = await this.servicioFunciones.programarFuncion({
        peliculaId,
        fechaHoraInicio: fechaInicioIso,
        formato
      });

      this.salaAsignada.set(resultado.salaAsignada);
      this.mensajeExito.set(
        `¡Función programada con éxito! Se asignó automáticamente la "${resultado.salaAsignada.nombre}" (Sala #${resultado.salaAsignada.numero}, formato ${resultado.salaAsignada.formato}).`
      );

      // Deshabilitar formulario tras éxito
      this.formularioFuncion.disable();

      window.setTimeout(() => {
        void this.enrutador.navigate(['/admin/funciones']);
      }, 2000);
    } catch (error) {
      console.error('Error al programar función:', error);
      this.mensajeError.set(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado al programar la función.'
      );
    } finally {
      this.guardando.set(false);
    }
  }

  /**
   * Convierte un valor de input datetime-local (YYYY-MM-DDTHH:mm) en un ISO string UTC
   * garantizando que la hora ingresada localmente se respete sin desfasaje horario.
   */
  private convertirDatetimeLocalAIso(valorLocal: string): string {
    const [fecha, hora] = valorLocal.split('T');
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const [horas, minutos] = hora.split(':').map(Number);

    const fechaLocal = new Date(anio, mes - 1, dia, horas, minutos, 0, 0);
    return fechaLocal.toISOString();
  }

  /**
   * Genera el string con formato YYYY-MM-DDTHH:mm en hora local para el atributo min
   */
  private obtenerFechaMinimaInput(): string {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    return `${anio}-${mes}-${dia}T${horas}:${minutos}`;
  }
}
