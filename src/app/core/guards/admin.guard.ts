import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ServicioAuth } from '../servicios/servicio-auth';

/* adminGuard es una función que cumple con el guard CanActivate funcional */
export const adminGuard: CanActivateFn = async (_route, _state) => {
  const servicioAuth = inject(ServicioAuth);
  const router = inject(Router);

  await servicioAuth.asegurarSesionLista();

  if (servicioAuth.esAdmin()) {
    return true;
  }

  // Si no es administrador o no tiene sesión activa, bloquear acceso
  return router.createUrlTree(['/iniciar-sesion'], {
    queryParams: { accesoDenegado: 'true' }
  });
};
