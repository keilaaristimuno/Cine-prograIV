import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivatedRoute, Router } from '@angular/router';
import { Cupones } from './cupones';
import { ServicioFidelizacion } from '../../../../core/servicios/servicio-fidelizacion';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';
import { CuponCliente } from '../../../../core/modelos/fidelizacion';

describe('Cupones Component (M8.1 Mis Cupones)', () => {
  let componente: Cupones;
  let mockServicioFidelizacion: {
    obtenerMisCupones: ReturnType<typeof vi.fn>;
  };
  let mockServicioAuth: {
    asegurarSesionLista: ReturnType<typeof vi.fn>;
    estaAutenticado: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    navigate: ReturnType<typeof vi.fn>;
  };

  const listaCupones: CuponCliente[] = [
    {
      id: 'cup-1',
      usuarioId: 'user-1',
      recompensaId: 'rec-1',
      codigoCupon: 'CP-AAAA-1111',
      tipo: 'entrada_gratis',
      valorBeneficio: 1,
      descripcion: 'Entrada 2D',
      origen: 'canje_puntos',
      estado: 'disponible',
      venceEn: '2099-01-01T00:00:00Z', // Futuro: disponible
      creadoEn: '2026-10-06T00:00:00Z'
    },
    {
      id: 'cup-2',
      usuarioId: 'user-1',
      recompensaId: 'rec-2',
      codigoCupon: 'CP-BBBB-2222',
      tipo: 'descuento_porcentual',
      valorBeneficio: 20,
      descripcion: '20% Candy',
      origen: 'canje_puntos',
      estado: 'utilizado',
      venceEn: '2099-01-01T00:00:00Z',
      utilizadoEn: '2026-10-06T12:00:00Z',
      creadoEn: '2026-10-06T00:00:00Z'
    },
    {
      id: 'cup-3',
      usuarioId: 'user-1',
      recompensaId: 'rec-3',
      codigoCupon: 'CP-CCCC-3333',
      tipo: 'descuento_monto_fijo',
      valorBeneficio: 1000,
      descripcion: '$1000 Descuento',
      origen: 'canje_puntos',
      estado: 'disponible',
      venceEn: '2020-01-01T00:00:00Z', // Pasado: funcionalmente vencido
      creadoEn: '2020-01-01T00:00:00Z'
    }
  ];

  beforeEach(() => {
    mockServicioFidelizacion = {
      obtenerMisCupones: vi.fn().mockResolvedValue(listaCupones)
    };

    mockServicioAuth = {
      asegurarSesionLista: vi.fn().mockResolvedValue(undefined),
      estaAutenticado: vi.fn().mockReturnValue(true)
    };

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true)
    };

    TestBed.configureTestingModule({
      providers: [
        Cupones,
        { provide: ServicioFidelizacion, useValue: mockServicioFidelizacion },
        { provide: ServicioAuth, useValue: mockServicioAuth },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: {} }
      ]
    });

    componente = TestBed.inject(Cupones);
  });

  it('debe crearse correctamente', () => {
    expect(componente).toBeTruthy();
  });

  it('debe redirigir al login si el usuario no está autenticado', async () => {
    mockServicioAuth.estaAutenticado.mockReturnValue(false);

    await componente.inicializar();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/iniciar-sesion'], {
      queryParams: { redirect: '/mi-cuenta/cupones' }
    });
    expect(mockServicioFidelizacion.obtenerMisCupones).not.toHaveBeenCalled();
  });

  it('debe cargar los cupones del usuario', async () => {
    await componente.cargarCupones();

    expect(mockServicioFidelizacion.obtenerMisCupones).toHaveBeenCalled();
    expect(componente.cupones().length).toBe(3);
    expect(componente.cargando()).toBe(false);
  });

  it('debe filtrar cupones según su estado efectivo', async () => {
    await componente.cargarCupones();

    // Filtro todos
    componente.filtroSeleccionado.set('todos');
    expect(componente.cuponesFiltrados().length).toBe(3);

    // Filtro disponible (solo cup-1 no vencido y no utilizado)
    componente.filtroSeleccionado.set('disponible');
    expect(componente.cuponesFiltrados().length).toBe(1);
    expect(componente.cuponesFiltrados()[0].id).toBe('cup-1');

    // Filtro utilizado
    componente.filtroSeleccionado.set('utilizado');
    expect(componente.cuponesFiltrados().length).toBe(1);
    expect(componente.cuponesFiltrados()[0].id).toBe('cup-2');

    // Filtro vencido (cup-3 cuya fecha ya pasó)
    componente.filtroSeleccionado.set('vencido');
    expect(componente.cuponesFiltrados().length).toBe(1);
    expect(componente.cuponesFiltrados()[0].id).toBe('cup-3');
  });

  it('debe copiar el código al portapapeles', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });

    await componente.copiarCodigo('CP-AAAA-1111');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('CP-AAAA-1111');
    expect(componente.codigoCopiado()).toBe('CP-AAAA-1111');
  });
});
