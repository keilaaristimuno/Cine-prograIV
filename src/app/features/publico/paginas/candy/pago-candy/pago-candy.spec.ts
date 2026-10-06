import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResultadoCompraCandy } from '../../../../../core/modelos/compra-candy';
import { ProductoCandy } from '../../../../../core/modelos/producto-candy';
import { ServicioAuth } from '../../../../../core/servicios/servicio-auth';
import { ServicioCandy } from '../../../../../core/servicios/servicio-candy';
import { ServicioCarritoCandy } from '../../../../../core/servicios/servicio-carrito-candy';
import { CASOS_PRUEBA_TARJETAS } from '../../../../../core/utilidades/validadores-pago';
import { PagoCandy } from './pago-candy';

describe('PagoCandy Component (M6.2)', () => {
  let componente: PagoCandy;
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockServicioCandy: { realizarCompra: ReturnType<typeof vi.fn> };
  let mockServicioAuth: { usuarioActual: ReturnType<typeof vi.fn> };
  let servicioCarrito: ServicioCarritoCandy;

  const mockProducto: ProductoCandy = {
    id: 'prod-combo-1',
    nombre: 'Combo Mega',
    categoria: 'combos',
    precio: 10000,
    stock: 10,
    esDestacado: true,
    estaActivo: true,
    creadoEn: '2026-10-05T00:00:00Z'
  };

  beforeEach(() => {
    localStorage.clear();
    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true)
    };
    mockServicioCandy = {
      realizarCompra: vi.fn()
    };
    mockServicioAuth = {
      usuarioActual: vi.fn().mockReturnValue({ email: 'comprador@cine.com' })
    };

    TestBed.configureTestingModule({
      providers: [
        PagoCandy,
        ServicioCarritoCandy,
        { provide: Router, useValue: mockRouter },
        { provide: ServicioCandy, useValue: mockServicioCandy },
        { provide: ServicioAuth, useValue: mockServicioAuth }
      ]
    });

    servicioCarrito = TestBed.inject(ServicioCarritoCandy);
    servicioCarrito.vaciarCarrito();
    componente = TestBed.inject(PagoCandy);
  });

  it('debe redirigir al catálogo /candy si el carrito está vacío al iniciar', () => {
    componente.ngOnInit();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/candy']);
  });

  it('debe prellenar el email de contacto si el usuario está autenticado', () => {
    servicioCarrito.agregarProducto(mockProducto, 1);
    componente.ngOnInit();

    expect(componente.formularioPago.get('emailContacto')?.value).toBe('comprador@cine.com');
  });

  it('debe autocompletar los campos al seleccionar una tarjeta de prueba', () => {
    const casoAprobado = CASOS_PRUEBA_TARJETAS[0]; // Visa
    componente.aplicarCasoPrueba(casoAprobado);

    expect(componente.formularioPago.get('numeroTarjeta')?.value).toBe(casoAprobado.numero);
    expect(componente.formularioPago.get('nombreTitular')?.value).toBe(casoAprobado.titular);
    expect(componente.formularioPago.get('vencimiento')?.value).toBe(casoAprobado.vencimiento);
    expect(componente.formularioPago.get('cvv')?.value).toBe(casoAprobado.cvv);
    expect(componente.formularioPago.valid).toBe(false); // falta email si no se llamó ngOnInit
  });

  it('debe detectar la marca de la tarjeta reactivamente', () => {
    componente.formularioPago.patchValue({ numeroTarjeta: '4509 9535 6623 3704' });
    expect(componente.marcaTarjeta()).toBe('visa');

    componente.formularioPago.patchValue({ numeroTarjeta: '5105 1051 0510 5100' });
    expect(componente.marcaTarjeta()).toBe('mastercard');
  });

  it('debe simular rechazo bancario por fondos insuficientes sin llamar al backend', async () => {
    servicioCarrito.agregarProducto(mockProducto, 1);
    const casoRechazo = CASOS_PRUEBA_TARJETAS[2]; // Fondos insuficientes (4000 0000 0000 0002)

    componente.formularioPago.patchValue({
      emailContacto: 'test@cine.com',
      numeroTarjeta: casoRechazo.numero,
      nombreTitular: casoRechazo.titular,
      vencimiento: casoRechazo.vencimiento,
      cvv: casoRechazo.cvv
    });

    await componente.confirmarPagoCandy();

    expect(componente.errorPago()).toContain('Transacción denegada por la entidad bancaria');
    expect(mockServicioCandy.realizarCompra).not.toHaveBeenCalled();
    expect(servicioCarrito.estaVacio()).toBe(false);
  });

  it('debe procesar un pago aprobado, llamar a la RPC atómica, vaciar carrito y navegar', async () => {
    servicioCarrito.agregarProducto(mockProducto, 2);
    const casoAprobado = CASOS_PRUEBA_TARJETAS[0];

    componente.formularioPago.patchValue({
      emailContacto: 'cliente@correo.com',
      numeroTarjeta: casoAprobado.numero,
      nombreTitular: casoAprobado.titular,
      vencimiento: casoAprobado.vencimiento,
      cvv: casoAprobado.cvv
    });

    const mockResultado: ResultadoCompraCandy = {
      compra_id: 'compra-uuid-123',
      usuario_id: null,
      email_contacto: 'cliente@correo.com',
      codigo_alfanumerico: 'CD-8F4K-2N9X',
      total: 20000,
      estado: 'pendiente_retiro',
      retiro_validado: false,
      retiro_validado_en: null,
      creado_en: '2026-10-05T23:00:00Z',
      lineas: [
        {
          producto_id: mockProducto.id,
          nombre_producto: mockProducto.nombre,
          categoria_producto: 'combos',
          cantidad: 2,
          precio_unitario: 10000,
          subtotal: 20000
        }
      ]
    };

    mockServicioCandy.realizarCompra.mockResolvedValue(mockResultado);

    await componente.confirmarPagoCandy();

    expect(mockServicioCandy.realizarCompra).toHaveBeenCalledWith({
      emailContacto: 'cliente@correo.com',
      lineas: [{ productoId: mockProducto.id, cantidad: 2 }]
    });

    // Debe vaciar el carrito
    expect(servicioCarrito.estaVacio()).toBe(true);

    // Debe navegar a confirmacion con el resultado en el router state
    expect(mockRouter.navigate).toHaveBeenCalledWith(
      ['/candy/confirmacion', 'compra-uuid-123'],
      { state: { resultadoCompraCandy: mockResultado } }
    );
  });

  it('debe manejar error de stock insuficiente del backend y mostrar mensaje claro', async () => {
    servicioCarrito.agregarProducto(mockProducto, 1);
    const casoAprobado = CASOS_PRUEBA_TARJETAS[0];

    componente.formularioPago.patchValue({
      emailContacto: 'cliente@correo.com',
      numeroTarjeta: casoAprobado.numero,
      nombreTitular: casoAprobado.titular,
      vencimiento: casoAprobado.vencimiento,
      cvv: casoAprobado.cvv
    });

    mockServicioCandy.realizarCompra.mockRejectedValue(
      new Error('Stock insuficiente para el producto "Combo Mega". Stock disponible: 0, cantidad solicitada: 1.')
    );

    await componente.confirmarPagoCandy();

    expect(componente.errorStock()).toContain('Stock insuficiente');
    expect(servicioCarrito.estaVacio()).toBe(false);
  });
});
