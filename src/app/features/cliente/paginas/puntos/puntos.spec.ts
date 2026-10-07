import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivatedRoute, Router } from '@angular/router';
import { Puntos } from './puntos';
import { ServicioFidelizacion } from '../../../../core/servicios/servicio-fidelizacion';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';
import { PanelFidelizacionCliente, Recompensa } from '../../../../core/modelos/fidelizacion';

describe('Puntos Component (M8.1 Portal Cliente)', () => {
  let componente: Puntos;
  let mockServicioFidelizacion: {
    obtenerMiFidelizacion: ReturnType<typeof vi.fn>;
    canjearRecompensa: ReturnType<typeof vi.fn>;
  };
  let mockServicioAuth: {
    asegurarSesionLista: ReturnType<typeof vi.fn>;
    estaAutenticado: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    navigate: ReturnType<typeof vi.fn>;
  };

  const mockPanel: PanelFidelizacionCliente = {
    ok: true,
    saldoPuntos: 3500,
    pesosPorPunto: 1,
    fidelizacionActiva: true,
    recompensas: [
      {
        id: 'rec-1',
        nombre: 'Entrada General 2D Gratis',
        descripcion: 'Canjeá una entrada para sala tradicional',
        costoPuntos: 1200,
        tipo: 'entrada_gratis',
        valorBeneficio: 1,
        diasValidez: 30,
        activa: true,
        creadoEn: '2026-10-06T00:00:00Z'
      },
      {
        id: 'rec-2',
        nombre: '25% Descuento Candy Bar',
        descripcion: 'Descuento para cualquier combo',
        costoPuntos: 800,
        tipo: 'descuento_porcentual',
        valorBeneficio: 25,
        diasValidez: 15,
        activa: true,
        creadoEn: '2026-10-06T00:00:00Z'
      }
    ],
    movimientos: [
      {
        id: 'mov-1',
        tipoMovimiento: 'acreditacion_compra_cine',
        puntos: 1500,
        saldoResultante: 3500,
        motivo: 'Puntos ganados por compra cine',
        creadoEn: '2026-10-06T10:00:00Z'
      }
    ],
    cupones: []
  };

  beforeEach(() => {
    mockServicioFidelizacion = {
      obtenerMiFidelizacion: vi.fn().mockResolvedValue(mockPanel),
      canjearRecompensa: vi.fn().mockResolvedValue({
        ok: true,
        mensaje: 'Canje exitoso',
        nuevoSaldo: 2300,
        puntosCanjeados: 1200,
        cupon: {
          id: 'cup-1',
          codigoCupon: 'CP-ABCD-1234',
          tipo: 'entrada_gratis',
          valorBeneficio: 1,
          descripcion: 'Entrada General 2D Gratis',
          origen: 'canje_puntos',
          estado: 'disponible',
          creadoEn: '2026-10-06T00:00:00Z',
          venceEn: '2026-11-06T00:00:00Z'
        }
      })
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
        Puntos,
        { provide: ServicioFidelizacion, useValue: mockServicioFidelizacion },
        { provide: ServicioAuth, useValue: mockServicioAuth },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: {} }
      ]
    });

    componente = TestBed.inject(Puntos);
  });

  it('debe crearse correctamente', () => {
    expect(componente).toBeTruthy();
  });

  it('debe redirigir al login si el usuario no está autenticado', async () => {
    mockServicioAuth.estaAutenticado.mockReturnValue(false);

    await componente.inicializar();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/iniciar-sesion'], {
      queryParams: { redirect: '/mi-cuenta/puntos' }
    });
    expect(mockServicioFidelizacion.obtenerMiFidelizacion).not.toHaveBeenCalled();
  });

  it('debe cargar los datos de fidelización si está autenticado', async () => {
    await componente.cargarDatos();

    expect(mockServicioFidelizacion.obtenerMiFidelizacion).toHaveBeenCalled();
    expect(componente.saldoActual()).toBe(3500);
    expect(componente.recompensas().length).toBe(2);
    expect(componente.movimientos().length).toBe(1);
    expect(componente.cargando()).toBe(false);
  });

  it('debe ejecutar un canje exitoso y actualizar datos', async () => {
    await componente.cargarDatos();
    const recompensa = mockPanel.recompensas[0];

    await componente.ejecutarCanje(recompensa);

    expect(mockServicioFidelizacion.canjearRecompensa).toHaveBeenCalledWith('rec-1');
    expect(componente.resultadoCanje()?.cupon?.codigoCupon).toBe('CP-ABCD-1234');
  });

  it('debe registrar error si el servicio falla en el canje', async () => {
    await componente.cargarDatos();
    mockServicioFidelizacion.canjearRecompensa.mockResolvedValue({
      ok: false,
      mensaje: 'Saldo insuficiente para canjear recompensa.'
    });

    const recompensa = mockPanel.recompensas[0];
    await componente.ejecutarCanje(recompensa);

    expect(componente.errorCanje()).toBe('Saldo insuficiente para canjear recompensa.');
  });
});
