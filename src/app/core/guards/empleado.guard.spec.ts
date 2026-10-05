import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { empleadoGuard } from './empleado.guard';
import { ServicioAuth } from '../servicios/servicio-auth';

describe('empleadoGuard (M5.4)', () => {
  let mockServicioAuth: {
    asegurarSesionLista: ReturnType<typeof vi.fn>;
    esEmpleado: ReturnType<typeof vi.fn>;
    esAdmin: ReturnType<typeof vi.fn>;
  };

  let mockRouter: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockServicioAuth = {
      asegurarSesionLista: vi.fn().mockResolvedValue(undefined),
      esEmpleado: vi.fn().mockReturnValue(false),
      esAdmin: vi.fn().mockReturnValue(false)
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

  it('debe permitir el acceso si el usuario tiene rol empleado', async () => {
    mockServicioAuth.esEmpleado.mockReturnValue(true);

    const resultado = await TestBed.runInInjectionContext(() =>
      empleadoGuard({} as any, {} as any)
    );

    expect(resultado).toBe(true);
  });

  it('debe permitir el acceso si el usuario tiene rol administrador', async () => {
    mockServicioAuth.esAdmin.mockReturnValue(true);

    const resultado = await TestBed.runInInjectionContext(() =>
      empleadoGuard({} as any, {} as any)
    );

    expect(resultado).toBe(true);
  });

  it('debe bloquear el acceso y redirigir con accesoDenegado si es cliente o anónimo', async () => {
    mockServicioAuth.esEmpleado.mockReturnValue(false);
    mockServicioAuth.esAdmin.mockReturnValue(false);

    const resultado = await TestBed.runInInjectionContext(() =>
      empleadoGuard({} as any, {} as any)
    );

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
      ['/iniciar-sesion'],
      { queryParams: { accesoDenegado: 'true' } }
    );
    expect(resultado).toEqual({
      path: ['/iniciar-sesion'],
      extras: { queryParams: { accesoDenegado: 'true' } }
    });
  });
});
