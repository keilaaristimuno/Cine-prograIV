import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import {
  validadorCvv,
  validadorLuhn,
  validadorTitular,
  validadorVencimiento
} from './pago-simulado';

describe('Validadores de Pago Simulado (M5.2)', () => {
  describe('validadorLuhn (Algoritmo de Checksum Luhn / Módulo 10)', () => {
    it('debe aceptar números válidos según algoritmo de Luhn', () => {
      // Visa de prueba autorizada
      const controlVisa = new FormControl('4509 9535 6623 3704');
      expect(validadorLuhn(controlVisa)).toBeNull();

      // Mastercard de prueba autorizada
      const controlMaster = new FormControl('5105 1051 0510 5100');
      expect(validadorLuhn(controlMaster)).toBeNull();

      // Tarjeta para rechazo simulado por fondos (Luhn válido pero entidad rechaza)
      const controlFondos = new FormControl('4000 0000 0000 0002');
      expect(validadorLuhn(controlFondos)).toBeNull();
    });

    it('debe rechazar números que violen el checksum de Luhn (error tipográfico)', () => {
      // Tarjeta con dígito final alterado
      const controlInvalido = new FormControl('4509 9535 6623 3700');
      expect(validadorLuhn(controlInvalido)).toEqual({ luhnInvalido: true });
    });

    it('debe rechazar números con longitud fuera de rango (13 a 19 dígitos)', () => {
      const controlCorto = new FormControl('1234 5678');
      expect(validadorLuhn(controlCorto)).toEqual({ luhnLongitud: true });
    });
  });

  describe('validadorVencimiento', () => {
    it('debe aceptar fechas futuras con formato MM/AA', () => {
      const anioFuturo = (new Date().getFullYear() + 2).toString().slice(-2);
      const control = new FormControl(`12/${anioFuturo}`);
      expect(validadorVencimiento(control)).toBeNull();
    });

    it('debe rechazar fechas con formato inválido', () => {
      const control = new FormControl('13/28');
      expect(validadorVencimiento(control)).toEqual({ vencimientoFormato: true });
    });

    it('debe rechazar tarjetas vencidas en el pasado', () => {
      const control = new FormControl('01/20');
      expect(validadorVencimiento(control)).toEqual({ vencimientoExpirado: true });
    });
  });

  describe('validadorTitular', () => {
    it('debe aceptar nombres válidos con espacios y letras', () => {
      const control = new FormControl('JUAN PEREZ');
      expect(validadorTitular(control)).toBeNull();
    });

    it('debe rechazar nombres demasiado cortos', () => {
      const control = new FormControl('AB');
      expect(validadorTitular(control)).toEqual({
        minlength: { requiredLength: 3, actualLength: 2 }
      });
    });

    it('debe rechazar caracteres numéricos o símbolos en el titular', () => {
      const control = new FormControl('JUAN 123');
      expect(validadorTitular(control)).toEqual({ titularInvalido: true });
    });
  });

  describe('validadorCvv', () => {
    it('debe aceptar CVV de 3 o 4 dígitos', () => {
      expect(validadorCvv(new FormControl('123'))).toBeNull();
      expect(validadorCvv(new FormControl('1234'))).toBeNull();
    });

    it('debe rechazar CVV de longitud incorrecta o con letras', () => {
      expect(validadorCvv(new FormControl('12'))).toEqual({ cvvInvalido: true });
      expect(validadorCvv(new FormControl('12a'))).toEqual({ cvvInvalido: true });
      expect(validadorCvv(new FormControl('12345'))).toEqual({ cvvInvalido: true });
    });
  });
});
