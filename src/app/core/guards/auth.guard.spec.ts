import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { authGuard } from './auth.guard';
import { ServicioAuth } from '../servicios/servicio-auth';

describe('authGuard', () => {
  let mockServicioAuth: {
    asegurarSesionLista: ReturnType<typeof vi.fn>;
    estaAutenticado: ReturnType<typeof vi.fn>;
  };

  let mockRouter: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockServicioAuth = {
      asegurarSesionLista: vi.fn().mockResolvedValue(undefined),
      estaAutenticado: vi.fn().mockReturnValue(false)
    };

    mockRouter = {
      createUrlTree: vi.fn().mockImplementation((path, extras) => ({ path, extras }))
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ServicioAuth, useValue: mockServicioAuth },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  it('debe permitir el acceso si el usuario está autenticado', async () => {
    mockServicioAuth.estaAutenticado.mockReturnValue(true);

    const resultado = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/mi-cuenta/perfil' } as any)
    );

    expect(resultado).toBe(true);
  });

  it('debe bloquear el acceso y redirigir a /iniciar-sesion si el usuario es anónimo', async () => {
    mockServicioAuth.estaAutenticado.mockReturnValue(false);

    const resultado = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/mi-cuenta/perfil' } as any)
    );

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
      ['/iniciar-sesion'],
      { queryParams: { redirectUrl: '/mi-cuenta/perfil' } }
    );
    expect(resultado).toEqual({
      path: ['/iniciar-sesion'],
      extras: { queryParams: { redirectUrl: '/mi-cuenta/perfil' } }
    });
  });
});
