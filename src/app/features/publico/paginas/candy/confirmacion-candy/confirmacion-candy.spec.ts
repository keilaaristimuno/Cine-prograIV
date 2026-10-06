import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResultadoCompraCandy } from '../../../../../core/modelos/compra-candy';
import { ServicioAuth } from '../../../../../core/servicios/servicio-auth';
import { ServicioCandy } from '../../../../../core/servicios/servicio-candy';
import { ServicioPdfCandy } from '../../../../../core/servicios/servicio-pdf-candy';
import { ConfirmacionCandy } from './confirmacion-candy';

describe('ConfirmacionCandy Component (M6.3)', () => {
  let componente: ConfirmacionCandy;
  let mockRoute: { snapshot: { paramMap: { get: ReturnType<typeof vi.fn> } } };
  let mockRouter: { getCurrentNavigation: ReturnType<typeof vi.fn> };
  let mockServicioCandy: { obtenerCompraPorId: ReturnType<typeof vi.fn> };
  let mockServicioAuth: { asegurarSesionLista: ReturnType<typeof vi.fn>; estaAutenticado: ReturnType<typeof vi.fn> };
  let mockServicioPdf: { generarQrDataUrl: ReturnType<typeof vi.fn>; descargarPdf: ReturnType<typeof vi.fn> };

  const mockResultado: ResultadoCompraCandy = {
    compra_id: 'compra-123',
    usuario_id: 'user-abc',
    email_contacto: 'cliente@cine.com',
    codigo_alfanumerico: 'CD-4A7P-8X2M',
    total: 15000,
    estado: 'pendiente_retiro',
    retiro_validado: false,
    retiro_validado_en: null,
    creado_en: '2026-10-05T21:00:00Z',
    lineas: [
      {
        producto_id: 'prod-1',
        nombre_producto: 'Combo Pochoclo + Gaseosa',
        categoria_producto: 'combos',
        cantidad: 1,
        precio_unitario: 15000,
        subtotal: 15000,
        imagen_url: null
      }
    ]
  };

  beforeEach(() => {
    mockRoute = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue('compra-123')
        }
      }
    };

    mockRouter = {
      getCurrentNavigation: vi.fn().mockReturnValue(null)
    };

    mockServicioCandy = {
      obtenerCompraPorId: vi.fn()
    };

    mockServicioAuth = {
      asegurarSesionLista: vi.fn().mockResolvedValue(undefined),
      estaAutenticado: vi.fn().mockReturnValue(false)
    };

    mockServicioPdf = {
      generarQrDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,mockQrCandy'),
      descargarPdf: vi.fn().mockResolvedValue(undefined)
    };

    history.replaceState({}, '');

    TestBed.configureTestingModule({
      providers: [
        ConfirmacionCandy,
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: mockRouter },
        { provide: ServicioCandy, useValue: mockServicioCandy },
        { provide: ServicioAuth, useValue: mockServicioAuth },
        { provide: ServicioPdfCandy, useValue: mockServicioPdf }
      ]
    });

    componente = TestBed.inject(ConfirmacionCandy);
  });

  it('debe inicializarse y cargar los datos desde el router/history state', () => {
    history.replaceState({ resultadoCompraCandy: mockResultado }, '');

    componente.ngOnInit();

    expect(componente.compraId()).toBe('compra-123');
    expect(componente.compra()).toEqual(mockResultado);
    expect(componente.cargando()).toBe(false);
    expect(componente.esAnonimoSinState()).toBe(false);
  });

  it('debe reconstruir el comprobante desde Supabase si el usuario está autenticado', async () => {
    mockServicioAuth.estaAutenticado.mockReturnValue(true);
    mockServicioCandy.obtenerCompraPorId.mockResolvedValue(mockResultado);

    componente.ngOnInit();

    // Esperar resolución de promesa asíncrona en ngOnInit
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockServicioCandy.obtenerCompraPorId).toHaveBeenCalledWith('compra-123');
    expect(componente.compra()).toEqual(mockResultado);
    expect(componente.cargando()).toBe(false);
    expect(componente.esAnonimoSinState()).toBe(false);
  });

  it('no debe debilitar RLS para compra anónima tras refresh sin state', async () => {
    mockServicioAuth.estaAutenticado.mockReturnValue(false);

    componente.ngOnInit();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockServicioCandy.obtenerCompraPorId).not.toHaveBeenCalled();
    expect(componente.esAnonimoSinState()).toBe(true);
    expect(componente.compra()).toBeNull();
    expect(componente.cargando()).toBe(false);
  });

  it('debe invocar la descarga del PDF del voucher Candy', async () => {
    history.replaceState({ resultadoCompraCandy: mockResultado }, '');
    componente.ngOnInit();

    await componente.descargarPdf();

    expect(mockServicioPdf.descargarPdf).toHaveBeenCalledWith(mockResultado);
  });

  it('debe copiar el código al portapapeles y activar el estado visual copiadoExitoso', async () => {
    history.replaceState({ resultadoCompraCandy: mockResultado }, '');
    componente.ngOnInit();

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock }
    });

    await componente.copiarCodigo();

    expect(writeTextMock).toHaveBeenCalledWith('CD-4A7P-8X2M');
    expect(componente.copiadoExitoso()).toBe(true);
  });
});
