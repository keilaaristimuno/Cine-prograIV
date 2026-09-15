import { Routes } from '@angular/router';
import { InicioSesion } from './features/autenticacion/paginas/inicio-sesion/inicio-sesion';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'admin',
    pathMatch: 'full'
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/layouts/admin-layout/admin-layout')
        .then(m => m.AdminLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/pages/dashboard-admin/dashboard-admin')
            .then(m => m.DashboardAdmin)
      },
      {
        path: 'peliculas',
        loadComponent: () =>
          import('./features/admin/pages/peliculas/listado-peliculas/listado-peliculas')
            .then(m => m.ListadoPeliculas)
      },
      {
        path: 'peliculas/nueva',
        loadComponent: () =>
          import('./features/admin/pages/peliculas/formulario-pelicula/formulario-pelicula')
            .then(m => m.FormularioPelicula)
      }
    ]
  },
  {
    path: 'administracion/iniciar-sesion',
    loadComponent: () =>
      import(
        './features/autenticacion/paginas/inicio-sesion/inicio-sesion')
          .then(m => m.InicioSesion)
  },
  {
    path: '**',
    redirectTo: 'admin'
  }
];
