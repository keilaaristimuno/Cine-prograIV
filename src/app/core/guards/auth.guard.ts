import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ServicioAuth } from '../servicios/servicio-auth';

/**
 * Guard funcional para proteger las rutas del Área Cliente (/mi-cuenta/*).
 * Permite el acceso únicamente a usuarios con sesión activa autenticada.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const servicioAuth = inject(ServicioAuth);
  const router = inject(Router);

  await servicioAuth.asegurarSesionLista();

  if (servicioAuth.estaAutenticado()) {
    return true;
  }

  // Si no cuenta con sesión activa, redirigir al inicio de sesión
  return router.createUrlTree(['/iniciar-sesion'], {
    queryParams: { redirectUrl: state.url }
  });
};
