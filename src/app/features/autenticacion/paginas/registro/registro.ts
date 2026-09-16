import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ServicioSupabase } from '../../../../core/servicios/servicio-supabase';


@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-registro',
  styleUrl: './registro.scss',
  templateUrl: './registro.html',
})
export class Registro {
  private readonly constructorFormularios =
    inject(FormBuilder);

  private readonly servicioSupabase =
    inject(ServicioSupabase);

  private readonly enrutador =
    inject(Router);

  readonly cargando = signal(false);
  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

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
      repetirContrasenia
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
      const sesionCreada =
        await this.servicioSupabase.registrarUsuario(
          correo,
          contrasenia
        );

      if (sesionCreada) {
        await this.enrutador.navigate(['/admin']);
        return;
      }

      this.mensajeExito.set(
        'Cuenta creada. Revisá tu correo para confirmarla.'
      );
    } catch (error) {
      console.error('Error durante el registro:', error);

      this.mensajeError.set(
        'No se pudo crear la cuenta.'
      );
    } finally {
      this.cargando.set(false);
    }
  }
}
