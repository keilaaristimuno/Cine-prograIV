import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Entradas } from './entradas';
import { ServicioCompras } from '../../../../core/servicios/servicio-compras';
import { ServicioPdfEntrada } from '../../../../core/servicios/servicio-pdf-entrada';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';
import { ResultadoCompra } from '../../../../core/modelos/compra';

describe('Entradas Component', () => {
  let component: Entradas;
  let fixture: ComponentFixture<Entradas>;

  const mockCompras: ResultadoCompra[] = [
    {
      compra_id: 'compra-1',
      usuario_id: 'user-123',
      email_contacto: 'cliente@test.com',
      estado: 'completada',
      creado_en: '2026-10-06T12:00:00Z',
      subtotal: 10000,
      porcentaje_descuento_aplicado: 0,
      monto_descuento: 0,
      tipo_descuento_aplicado: 'ninguno',
      es_primera_compra: false,
      total: 10000,
      codigo_alfanumerico: 'TK-ABCD-1234',
      acceso_sala_validado: false,
      acceso_sala_validado_en: null,
      funcion: {
        id: 'func-1',
        pelicula_id: 'pel-1',
        pelicula_nombre: 'El Viaje de Chihiro',
        clasificacion_edad: 'ATP',
        fecha_hora_inicio: '2026-10-10T20:00:00Z',
        formato: '2D',
        sala_numero: 1,
        sala_nombre: 'Sala IMAX',
        pelicula_imagen_url: 'https://img.test/chihiro.jpg',
        pelicula_generos: ['Animación', 'Fantasía']
      },
      butacas: [
        {
          id: 'but-1',
          fila: 'A',
          numero: 1,
          bloque: 'centro',
          tipo: 'estandar',
          precioUnitario: 5000
        },
        {
          id: 'but-2',
          fila: 'A',
          numero: 2,
          bloque: 'centro',
          tipo: 'estandar',
          precioUnitario: 5000
        }
      ]
    },
    {
      compra_id: 'compra-2',
      usuario_id: 'user-123',
      email_contacto: 'cliente@test.com',
      estado: 'completada',
      creado_en: '2026-09-20T15:30:00Z',
      subtotal: 5000,
      porcentaje_descuento_aplicado: 0,
      monto_descuento: 0,
      tipo_descuento_aplicado: 'ninguno',
      es_primera_compra: false,
      total: 5000,
      codigo_alfanumerico: 'TK-WXYZ-7890',
      acceso_sala_validado: true,
      acceso_sala_validado_en: '2026-09-20T17:45:00Z',
      funcion: {
        id: 'func-2',
        pelicula_id: 'pel-2',
        pelicula_nombre: 'Interestelar',
        clasificacion_edad: '+13',
        fecha_hora_inicio: '2026-09-20T18:00:00Z',
        formato: 'IMAX',
        sala_numero: 2,
        sala_nombre: 'Sala 2',
        pelicula_imagen_url: null,
        pelicula_generos: ['Ciencia Ficción']
      },
      butacas: [
        {
          id: 'but-3',
          fila: 'C',
          numero: 5,
          bloque: 'centro',
          tipo: 'premium',
          precioUnitario: 5000
        }
      ]
    }
  ];

  let mockServicioCompras: {
    obtenerMisCompras: ReturnType<typeof vi.fn>;
  };

  let mockServicioPdf: {
    generarQrDataUrl: ReturnType<typeof vi.fn>;
    descargarEntradaPdf: ReturnType<typeof vi.fn>;
  };

  let mockServicioAuth: {
    perfilActual: ReturnType<typeof signal>;
    usuarioActual: ReturnType<typeof signal>;
    esAdmin: () => boolean;
    esEmpleado: () => boolean;
  };

  beforeEach(async () => {
    mockServicioCompras = {
      obtenerMisCompras: vi.fn().mockResolvedValue(mockCompras)
    };

    mockServicioPdf = {
      generarQrDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,mockqr'),
      descargarEntradaPdf: vi.fn().mockResolvedValue(undefined)
    };

    mockServicioAuth = {
      perfilActual: signal({
        usuarioId: 'user-123',
        nombre: 'Carlos',
        apellido: 'Test',
        fechaNacimiento: '1990-01-01',
        tipoSangre: 'O+',
        colorOjos: 'Marrones',
        diasVacaciones: 10,
        rol: 'cliente',
        credito: 0,
        saldoPuntos: 350
      }),
      usuarioActual: signal({ id: 'user-123', email: 'carlos@test.com' }),
      esAdmin: () => false,
      esEmpleado: () => false
    };

    await TestBed.configureTestingModule({
      imports: [Entradas],
      providers: [
        provideRouter([]),
        { provide: ServicioCompras, useValue: mockServicioCompras },
        { provide: ServicioPdfEntrada, useValue: mockServicioPdf },
        { provide: ServicioAuth, useValue: mockServicioAuth }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Entradas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe cargar las compras históricas del usuario al iniciar', async () => {
    await fixture.whenStable();
    expect(mockServicioCompras.obtenerMisCompras).toHaveBeenCalled();
    expect(component.compras().length).toBe(2);
    expect(component.cargando()).toBe(false);
  });

  it('debe filtrar compras por estado de acceso', () => {
    component.compras.set(mockCompras);

    component.cambiarFiltro('pendientes');
    expect(component.comprasFiltradas().length).toBe(1);
    expect(component.comprasFiltradas()[0].codigo_alfanumerico).toBe('TK-ABCD-1234');

    component.cambiarFiltro('validadas');
    expect(component.comprasFiltradas().length).toBe(1);
    expect(component.comprasFiltradas()[0].codigo_alfanumerico).toBe('TK-WXYZ-7890');

    component.cambiarFiltro('todas');
    expect(component.comprasFiltradas().length).toBe(2);
  });

  it('debe filtrar compras por texto de búsqueda', () => {
    component.compras.set(mockCompras);

    component.terminoBusqueda.set('Interes');
    expect(component.comprasFiltradas().length).toBe(1);
    expect(component.comprasFiltradas()[0].funcion.pelicula_nombre).toBe('Interestelar');

    component.terminoBusqueda.set('ABCD');
    expect(component.comprasFiltradas().length).toBe(1);
    expect(component.comprasFiltradas()[0].codigo_alfanumerico).toBe('TK-ABCD-1234');
  });

  it('debe abrir voucher y generar QR DataUrl', async () => {
    await component.abrirVoucher(mockCompras[0]);

    expect(component.compraVoucher()).toBe(mockCompras[0]);
    expect(mockServicioPdf.generarQrDataUrl).toHaveBeenCalledWith('TK-ABCD-1234');
    expect(component.qrDataUrl()).toBe('data:image/png;base64,mockqr');
  });

  it('debe cerrar el voucher digital', () => {
    component.abrirVoucher(mockCompras[0]);
    component.cerrarVoucher();

    expect(component.compraVoucher()).toBeNull();
    expect(component.qrDataUrl()).toBeNull();
  });

  it('debe llamar a descargarEntradaPdf', async () => {
    await component.descargarPdf(mockCompras[0]);

    expect(mockServicioPdf.descargarEntradaPdf).toHaveBeenCalledWith(mockCompras[0]);
    expect(component.descargandoPdfId()).toBeNull();
  });
});
