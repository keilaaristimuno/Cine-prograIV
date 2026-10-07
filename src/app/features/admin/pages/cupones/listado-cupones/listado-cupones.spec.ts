import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivatedRoute } from '@angular/router';
import { ListadoCupones } from './listado-cupones';
import { ServicioFidelizacion } from '../../../../../core/servicios/servicio-fidelizacion';
import { CuponCliente } from '../../../../../core/modelos/fidelizacion';

describe('ListadoCupones Component (M8.1 Admin Cupones)', () => {
  let componente: ListadoCupones;
  let mockServicioFidelizacion: {
    obtenerCuponesAdmin: ReturnType<typeof vi.fn>;
  };

  const listaCupones: CuponCliente[] = [
    {
      id: 'cup-1',
      usuarioId: 'usr-12345678',
      recompensaId: 'rec-1',
      codigoCupon: 'CP-AAAA-1111',
      tipo: 'entrada_gratis',
      valorBeneficio: 1,
      descripcion: 'Entrada 2D',
      origen: 'canje_puntos',
      estado: 'disponible',
      venceEn: '2099-01-01T00:00:00Z',
      creadoEn: '2026-10-06T00:00:00Z'
    },
    {
      id: 'cup-2',
      usuarioId: 'usr-87654321',
      recompensaId: 'rec-2',
      codigoCupon: 'CP-BBBB-2222',
      tipo: 'descuento_porcentual',
      valorBeneficio: 15,
      descripcion: 'Descuento Candy',
      origen: 'canje_puntos',
      estado: 'utilizado',
      venceEn: '2099-01-01T00:00:00Z',
      utilizadoEn: '2026-10-06T12:00:00Z',
      creadoEn: '2026-10-06T00:00:00Z'
    },
    {
      id: 'cup-3',
      usuarioId: 'usr-12345678',
      recompensaId: 'rec-3',
      codigoCupon: 'CP-CCCC-3333',
      tipo: 'descuento_monto_fijo',
      valorBeneficio: 500,
      descripcion: '$500 Descuento',
      origen: 'canje_puntos',
      estado: 'disponible',
      venceEn: '2020-01-01T00:00:00Z', // Vencido funcionalmente
      creadoEn: '2020-01-01T00:00:00Z'
    }
  ];

  beforeEach(async () => {
    mockServicioFidelizacion = {
      obtenerCuponesAdmin: vi.fn().mockResolvedValue(listaCupones)
    };

    await TestBed.configureTestingModule({
      imports: [ListadoCupones],
      providers: [
        { provide: ServicioFidelizacion, useValue: mockServicioFidelizacion },
        { provide: ActivatedRoute, useValue: {} }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ListadoCupones);
    componente = fixture.componentInstance;
  });

  it('debe crearse correctamente', () => {
    expect(componente).toBeTruthy();
  });

  it('debe cargar los cupones para auditoría administrativa', async () => {
    await componente.cargarCupones();

    expect(mockServicioFidelizacion.obtenerCuponesAdmin).toHaveBeenCalled();
    expect(componente.cupones().length).toBe(3);
    expect(componente.cargando()).toBe(false);
  });

  it('debe calcular los conteos por estado correctamente', async () => {
    await componente.cargarCupones();

    const conteo = componente.conteoPorEstado();
    expect(conteo.todos).toBe(3);
    expect(conteo.disponibles).toBe(1);
    expect(conteo.utilizados).toBe(1);
    expect(conteo.vencidos).toBe(1);
  });

  it('debe filtrar por búsqueda de código o recompensa', async () => {
    await componente.cargarCupones();

    componente.textoBusqueda.set('CP-AAAA');
    expect(componente.cuponesFiltrados().length).toBe(1);
    expect(componente.cuponesFiltrados()[0].codigoCupon).toBe('CP-AAAA-1111');

    componente.textoBusqueda.set('Candy');
    expect(componente.cuponesFiltrados().length).toBe(1);
    expect(componente.cuponesFiltrados()[0].codigoCupon).toBe('CP-BBBB-2222');
  });

  it('debe copiar código al portapapeles', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });

    await componente.copiarCodigo('CP-BBBB-2222');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('CP-BBBB-2222');
    expect(componente.codigoCopiado()).toBe('CP-BBBB-2222');
  });
});
