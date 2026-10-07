import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';

@Component({
  selector: 'app-cabecera-cuenta',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './cabecera-cuenta.html',
  styleUrl: './cabecera-cuenta.scss'
})
export class CabeceraCuenta {
  protected readonly servicioAuth = inject(ServicioAuth);

  @Input() titulo = 'Mi Cuenta';
  @Input() subtitulo?: string;

  readonly perfil = this.servicioAuth.perfilActual;
  readonly usuario = this.servicioAuth.usuarioActual;
  readonly esAdmin = this.servicioAuth.esAdmin;
  readonly esEmpleado = this.servicioAuth.esEmpleado;
}
