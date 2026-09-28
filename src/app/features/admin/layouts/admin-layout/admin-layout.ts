import { Component, inject } from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-admin-layout',
  styleUrl: './admin-layout.scss',
  templateUrl: './admin-layout.html'
})
export class AdminLayout {
  private readonly servicioAuth = inject(ServicioAuth);

  readonly usuario = this.servicioAuth.usuarioActual;
  readonly perfil = this.servicioAuth.perfilActual;

  async cerrarSesion(): Promise<void> {
    await this.servicioAuth.cerrarSesion();
  }
}
