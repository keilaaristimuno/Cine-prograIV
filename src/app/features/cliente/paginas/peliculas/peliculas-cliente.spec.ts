import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PeliculasCliente } from './peliculas-cliente';
import { ServicioCompras } from '../../../../core/servicios/servicio-compras';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';
import { ResultadoCompra } from '../../../../core/modelos/compra';

describe('PeliculasCliente Component', () => {
  let component: PeliculasCliente;
  let fixture: ComponentFixture<PeliculasCliente>;

  const mockCompras: ResultadoCompra[] = [
    {
      compra_id: 'c-1',
      usuario_id: 'user-1',
      email_contacto: 'user@test.com',
      estado: 'completada',
      creado_en: '2026-10-01T10:00:00Z',
      subtotal: 5000,
      porcentaje_descuento_aplicado: 0,
      monto_descuento: 0,
      tipo_descuento_aplicado: 'ninguno',
      es_primera_compra: false,
      total: 5000,
      codigo_alfanumerico: 'TK-1111-1111',
      acceso_sala_validado: true,
      acceso_sala_validado_en: '2026-10-01T12:00:00Z',
      funcion: {
        id: 'f-1',
        pelicula_id: 'p-1',
        pelicula_nombre: 'Batman',
        clasificacion_edad: '+13',
        fecha_hora_inicio: '2026-10-01T11:00:00Z',
        formato: '2D',
        sala_numero: 1,
        sala_nombre: 'Sala 1',
        pelicula_imagen_url: 'https://img.test/batman.jpg',
        pelicula_generos: ['Acción', 'Drama']
      },
      butacas: [{ id: 'b-1', fila: 'A', numero: 1, bloque: 'centro', tipo: 'estandar' }]
    },
    {
      compra_id: 'c-2',
      usuario_id: 'user-1',
      email_contacto: 'user@test.com',
      estado: 'completada',
      creado_en: '2026-10-03T10:00:00Z',
      subtotal: 10000,
      porcentaje_descuento_aplicado: 0,
      monto_descuento: 0,
      tipo_descuento_aplicado: 'ninguno',
      es_primera_compra: false,
      total: 10000,
      codigo_alfanumerico: 'TK-2222-2222',
      acceso_sala_validado: false,
      acceso_sala_validado_en: null,
      funcion: {
        id: 'f-2',
        pelicula_id: 'p-1', // Misma película Batman (segunda compra)
        pelicula_nombre: 'Batman',
        clasificacion_edad: '+13',
        fecha_hora_inicio: '2026-10-05T19:00:00Z',
        formato: 'IMAX',
        sala_numero: 2,
        sala_nombre: 'Sala IMAX',
        pelicula_imagen_url: 'https://img.test/batman.jpg',
        pelicula_generos: ['Acción', 'Drama']
      },
      butacas: [
        { id: 'b-2', fila: 'B', numero: 1, bloque: 'centro', tipo: 'estandar' },
        { id: 'b-3', fila: 'B', numero: 2, bloque: 'centro', tipo: 'estandar' }
      ]
    },
    {
      compra_id: 'c-3',
      usuario_id: 'user-1',
      email_contacto: 'user@test.com',
      estado: 'completada',
      creado_en: '2026-09-15T10:00:00Z',
      subtotal: 5000,
      porcentaje_descuento_aplicado: 0,
      monto_descuento: 0,
      tipo_descuento_aplicado: 'ninguno',
      es_primera_compra: false,
      total: 5000,
      codigo_alfanumerico: 'TK-3333-3333',
      acceso_sala_validado: false,
      acceso_sala_validado_en: null,
      funcion: {
        id: 'f-3',
        pelicula_id: 'p-2',
        pelicula_nombre: 'Avatar',
        clasificacion_edad: '+13',
        fecha_hora_inicio: '2026-09-15T18:00:00Z',
        formato: '3D',
        sala_numero: 3,
        sala_nombre: 'Sala 3D',
        pelicula_imagen_url: null,
        pelicula_generos: ['Ciencia Ficción']
      },
      butacas: [{ id: 'b-4', fila: 'C', numero: 5, bloque: 'centro', tipo: 'estandar' }]
    }
  ];

  let mockServicioCompras: {
    obtenerMisCompras: ReturnType<typeof vi.fn>;
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

    mockServicioAuth = {
      perfilActual: signal({
        usuarioId: 'user-1',
        nombre: 'Carlos',
        apellido: 'Test',
        fechaNacimiento: '1990-01-01',
        tipoSangre: 'O+',
        colorOjos: 'Marrones',
        diasVacaciones: 10,
        rol: 'cliente',
        credito: 0,
        saldoPuntos: 100
      }),
      usuarioActual: signal({ id: 'user-1', email: 'user@test.com' }),
      esAdmin: () => false,
      esEmpleado: () => false
    };

    await TestBed.configureTestingModule({
      imports: [PeliculasCliente],
      providers: [
        provideRouter([]),
        { provide: ServicioCompras, useValue: mockServicioCompras },
        { provide: ServicioAuth, useValue: mockServicioAuth }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PeliculasCliente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe deduplicar correctamente las películas compradas', async () => {
    await fixture.whenStable();

    // Había 3 compras: 2 de Batman y 1 de Avatar -> Debe haber 2 películas únicas
    expect(component.peliculas().length).toBe(2);

    const batman = component.peliculas().find(p => p.peliculaId === 'p-1');
    expect(batman).toBeDefined();
    expect(batman?.nombre).toBe('Batman');
    expect(batman?.totalCompras).toBe(2);
    expect(batman?.totalEntradas).toBe(3); // 1 + 2
    expect(batman?.asistenciaValidada).toBe(true); // Una de las dos fue validada
    expect(batman?.ultimaFechaFuncion).toBe('2026-10-05T19:00:00Z');

    const avatar = component.peliculas().find(p => p.peliculaId === 'p-2');
    expect(avatar).toBeDefined();
    expect(avatar?.nombre).toBe('Avatar');
    expect(avatar?.totalCompras).toBe(1);
    expect(avatar?.totalEntradas).toBe(1);
    expect(avatar?.asistenciaValidada).toBe(false);
  });

  it('debe filtrar películas según el estado de asistencia validada', async () => {
    await fixture.whenStable();

    component.cambiarFiltro('validadas');
    expect(component.peliculasFiltradas().length).toBe(1);
    expect(component.peliculasFiltradas()[0].nombre).toBe('Batman');

    component.cambiarFiltro('pendientes');
    expect(component.peliculasFiltradas().length).toBe(1);
    expect(component.peliculasFiltradas()[0].nombre).toBe('Avatar');

    component.cambiarFiltro('todas');
    expect(component.peliculasFiltradas().length).toBe(2);
  });

  it('debe buscar películas por nombre o género', async () => {
    await fixture.whenStable();

    component.terminoBusqueda.set('avatar');
    expect(component.peliculasFiltradas().length).toBe(1);
    expect(component.peliculasFiltradas()[0].nombre).toBe('Avatar');

    component.terminoBusqueda.set('Acción');
    expect(component.peliculasFiltradas().length).toBe(1);
    expect(component.peliculasFiltradas()[0].nombre).toBe('Batman');
  });
});
