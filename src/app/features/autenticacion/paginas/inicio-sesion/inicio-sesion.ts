import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';

@Component({
  selector: 'app-inicio-sesion',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './inicio-sesion.html',
  styleUrl: './inicio-sesion.scss'
})
export class InicioSesion implements OnInit {
  private readonly constructorFormularios = inject(FormBuilder);
  private readonly servicioAuth = inject(ServicioAuth);
  private readonly enrutador = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  readonly cargando = signal(false);
  readonly mensajeError = signal('');
  readonly mensajeInfo = signal('');

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

  ngOnInit(): void {
    const accesoDenegado =
      this.ruta.snapshot.queryParamMap.get('accesoDenegado');
    if (accesoDenegado) {
      this.mensajeError.set(
        'Acceso restringido: no contás con los permisos necesarios para ingresar a esa sección.'
      );
    }
  }

  async iniciarSesion(): Promise<void> {
    if (this.formularioInicioSesion.invalid) {
      this.formularioInicioSesion.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set('');
    this.mensajeInfo.set('');

    const { correo, contrasenia } =
      this.formularioInicioSesion.getRawValue();

    try {
      const perfil = await this.servicioAuth.iniciarSesion(
        correo,
        contrasenia
      );

      if (perfil?.rol === 'administrador') {
        await this.enrutador.navigate(['/admin/peliculas']);
        return;
      }

      if (perfil?.rol === 'empleado') {
        await this.enrutador.navigate(['/empleado/validar-entrada']);
        return;
      }

      // Rol cliente: redirige a la cartelera pública
      if (perfil?.rol === 'cliente') {
        await this.enrutador.navigate(['/']);
        return;
      }

    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      this.mensajeError.set(
        'El correo o la contraseña son incorrectos.'
      );
    } finally {
      this.cargando.set(false);
    }
  }
}