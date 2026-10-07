import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { TipoSangre } from '../../../../core/modelos/usuario';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';
import { ServicioPwa } from '../../../../core/servicios/servicio-pwa';
import { CabeceraCuenta } from '../../componentes/cabecera-cuenta/cabecera-cuenta';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CabeceraCuenta],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss'
})
export class Perfil implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly servicioAuth = inject(ServicioAuth);
  readonly servicioPwa = inject(ServicioPwa);

  readonly perfil = this.servicioAuth.perfilActual;
  readonly usuario = this.servicioAuth.usuarioActual;

  readonly guardando = signal<boolean>(false);
  readonly mensajeExito = signal<string | null>(null);
  readonly mensajeError = signal<string | null>(null);

  /** Signals de PWA */
  readonly puedeInstalarPwa = this.servicioPwa.puedeInstalar;
  readonly estaInstaladaPwa = this.servicioPwa.estaInstalada;
  readonly instalandoPwa = this.servicioPwa.instalando;

  readonly tiposSangre: TipoSangre[] = [
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-'
  ];

  readonly fechaMaximaHoy = new Date().toISOString().split('T')[0];

  perfilForm!: FormGroup;

  constructor() {
    // Sincronizar reactivamente el formulario cuando el perfil esté listo
    effect(() => {
      const p = this.perfil();
      if (p && this.perfilForm && !this.perfilForm.dirty) {
        this.cargarValoresEnFormulario();
      }
    });
  }

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarValoresEnFormulario();
  }

  private inicializarFormulario(): void {
    this.perfilForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      fechaNacimiento: ['', [Validators.required]],
      tipoSangre: ['O+' as TipoSangre, [Validators.required]],
      colorOjos: ['', [Validators.required, Validators.minLength(2)]],
      diasVacaciones: [
        0,
        [Validators.required, Validators.min(0), Validators.max(365)]
      ]
    });
  }

  private cargarValoresEnFormulario(): void {
    const p = this.perfil();
    if (!p) return;

    this.perfilForm.patchValue({
      nombre: p.nombre || '',
      apellido: p.apellido || '',
      fechaNacimiento: p.fechaNacimiento || '',
      tipoSangre: p.tipoSangre || 'O+',
      colorOjos: p.colorOjos || '',
      diasVacaciones: p.diasVacaciones ?? 0
    });
  }

  async guardarPerfil(): Promise<void> {
    this.mensajeExito.set(null);
    this.mensajeError.set(null);

    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      this.mensajeError.set(
        'Por favor, completá correctamente todos los campos obligatorios.'
      );
      return;
    }

    try {
      this.guardando.set(true);
      const v = this.perfilForm.value;

      await this.servicioAuth.actualizarPerfil({
        nombre: v.nombre,
        apellido: v.apellido,
        fechaNacimiento: v.fechaNacimiento,
        tipoSangre: v.tipoSangre,
        colorOjos: v.colorOjos,
        diasVacaciones: Number(v.diasVacaciones)
      });

      this.perfilForm.markAsPristine();
      this.mensajeExito.set('¡Tu información personal fue actualizada con éxito!');
    } catch (err: any) {
      console.error('Error al actualizar perfil:', err);
      this.mensajeError.set(
        err.message || 'Ocurrió un error al intentar guardar los cambios.'
      );
    } finally {
      this.guardando.set(false);
    }
  }

  restablecer(): void {
    this.cargarValoresEnFormulario();
    this.perfilForm.markAsPristine();
    this.mensajeExito.set(null);
    this.mensajeError.set(null);
  }

  async instalarPwa(): Promise<void> {
    await this.servicioPwa.instalarApp();
  }
}
