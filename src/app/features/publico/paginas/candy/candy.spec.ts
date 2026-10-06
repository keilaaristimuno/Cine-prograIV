import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Candy } from './candy';
import { ServicioCandy } from '../../../../core/servicios/servicio-candy';
import { ProductoCandy } from '../../../../core/modelos/producto-candy';

describe('Candy Component (M6.1 Catálogo Público)', () => {
  let componente: Candy;
  let mockServicioCandy: {
    obtenerProductosActivos: ReturnType<typeof vi.fn>;
  };

  const productosPrueba: ProductoCandy[] = [
    {
      id: '1',
      nombre: 'Combo Pantalla Mágica',
      descripcion: 'Pochoclo grande y 2 bebidas',
      categoria: 'combos',
      precio: 12900,
      stock: 30,
      esDestacado: true,
      estaActivo: true,
      creadoEn: '2026-10-05T00:00:00Z'
    },
    {
      id: '2',
      nombre: 'Gaseosa Mediana',
      descripcion: '500ml',
      categoria: 'bebidas',
      precio: 3500,
      stock: 10,
      esDestacado: false,
      estaActivo: true,
      creadoEn: '2026-10-05T00:00:00Z'
    },
    {
      id: '3',
      nombre: 'Pochoclo Salado',
      descripcion: 'Bolsa mediana',
      categoria: 'pochoclos',
      precio: 5000,
      stock: 0,
      esDestacado: false,
      estaActivo: true,
      creadoEn: '2026-10-05T00:00:00Z'
    }
  ];

  beforeEach(async () => {
    mockServicioCandy = {
      obtenerProductosActivos: vi.fn().mockResolvedValue(productosPrueba)
    };

    await TestBed.configureTestingModule({
      imports: [Candy],
      providers: [
        { provide: ServicioCandy, useValue: mockServicioCandy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(Candy);
    componente = fixture.componentInstance;
  });

  it('debe instanciarse correctamente', () => {
    expect(componente).toBeTruthy();
  });

  it('debe cargar los productos activos en ngOnInit', async () => {
    await componente.cargarCatalogo();

    expect(mockServicioCandy.obtenerProductosActivos).toHaveBeenCalled();
    expect(componente.productos().length).toBe(3);
    expect(componente.cargando()).toBe(false);
  });

  it('debe filtrar correctamente por categoría seleccionada', async () => {
    await componente.cargarCatalogo();

    componente.seleccionarCategoria('bebidas');
    const filtrados = componente.productosFiltrados();

    expect(filtrados.length).toBe(1);
    expect(filtrados[0].nombre).toBe('Gaseosa Mediana');
  });

  it('debe filtrar correctamente por texto de búsqueda', async () => {
    await componente.cargarCatalogo();

    componente.actualizarBusqueda('pochoclo');
    const filtrados = componente.productosFiltrados();

    // 'Combo Pantalla Mágica' (descripción menciona pochoclo) y 'Pochoclo Salado'
    expect(filtrados.length).toBe(2);
  });

  it('debe identificar los productos destacados con stock disponible', async () => {
    await componente.cargarCatalogo();

    const destacados = componente.productosDestacados();
    expect(destacados.length).toBe(1);
    expect(destacados[0].nombre).toBe('Combo Pantalla Mágica');
  });

  it('debe limpiar filtros adecuadamente', async () => {
    await componente.cargarCatalogo();

    componente.seleccionarCategoria('snacks');
    componente.actualizarBusqueda('algo');
    componente.limpiarFiltros();

    expect(componente.categoriaSeleccionada()).toBe('todos');
    expect(componente.textoBusqueda()).toBe('');
    expect(componente.productosFiltrados().length).toBe(3);
  });
});
