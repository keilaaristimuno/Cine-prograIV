import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidarCandy } from './validar-candy';
import { ServicioCandy } from '../../../../core/servicios/servicio-candy';
import { ResultadoValidarEntregaCandy } from '../../../../core/modelos/compra-candy';

describe('ValidarCandy Component (M6.4)', () => {
  let componente: ValidarCandy;
  let mockServicioCandy: { validarEntregaCandy: ReturnType<typeof vi.fn> };

  const mockResultadoExito: ResultadoValidarEntregaCandy = {
    ok: true,
    estado_validacion: 'entrega_autorizada',
    mensaje: 'Entrega autorizada. Entregar los productos detallados al cliente.',
    codigo_alfanumerico: 'CD-4A7P-8X2M',
    estado: 'entregada',
    total: 18500,
    total_unidades: 3,
    fecha_compra: '2026-10-06T10:00:00Z',
    entregado_en: '2026-10-06T10:30:00Z',
    entregado_por_email: 'empleado@cine.com',
    productos: [
      {
        nombre_producto: 'Combo Mega',
        categoria_producto: 'combos',
        cantidad: 1,
        precio_unitario: 12000,
        subtotal: 12000
      },
      {
        nombre_producto: 'Gaseosa Mediana',
        categoria_producto: 'bebidas',
        cantidad: 2,
        precio_unitario: 3250,
        subtotal: 6500
      }
    ]
  };

  const mockResultadoYaEntregado: ResultadoValidarEntregaCandy = {
    ok: false,
    estado_validacion: 'ya_entregado',
    mensaje: 'Este pedido de Candy Bar ya fue entregado previamente.',
    codigo_alfanumerico: 'CD-4A7P-8X2M',
    total: 18500,
    total_unidades: 3,
    fecha_compra: '2026-10-06T10:00:00Z',
    entregado_en: '2026-10-06T10:15:00Z',
    entregado_por_email: 'validador1@cine.com',
    productos: [
      {
        nombre_producto: 'Combo Mega',
        categoria_producto: 'combos',
        cantidad: 1,
        precio_unitario: 12000,
        subtotal: 12000
      }
    ]
  };

  beforeEach(() => {
    mockServicioCandy = {
      validarEntregaCandy: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ValidarCandy,
        { provide: ServicioCandy, useValue: mockServicioCandy }
      ]
    });

    componente = TestBed.inject(ValidarCandy);
  });

  it('debe inicializarse en modo QR y con la cámara apagada por defecto', () => {
    componente.ngOnInit();

    expect(componente.modoActual()).toBe('qr');
    expect(componente.camaraActiva()).toBe(false);
    expect(componente.resultado()).toBeNull();
    expect(componente.cargandoValidacion()).toBe(false);
  });

  it('debe alternar modos entre QR y Manual', () => {
    componente.cambiarModo('manual');
    expect(componente.modoActual()).toBe('manual');

    componente.cambiarModo('qr');
    expect(componente.modoActual()).toBe('qr');
  });

  it('debe validar el formato estricto del código CD-XXXX-XXXX en el formulario manual', () => {
    const control = componente.formularioManual.controls.codigo;

    // Vacío
    control.setValue('');
    expect(control.valid).toBe(false);

    // Formato inválido o con caracteres ambiguos (0, O, 1, I)
    control.setValue('CD-0000-0000');
    expect(control.valid).toBe(false);

    // Formato incompleto
    control.setValue('CD-1234');
    expect(control.valid).toBe(false);

    // Formato correcto según alfabeto seguro
    control.setValue('CD-4A7P-8X2M');
    expect(control.valid).toBe(true);

    control.setValue('cd-4a7p-8x2m');
    expect(control.valid).toBe(true); // case-insensitive regex
  });

  it('debe validar un pedido exitosamente mediante ingreso manual', async () => {
    mockServicioCandy.validarEntregaCandy.mockResolvedValue(mockResultadoExito);

    componente.formularioManual.setValue({ codigo: 'CD-4A7P-8X2M' });
    await componente.enviarCodigoManual();

    expect(mockServicioCandy.validarEntregaCandy).toHaveBeenCalledWith('CD-4A7P-8X2M');
    expect(componente.resultado()).toEqual(mockResultadoExito);
    expect(componente.cargandoValidacion()).toBe(false);
  });

  it('debe procesar el rechazo de un pedido ya entregado con auditoría previa', async () => {
    mockServicioCandy.validarEntregaCandy.mockResolvedValue(mockResultadoYaEntregado);

    await componente.validarCodigo('CD-4A7P-8X2M');

    expect(componente.resultado()).toEqual(mockResultadoYaEntregado);
    expect(componente.resultado()?.ok).toBe(false);
    expect(componente.resultado()?.estado_validacion).toBe('ya_entregado');
    expect(componente.resultado()?.entregado_por_email).toBe('validador1@cine.com');
  });

  it('debe manejar rechazo de pedido cancelado', async () => {
    const mockCancelado: ResultadoValidarEntregaCandy = {
      ok: false,
      estado_validacion: 'pedido_cancelado',
      mensaje: 'El pedido se encuentra cancelado.',
      codigo_alfanumerico: 'CD-9Y3K-4W8Z',
      total: 5000
    };

    mockServicioCandy.validarEntregaCandy.mockResolvedValue(mockCancelado);

    await componente.validarCodigo('CD-9Y3K-4W8Z');

    expect(componente.resultado()?.estado_validacion).toBe('pedido_cancelado');
    expect(componente.resultado()?.ok).toBe(false);
  });

  it('debe resetear estado y formulario con validarOtro()', () => {
    componente.resultado.set(mockResultadoExito);
    componente.formularioManual.setValue({ codigo: 'CD-4A7P-8X2M' });

    componente.validarOtro();

    expect(componente.resultado()).toBeNull();
    expect(componente.formularioManual.controls.codigo.value).toBe('');
  });

  it('debe formatear precios correctamente a moneda argentina', () => {
    const texto = componente.formatearPrecio(15000);
    expect(texto).toContain('15.000');
  });
});
