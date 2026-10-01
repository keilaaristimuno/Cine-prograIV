import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatosNuevaSala, FormatoProyeccion } from '../../../../../core/modelos/sala';
import { ServicioSalas } from '../../../../../core/servicios/servicio-salas';

@Component({
  selector: 'app-formulario-sala',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './formulario-sala.html',
  styleUrl: './formulario-sala.scss'
})
export class FormularioSala implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly servicioSalas = inject(ServicioSalas);
  private readonly ruta = inject(ActivatedRoute);
  private readonly enrutador = inject(Router);

  private idSala: string | null = null;
  readonly modoEdicion = signal(false);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

  readonly formatosDisponibles: FormatoProyeccion[] = ['2D', '3D', '4D', '5D'];

  readonly formularioSala = this.fb.nonNullable.group({
    numero: [
      1,
      [Validators.required, Validators.min(1)]
    ],
    nombre: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(50)]
    ],
    formato: this.fb.nonNullable.control<FormatoProyeccion>(
      '2D',
      [Validators.required]
    ),
    estaActiva: [true]
  });

  ngOnInit(): void {
    const id = this.ruta.snapshot.paramMap.get('id');

    if (!id) {
      return;
    }

    this.idSala = id;
    this.modoEdicion.set(true);
    void this.cargarSala(id);
  }

  /**
   * Carga los datos de la sala en modo edición
   */
  private async cargarSala(id: string): Promise<void> {
    this.cargando.set(true);
    this.mensajeError.set('');

    try {
      const sala = await this.servicioSalas.obtenerSalaPorId(id);

      if (!sala) {
        this.mensajeError.set('La sala solicitada no existe o no fue encontrada.');
        return;
      }

      this.formularioSala.patchValue({
        numero: sala.numero,
        nombre: sala.nombre,
        formato: sala.formato,
        estaActiva: sala.estaActiva
      });
    } catch (error) {
      console.error('Error al cargar la sala:', error);
      this.mensajeError.set('No se pudo cargar la información de la sala.');
    } finally {
      this.cargando.set(false);
    }
  }

  /**
   * Envía los datos para guardar o actualizar la sala
   */
  async guardar(): Promise<void> {
    if (this.formularioSala.invalid) {
      this.formularioSala.markAllAsTouched();
      return;
    }

    const nombreLimpio = this.formularioSala.controls.nombre.value.trim();
    if (!nombreLimpio) {
      this.mensajeError.set('El nombre de la sala no puede contener únicamente espacios en blanco.');
      return;
    }

    this.guardando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    const datos: DatosNuevaSala = {
      numero: Number(this.formularioSala.controls.numero.value),
      nombre: nombreLimpio,
      formato: this.formularioSala.controls.formato.value,
      estaActiva: this.formularioSala.controls.estaActiva.value
    };

    try {
      if (this.modoEdicion() && this.idSala) {
        await this.servicioSalas.actualizarSala(this.idSala, datos);
        this.mensajeExito.set('La sala se actualizó correctamente. Redirigiendo...');
      } else {
        await this.servicioSalas.guardarSala(datos);
        this.mensajeExito.set('La sala se registró correctamente. Redirigiendo...');
      }

      window.setTimeout(() => {
        void this.enrutador.navigate(['/admin/salas']);
      }, 1000);
    } catch (error) {
      console.error('Error al guardar sala:', error);
      this.mensajeError.set(
        error instanceof Error ? error.message : 'Ocurrió un error inesperado al guardar la sala.'
      );
    } finally {
      this.guardando.set(false);
    }
  }
}
