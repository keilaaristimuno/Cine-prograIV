import { Component, inject } from '@angular/core';
import {FormBuilder, ReactiveFormsModule,Validators} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  ServicioSupabase
} from '../../../../core/servicios/servicio-supabase';

@Component({
  selector: 'app-inicio-sesion',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './inicio-sesion.html',
  styleUrl: './inicio-sesion.scss'
})
export class InicioSesion {
  private readonly constructorFormularios = inject(FormBuilder);
  private readonly servicioSupabase = inject(ServicioSupabase);
  private readonly enrutador = inject(Router);

  cargando = false;
  mensajeError = '';

  readonly formularioInicioSesion =
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
      ]
    });

  async iniciarSesion(): Promise<void> {
    if (this.formularioInicioSesion.invalid) {
      this.formularioInicioSesion.markAllAsTouched();
      return;
    }

    this.cargando = true;
    this.mensajeError = '';

    const { correo, contrasenia } =
      this.formularioInicioSesion.getRawValue();

    try {
      await this.servicioSupabase.iniciarSesion(
        correo,
        contrasenia
      );

      await this.enrutador.navigate([
        '/admin/peliculas'
      ]);
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      
      this.mensajeError =
        'El correo o la contraseña son incorrectos.';
    } finally {
      this.cargando = false;
    }
  }
}