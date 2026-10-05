import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';

@Component({
  selector: 'app-empleado-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './empleado-layout.html',
  styleUrl: './empleado-layout.scss'
})
export class EmpleadoLayout {
  private readonly servicioAuth = inject(ServicioAuth);

  readonly usuario = this.servicioAuth.usuarioActual;
  readonly perfil = this.servicioAuth.perfilActual;
  readonly esAdmin = this.servicioAuth.esAdmin;

  async cerrarSesion(): Promise<void> {
    await this.servicioAuth.cerrarSesion();
  }
}
