import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivatedRoute } from '@angular/router';
import { GestionFidelizacion } from './gestion-fidelizacion';
import { ServicioFidelizacion } from '../../../../../core/servicios/servicio-fidelizacion';
import { Recompensa } from '../../../../../core/modelos/fidelizacion';

describe('GestionFidelizacion Component (M8.1 Admin Fidelización)', () => {
  let componente: GestionFidelizacion;
  let mockServicioFidelizacion: {
    obtenerConfiguracionFidelizacion: ReturnType<typeof vi.fn>;
    obtenerRecompensasAdmin: ReturnType<typeof vi.fn>;
    actualizarConfiguracionFidelizacion: ReturnType<typeof vi.fn>;
    alternarEstadoRecompensa: ReturnType<typeof vi.fn>;
    guardarRecompensa: ReturnType<typeof vi.fn>;
  };

  const listaRecompensas: Recompensa[] = [
    {
      id: 'rec-1',
      nombre: 'Entrada 2D Gratis',
      descripcion: 'Entrada para cualquier función 2D',
      costoPuntos: 1200,
      tipo: 'entrada_gratis',
      valorBeneficio: 1,
      diasValidez: 30,
      activa: true,
      creadoEn: '2026-10-06T00:00:00Z'
    },
    {
      id: 'rec-2',
      nombre: '20% Descuento Candy',
      descripcion: 'Descuento en compras candy bar',
      costoPuntos: 800,
      tipo: 'descuento_porcentual',
      valorBeneficio: 20,
      diasValidez: 15,
      activa: false,
      creadoEn: '2026-10-06T00:00:00Z'
    }
  ];

  beforeEach(async () => {
    mockServicioFidelizacion = {
      obtenerConfiguracionFidelizacion: vi.fn().mockResolvedValue({
        pesosPorPunto: 1,
        fidelizacionActiva: true
      }),
      obtenerRecompensasAdmin: vi.fn().mockResolvedValue(listaRecompensas),
      actualizarConfiguracionFidelizacion: vi.fn().mockResolvedValue(undefined),
      alternarEstadoRecompensa: vi.fn().mockResolvedValue(undefined),
      guardarRecompensa: vi.fn().mockResolvedValue({
        id: 'rec-3',
        nombre: 'Combo Popcorn Gratis',
        costoPuntos: 1500,
        tipo: 'producto_candy',
        valorBeneficio: 1,
        diasValidez: 30,
        activa: true,
        creadoEn: '2026-10-06T00:00:00Z'
      })
    };

    await TestBed.configureTestingModule({
      imports: [GestionFidelizacion],
      providers: [
        { provide: ServicioFidelizacion, useValue: mockServicioFidelizacion },
        { provide: ActivatedRoute, useValue: {} }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(GestionFidelizacion);
    componente = fixture.componentInstance;
  });

  it('debe crearse correctamente', () => {
    expect(componente).toBeTruthy();
  });

  it('debe cargar configuración y catálogo al inicializar', async () => {
    await componente.cargarDatos();

    expect(mockServicioFidelizacion.obtenerConfiguracionFidelizacion).toHaveBeenCalled();
    expect(mockServicioFidelizacion.obtenerRecompensasAdmin).toHaveBeenCalled();
    expect(componente.pesosPorPunto()).toBe(1);
    expect(componente.fidelizacionActiva()).toBe(true);
    expect(componente.recompensas().length).toBe(2);
    expect(componente.cargando()).toBe(false);
  });

  it('debe actualizar la configuración comercial', async () => {
    componente.pesosPorPunto.set(5);
    componente.fidelizacionActiva.set(true);

    await componente.guardarConfiguracion();

    expect(mockServicioFidelizacion.actualizarConfiguracionFidelizacion).toHaveBeenCalledWith(5, true);
    expect(componente.mensajeConfig()).toContain('éxito');
  });

  it('debe rechazar configuración si pesosPorPunto es menor o igual a 0', async () => {
    componente.pesosPorPunto.set(0);

    await componente.guardarConfiguracion();

    expect(mockServicioFidelizacion.actualizarConfiguracionFidelizacion).not.toHaveBeenCalled();
    expect(componente.errorConfig()).toContain('mayor a 0');
  });

  it('debe alternar el estado activa/inactiva de una recompensa', async () => {
    await componente.cargarDatos();
    const recompensa = componente.recompensas()[0]; // activa: true

    await componente.alternarEstado(recompensa);

    expect(mockServicioFidelizacion.alternarEstadoRecompensa).toHaveBeenCalledWith('rec-1', false);
    expect(componente.recompensas()[0].activa).toBe(false);
  });

  it('debe abrir modal para crear nueva recompensa y guardarla', async () => {
    componente.abrirModalNuevo();
    expect(componente.modalAbierto()).toBe(true);
    expect(componente.recompensaEditandoId()).toBeNull();

    componente.formNombre = 'Nueva Recompensa Test';
    componente.formCostoPuntos = 1500;
    componente.formDiasValidez = 30;

    await componente.guardarModalRecompensa();

    expect(mockServicioFidelizacion.guardarRecompensa).toHaveBeenCalled();
    expect(componente.modalAbierto()).toBe(false);
  });
});
