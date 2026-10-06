import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServicioCandy } from './servicio-candy';
import { ServicioSupabase } from './servicio-supabase';

describe('ServicioCandy (M6.1)', () => {
  let servicio: ServicioCandy;
  let mockSupabaseCliente: any;

  beforeEach(() => {
    mockSupabaseCliente = {
      from: vi.fn(),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'admin-uuid-123' } },
          error: null
        })
      },
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/imagen.jpg' } }),
          remove: vi.fn().mockResolvedValue({ data: {}, error: null })
        })
      }
    };

    TestBed.configureTestingModule({
      providers: [
        ServicioCandy,
        {
          provide: ServicioSupabase,
          useValue: { cliente: mockSupabaseCliente }
        }
      ]
    });

    servicio = TestBed.inject(ServicioCandy);
  });

  it('debe crearse correctamente', () => {
    expect(servicio).toBeTruthy();
  });

  it('obtenerProductosActivos debe consultar productos con esta_activo = true', async () => {
    const mockOrder2 = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'prod-1',
          nombre: 'Combo Pantalla Mágica',
          descripcion: 'Pochoclo + 2 bebidas',
          categoria: 'combos',
          precio: 12900,
          stock: 50,
          imagen_url: 'https://img.jpg',
          es_destacado: true,
          esta_activo: true,
          creado_en: '2026-10-05T12:00:00Z'
        }
      ],
      error: null
    });

    const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder1 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    mockSupabaseCliente.from.mockReturnValue({
      select: mockSelect
    });

    const resultado = await servicio.obtenerProductosActivos();

    expect(mockSupabaseCliente.from).toHaveBeenCalledWith('productos_candy');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('esta_activo', true);
    expect(resultado.length).toBe(1);
    expect(resultado[0].nombre).toBe('Combo Pantalla Mágica');
    expect(resultado[0].esDestacado).toBe(true);
  });

  it('obtenerTodosLosProductos debe recuperar todos los productos para administración', async () => {
    const mockOrder2 = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'prod-1',
          nombre: 'Gaseosa 500ml',
          categoria: 'bebidas',
          precio: 3500,
          stock: 100,
          esta_activo: true,
          es_destacado: false,
          creado_en: '2026-10-05T12:00:00Z'
        },
        {
          id: 'prod-2',
          nombre: 'Pochoclo Chico',
          categoria: 'pochoclos',
          precio: 4000,
          stock: 0,
          esta_activo: false,
          es_destacado: false,
          creado_en: '2026-10-05T12:00:00Z'
        }
      ],
      error: null
    });

    const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder1 });

    mockSupabaseCliente.from.mockReturnValue({ select: mockSelect });

    const resultado = await servicio.obtenerTodosLosProductos();

    expect(resultado.length).toBe(2);
    expect(resultado[1].estaActivo).toBe(false);
  });

  it('cambiarEstadoActivo debe actualizar esta_activo', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    mockSupabaseCliente.from.mockReturnValue({ update: mockUpdate });

    await servicio.cambiarEstadoActivo('prod-1', false);

    expect(mockSupabaseCliente.from).toHaveBeenCalledWith('productos_candy');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ esta_activo: false })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'prod-1');
  });

  it('crearProducto debe insertar datos en productos_candy', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'nuevo-123',
        nombre: 'Nachos con Queso',
        descripcion: 'Con salsa cheddar',
        categoria: 'snacks',
        precio: 6000,
        stock: 25,
        imagen_url: null,
        es_destacado: false,
        esta_activo: true,
        creado_en: '2026-10-05T12:00:00Z'
      },
      error: null
    });

    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    mockSupabaseCliente.from.mockReturnValue({ insert: mockInsert });

    const resultado = await servicio.crearProducto({
      nombre: 'Nachos con Queso',
      descripcion: 'Con salsa cheddar',
      categoria: 'snacks',
      precio: 6000,
      stock: 25,
      esDestacado: false,
      estaActivo: true
    });

    expect(resultado.id).toBe('nuevo-123');
    expect(resultado.nombre).toBe('Nachos con Queso');
    expect(resultado.stock).toBe(25);
  });
});
