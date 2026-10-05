import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ServicioAuth } from '../servicios/servicio-auth';

/**
 * Guard funcional para proteger las rutas del sector /empleado.
 * Permite el acceso únicamente a usuarios con rol 'empleado' o 'administrador'.
 */
export const empleadoGuard: CanActivateFn = async (_route, _state) => {
  const servicioAuth = inject(ServicioAuth);
  const router = inject(Router);

  await servicioAuth.asegurarSesionLista();

  if (servicioAuth.esEmpleado() || servicioAuth.esAdmin()) {
    return true;
  }

  // Si no cuenta con rol empleado o administrador, redirigir al login
  return router.createUrlTree(['/iniciar-sesion'], {
    queryParams: { accesoDenegado: 'true' }
  });
};
