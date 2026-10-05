import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ValidarEntrada } from './validar-entrada';
import { ServicioCompras } from '../../../../core/servicios/servicio-compras';
import { ResultadoValidacionAcceso } from '../../../../core/modelos/validacion-acceso';

describe('ValidarEntrada Component (M5.4)', () => {
  let componente: ValidarEntrada;
  let mockServicioCompras: {
    validarAccesoSala: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockServicioCompras = {
      validarAccesoSala: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ValidarEntrada,
        { provide: ServicioCompras, useValue: mockServicioCompras }
      ]
    });

    componente = TestBed.inject(ValidarEntrada);
  });

  it('debe crearse correctamente con modo inicial en "qr" y cámara apagada', () => {
    expect(componente).toBeDefined();
    expect(componente.modoActual()).toBe('qr');
    expect(componente.camaraActiva()).toBe(false);
    expect(componente.resultado()).toBeNull();
  });

  it('debe alternar modos entre "qr" y "manual"', () => {
    componente.cambiarModo('manual');
    expect(componente.modoActual()).toBe('manual');

    componente.cambiarModo('qr');
    expect(componente.modoActual()).toBe('qr');
  });

  it('debe validar el formulario manual rechazando códigos cortos o vacíos', () => {
    const form = componente.formularioManual;
    form.setValue({ codigo: '' });
    expect(form.valid).toBe(false);

    form.setValue({ codigo: '123' });
    expect(form.valid).toBe(false);

    form.setValue({ codigo: 'TK-4A2B-9C1D' });
    expect(form.valid).toBe(true);
  });

  it('debe procesar una validación exitosa (ACCESO AUTORIZADO) y poblar los datos', async () => {
    const respuestaExitosa: ResultadoValidacionAcceso = {
      ok: true,
      estado_validacion: 'autorizado',
      mensaje: 'Acceso autorizado. ¡Que disfruten la función!',
      codigo_alfanumerico: 'TK-4A2B-9C1D',
      pelicula_nombre: 'Interstellar',
      clasificacion_edad: '+13',
      formato: 'IMAX 2D',
      sala_numero: 2,
      sala_nombre: 'Sala IMAX',
      fecha_hora_inicio: '2026-10-15T21:00:00Z',
      cantidad_entradas: 2,
      butacas: [
        { fila: 'C', numero: 4, bloque: 'centro', tipo: 'normal' },
        { fila: 'C', numero: 5, bloque: 'centro', tipo: 'normal' }
      ],
      validado_en: '2026-10-15T20:50:00Z',
      validado_por_email: 'empleado@pantallamagica.com'
    };

    mockServicioCompras.validarAccesoSala.mockResolvedValue(respuestaExitosa);

    await componente.validarCodigo('tk-4a2b-9c1d');

    expect(mockServicioCompras.validarAccesoSala).toHaveBeenCalledWith('TK-4A2B-9C1D');
    expect(componente.resultado()).toEqual(respuestaExitosa);
    expect(componente.resultado()?.estado_validacion).toBe('autorizado');
  });

  it('debe procesar el caso de entrada ya utilizada (ENTRADA YA UTILIZADA)', async () => {
    const respuestaUsada: ResultadoValidacionAcceso = {
      ok: false,
      estado_validacion: 'ya_utilizado',
      mensaje: 'Esta entrada ya fue utilizada para ingresar a la sala.',
      codigo_alfanumerico: 'TK-4A2B-9C1D',
      pelicula_nombre: 'Interstellar',
      cantidad_entradas: 2,
      validado_en: '2026-10-15T20:45:00Z',
      validado_por_email: 'otro_empleado@pantallamagica.com'
    };

    mockServicioCompras.validarAccesoSala.mockResolvedValue(respuestaUsada);

    await componente.validarCodigo('TK-4A2B-9C1D');

    expect(componente.resultado()?.estado_validacion).toBe('ya_utilizado');
    expect(componente.resultado()?.ok).toBe(false);
  });

  it('debe procesar el caso de función cancelada (FUNCIÓN CANCELADA)', async () => {
    const respuestaCancelada: ResultadoValidacionAcceso = {
      ok: false,
      estado_validacion: 'funcion_cancelada',
      mensaje: 'La función correspondiente a esta entrada se encuentra cancelada.',
      codigo_alfanumerico: 'TK-CANC-1111',
      pelicula_nombre: 'Batman'
    };

    mockServicioCompras.validarAccesoSala.mockResolvedValue(respuestaCancelada);

    await componente.validarCodigo('TK-CANC-1111');

    expect(componente.resultado()?.estado_validacion).toBe('funcion_cancelada');
  });

  it('debe procesar código inexistente (ENTRADA NO VÁLIDA)', async () => {
    const respuestaInvalida: ResultadoValidacionAcceso = {
      ok: false,
      estado_validacion: 'codigo_invalido',
      mensaje: 'No se encontró ninguna compra registrada con el código ingresado.'
    };

    mockServicioCompras.validarAccesoSala.mockResolvedValue(respuestaInvalida);

    await componente.validarCodigo('TK-NOEX-9999');

    expect(componente.resultado()?.estado_validacion).toBe('codigo_invalido');
  });

  it('debe reiniciar el estado con nuevaValidacion() para atender a otro espectador', async () => {
    componente.formularioManual.setValue({ codigo: 'TK-4A2B-9C1D' });
    componente.nuevaValidacion();

    expect(componente.resultado()).toBeNull();
    expect(componente.formularioManual.get('codigo')?.value).toBeFalsy();
  });

  it('debe formatear correctamente una fecha y hora ISO para la vista del empleado', () => {
    const formateada = componente.formatearFechaHora('2026-10-15T20:30:00Z');
    expect(formateada).toBeDefined();
    expect(formateada).not.toBe('-');
  });
});
