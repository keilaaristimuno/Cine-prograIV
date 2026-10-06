import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.scss'
})
export class PublicLayout {
  private readonly servicioAuth = inject(ServicioAuth);
  private readonly enrutador = inject(Router);

  // Signals derivados reactivamente de ServicioAuth
  readonly estaAutenticado = this.servicioAuth.estaAutenticado;
  readonly esAdmin = this.servicioAuth.esAdmin;
  readonly esEmpleado = this.servicioAuth.esEmpleado;
  readonly usuario = this.servicioAuth.usuarioActual;
  readonly perfil = this.servicioAuth.perfilActual;

  /** Cierra la sesión activa y mantiene al visitante en la cartelera pública*/
  async cerrarSesion(): Promise<void> {
    try {
      await this.servicioAuth.cerrarSesion();
    } finally {
      await this.enrutador.navigate(['/']);
    }
  }
}
