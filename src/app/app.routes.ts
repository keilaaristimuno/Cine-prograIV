import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import(
        './features/publico/layouts/public-layout/public-layout'
      ).then(m => m.PublicLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import(
            './features/publico/paginas/cartelera/cartelera'
          ).then(m => m.Cartelera)
      },
      {
        path: 'pelicula/:id',
        loadComponent: () =>
          import(
            './features/publico/paginas/detalle-pelicula/detalle-pelicula'
          ).then(m => m.DetallePelicula)
      },
      {
        path: 'funcion/:id/butacas',
        loadComponent: () =>
          import(
            './features/publico/paginas/seleccion-butacas/seleccion-butacas'
          ).then(m => m.SeleccionButacas)
      }
    ]
  },
  {
    path: 'iniciar-sesion',
    loadComponent: () =>
      import(
        './features/autenticacion/paginas/inicio-sesion/inicio-sesion')
          .then(m => m.InicioSesion)
  },
  {
    path: 'registrarse',
    loadComponent: () =>
      import(
        './features/autenticacion/paginas/registro/registro'
      ).then(m => m.Registro)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
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
      },
      {
        path: 'peliculas/editar/:id',
        loadComponent: () =>
          import(
            './features/admin/pages/peliculas/formulario-pelicula/formulario-pelicula'
          ).then(m => m.FormularioPelicula)
      },
      {
        path: 'salas',
        loadComponent: () =>
          import('./features/admin/pages/salas/listado-salas/listado-salas')
            .then(m => m.ListadoSalas)
      },
      {
        path: 'salas/nueva',
        loadComponent: () =>
          import('./features/admin/pages/salas/formulario-sala/formulario-sala')
            .then(m => m.FormularioSala)
      },
      {
        path: 'salas/editar/:id',
        loadComponent: () =>
          import('./features/admin/pages/salas/formulario-sala/formulario-sala')
            .then(m => m.FormularioSala)
      },
      {
        path: 'salas/:id/butacas',
        loadComponent: () =>
          import('./features/admin/pages/salas/mapa-sala/mapa-sala')
            .then(m => m.MapaSala)
      },
      {
        path: 'funciones',
        loadComponent: () =>
          import('./features/admin/pages/funciones/listado-funciones/listado-funciones')
            .then(m => m.ListadoFunciones)
      },
      {
        path: 'funciones/nueva',
        loadComponent: () =>
          import('./features/admin/pages/funciones/formulario-funcion/formulario-funcion')
            .then(m => m.FormularioFuncion)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
