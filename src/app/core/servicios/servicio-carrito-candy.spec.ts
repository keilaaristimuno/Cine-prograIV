import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProductoCandy } from '../modelos/producto-candy';
import { ServicioCarritoCandy } from './servicio-carrito-candy';

describe('ServicioCarritoCandy (M6.2)', () => {
  let servicio: ServicioCarritoCandy;

  const productoMockA: ProductoCandy = {
    id: 'prod-1',
    nombre: 'Pochoclo Salado Grande',
    categoria: 'pochoclos',
    precio: 5000,
    stock: 5,
    esDestacado: true,
    estaActivo: true,
    creadoEn: '2026-10-05T00:00:00Z'
  };

  const productoMockB: ProductoCandy = {
    id: 'prod-2',
    nombre: 'Gaseosa Cola 500ml',
    categoria: 'bebidas',
    precio: 3000,
    stock: 2,
    esDestacado: false,
    estaActivo: true,
    creadoEn: '2026-10-05T00:00:00Z'
  };

  const productoSinStock: ProductoCandy = {
    id: 'prod-3',
    nombre: 'Golosinas Agotadas',
    categoria: 'snacks',
    precio: 2000,
    stock: 0,
    esDestacado: false,
    estaActivo: true,
    creadoEn: '2026-10-05T00:00:00Z'
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [ServicioCarritoCandy]
    });
    servicio = TestBed.inject(ServicioCarritoCandy);
    servicio.vaciarCarrito();
  });

  it('debe inicializarse vacío por defecto', () => {
    expect(servicio.items().length).toBe(0);
    expect(servicio.cantidadTotal()).toBe(0);
    expect(servicio.subtotal()).toBe(0);
    expect(servicio.estaVacio()).toBe(true);
  });

  it('debe agregar un producto y calcular cantidad y subtotal', () => {
    const agregado = servicio.agregarProducto(productoMockA, 2);
    expect(agregado).toBe(true);
    expect(servicio.items().length).toBe(1);
    expect(servicio.cantidadTotal()).toBe(2);
    expect(servicio.subtotal()).toBe(10000);
    expect(servicio.estaVacio()).toBe(false);
  });

  it('debe acumular cantidades al agregar el mismo producto más de una vez', () => {
    servicio.agregarProducto(productoMockA, 1);
    servicio.agregarProducto(productoMockA, 2);

    expect(servicio.items().length).toBe(1);
    expect(servicio.cantidadTotal()).toBe(3);
    expect(servicio.subtotal()).toBe(15000);
  });

  it('debe impedir desde la UI superar el stock conocido del producto', () => {
    // productoMockA tiene stock 5
    servicio.agregarProducto(productoMockA, 4);
    // Intentar agregar 3 más (total sería 7 > 5)
    servicio.agregarProducto(productoMockA, 3);

    expect(servicio.cantidadTotal()).toBe(5);
    expect(servicio.items()[0].cantidad).toBe(5);
    expect(servicio.subtotal()).toBe(25000);
  });

  it('no debe agregar productos que tengan stock 0', () => {
    const agregado = servicio.agregarProducto(productoSinStock, 1);
    expect(agregado).toBe(false);
    expect(servicio.items().length).toBe(0);
    expect(servicio.cantidadTotal()).toBe(0);
  });

  it('debe incrementar y decrementar cantidades respetando límites', () => {
    servicio.agregarProducto(productoMockB, 1); // stock 2
    expect(servicio.cantidadTotal()).toBe(1);

    const incrementoExitoso = servicio.incrementarCantidad(productoMockB.id);
    expect(incrementoExitoso).toBe(true);
    expect(servicio.cantidadTotal()).toBe(2);

    // Superar stock 2 no debe permitir incrementar
    const incrementoFallido = servicio.incrementarCantidad(productoMockB.id);
    expect(incrementoFallido).toBe(false);
    expect(servicio.cantidadTotal()).toBe(2);

    // Decrementar
    servicio.decrementarCantidad(productoMockB.id);
    expect(servicio.cantidadTotal()).toBe(1);

    // Decrementar a 0 debe remover el item
    servicio.decrementarCantidad(productoMockB.id);
    expect(servicio.items().length).toBe(0);
    expect(servicio.estaVacio()).toBe(true);
  });

  it('debe eliminar un producto específico del carrito', () => {
    servicio.agregarProducto(productoMockA, 1);
    servicio.agregarProducto(productoMockB, 1);
    expect(servicio.items().length).toBe(2);

    servicio.eliminarProducto(productoMockA.id);
    expect(servicio.items().length).toBe(1);
    expect(servicio.items()[0].producto.id).toBe(productoMockB.id);
  });

  it('debe vaciar la totalidad del carrito', () => {
    servicio.agregarProducto(productoMockA, 2);
    servicio.agregarProducto(productoMockB, 1);
    expect(servicio.cantidadTotal()).toBe(3);

    servicio.vaciarCarrito();
    expect(servicio.items().length).toBe(0);
    expect(servicio.cantidadTotal()).toBe(0);
    expect(servicio.subtotal()).toBe(0);
    expect(servicio.estaVacio()).toBe(true);
  });

  it('debe ajustar cantidades si el stock en el backend se reduce', () => {
    servicio.agregarProducto(productoMockA, 4);
    // El backend reporta que ahora solo quedan 2 unidades disponibles
    servicio.ajustarPorStock(productoMockA.id, 2);

    expect(servicio.items()[0].cantidad).toBe(2);
    expect(servicio.subtotal()).toBe(10000);

    // Si el backend reporta stock 0, se remueve del carrito
    servicio.ajustarPorStock(productoMockA.id, 0);
    expect(servicio.items().length).toBe(0);
  });
});
