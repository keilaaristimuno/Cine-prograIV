import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListadoCandy } from './listado-candy';
import { ServicioCandy } from '../../../../../core/servicios/servicio-candy';
import { ProductoCandy } from '../../../../../core/modelos/producto-candy';
import { ActivatedRoute } from '@angular/router';

describe('ListadoCandy Component (M6.1 Panel Admin)', () => {
  let componente: ListadoCandy;
  let mockServicioCandy: {
    obtenerTodosLosProductos: ReturnType<typeof vi.fn>;
    cambiarEstadoActivo: ReturnType<typeof vi.fn>;
  };

  const listaProductos: ProductoCandy[] = [
    {
      id: 'prod-1',
      nombre: 'Combo Pantalla Mágica',
      categoria: 'combos',
      precio: 12900,
      stock: 50,
      esDestacado: true,
      estaActivo: true,
      creadoEn: '2026-10-05T00:00:00Z'
    },
    {
      id: 'prod-2',
      nombre: 'Agua Mineral 500ml',
      categoria: 'bebidas',
      precio: 2500,
      stock: 0,
      esDestacado: false,
      estaActivo: false,
      creadoEn: '2026-10-05T00:00:00Z'
    }
  ];

  beforeEach(async () => {
    mockServicioCandy = {
      obtenerTodosLosProductos: vi.fn().mockResolvedValue(listaProductos),
      cambiarEstadoActivo: vi.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [ListadoCandy],
      providers: [
        { provide: ServicioCandy, useValue: mockServicioCandy },
        { provide: ActivatedRoute, useValue: {} }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ListadoCandy);
    componente = fixture.componentInstance;
  });

  it('debe crearse correctamente', () => {
    expect(componente).toBeTruthy();
  });

  it('debe cargar todos los productos (activos e inactivos) al inicializar', async () => {
    await componente.cargarProductos();

    expect(mockServicioCandy.obtenerTodosLosProductos).toHaveBeenCalled();
    expect(componente.productos().length).toBe(2);
    expect(componente.cargando()).toBe(false);
  });

  it('debe alternar el estado activo/inactivo', async () => {
    await componente.cargarProductos();

    const prod = componente.productos()[0]; // activo = true
    await componente.alternarEstado(prod);

    expect(mockServicioCandy.cambiarEstadoActivo).toHaveBeenCalledWith('prod-1', false);
    expect(componente.productos()[0].estaActivo).toBe(false);
  });

  it('debe filtrar productos por categoría y texto', async () => {
    await componente.cargarProductos();

    componente.categoriaFiltro.set('bebidas');
    expect(componente.productosFiltrados().length).toBe(1);
    expect(componente.productosFiltrados()[0].nombre).toBe('Agua Mineral 500ml');

    componente.categoriaFiltro.set('todos');
    componente.textoBusqueda.set('pantalla');
    expect(componente.productosFiltrados().length).toBe(1);
    expect(componente.productosFiltrados()[0].nombre).toBe('Combo Pantalla Mágica');
  });
});
