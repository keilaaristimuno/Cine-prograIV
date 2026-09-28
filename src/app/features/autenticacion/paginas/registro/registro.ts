import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TipoSangre } from '../../../../core/modelos/usuario';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';

function validadorFechaNoFutura(
  control: AbstractControl
): ValidationErrors | null {
  if (!control.value) {
    return null;
  }
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  if (control.value > hoyStr) {
    return { fechaFutura: true };
  }
  return null;
}

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-registro',
  styleUrl: './registro.scss',
  templateUrl: './registro.html'
})
export class Registro {
  private readonly constructorFormularios = inject(FormBuilder);
  private readonly servicioAuth = inject(ServicioAuth);

  readonly cargando = signal(false);
  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

  readonly fechaMaxima: string = (() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  })();

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

  readonly coloresOjos: string[] = [
    'Marrones',
    'Azules',
    'Verdes',
    'Miel',
    'Grises',
    'Negros'
  ];

  readonly formularioRegistro =
    this.constructorFormularios.nonNullable.group({
      correo: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],
      contrasenia: [
        '',
        [
          Validators.required,
          Validators.minLength(6)
        ]
      ],
      repetirContrasenia: [
        '',
        Validators.required
      ],
      nombre: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50)
        ]
      ],
      apellido: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50)
        ]
      ],
      fechaNacimiento: [
        '',
        [
          Validators.required,
          validadorFechaNoFutura
        ]
      ],
      tipoSangre: this.constructorFormularios.nonNullable.control<TipoSangre>(
        'O+',
        Validators.required
      ),
      colorOjos: [
        'Marrones',
        Validators.required
      ],
      diasVacaciones: [
        14,
        [
          Validators.required,
          Validators.min(0),
          Validators.max(365)
        ]
      ]
    });

  async registrarse(): Promise<void> {
    if (this.formularioRegistro.invalid) {
      this.formularioRegistro.markAllAsTouched();
      return;
    }

    const {
      correo,
      contrasenia,
      repetirContrasenia,
      nombre,
      apellido,
      fechaNacimiento,
      tipoSangre,
      colorOjos,
      diasVacaciones
    } = this.formularioRegistro.getRawValue();

    if (contrasenia !== repetirContrasenia) {
      this.mensajeError.set(
        'Las contraseñas no coinciden.'
      );
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    try {
      const resultado = await this.servicioAuth.registrarse({
        correo,
        contrasenia,
        nombre,
        apellido,
        fechaNacimiento,
        tipoSangre,
        colorOjos,
        diasVacaciones
      });

      if (resultado.sesionIniciada) {
        this.mensajeExito.set(
          '¡Cuenta creada con éxito! Tu sesión ha sido iniciada con rol de cliente.'
        );
      } else {
        this.mensajeExito.set(
          '¡Cuenta creada con éxito! Si tu cuenta requiere confirmación, revisá tu casilla de correo.'
        );
      }

      this.formularioRegistro.reset({
        correo: '',
        contrasenia: '',
        repetirContrasenia: '',
        nombre: '',
        apellido: '',
        fechaNacimiento: '',
        tipoSangre: 'O+',
        colorOjos: 'Marrones',
        diasVacaciones: 14
      });
    } catch (error: unknown) {
      console.error('Error durante el registro:', error);
      const err = error as { message?: string };
      this.mensajeError.set(
        err?.message ?? 'No se pudo crear la cuenta.'
      );
    } finally {
      this.cargando.set(false);
    }
  }
}
