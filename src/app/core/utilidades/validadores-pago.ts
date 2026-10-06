import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Validador de formato y consistencia de número de tarjeta mediante el algoritmo de Luhn (módulo 10).
 *
 * NOTA DE SEGURIDAD / ARQUITECTURA:
 * El algoritmo de Luhn es una fórmula de suma de comprobación matemática (checksum) utilizada para
 * detectar errores tipográficos o accidentales en números de tarjetas. NO constituye una validación
 * criptográfica, ni comprueba la existencia de fondos, ni autentica la tarjeta ante una red bancaria.
 */
export function validadorLuhn(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (!valor) return null;

  const digitos = valor.replace(/\D/g, '');
  if (digitos.length < 13 || digitos.length > 19) {
    return { luhnLongitud: true };
  }

  let suma = 0;
  let alternar = false;
  for (let i = digitos.length - 1; i >= 0; i--) {
    let n = parseInt(digitos.charAt(i), 10);
    if (alternar) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    suma += n;
    alternar = !alternar;
  }

  return suma % 10 === 0 ? null : { luhnInvalido: true };
}

/**
 * Validador de fecha de expiración en formato MM/AA.
 * Comprueba formato mensual válido (01-12) y que la fecha sea igual o posterior al mes y año corrientes.
 */
export function validadorVencimiento(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (!valor) return null;

  const limpio = valor.replace(/\s+/g, '');
  const regex = /^(0[1-9]|1[0-2])\/(\d{2})$/;
  if (!regex.test(limpio)) {
    return { vencimientoFormato: true };
  }

  const partes = limpio.split('/');
  const mes = parseInt(partes[0], 10);
  const anio = parseInt(partes[1], 10) + 2000;

  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;

  if (anio < anioActual || (anio === anioActual && mes < mesActual)) {
    return { vencimientoExpirado: true };
  }

  return null;
}

/**
 * Validador para nombre del titular de la tarjeta (mínimo 3 caracteres, solo letras y espacios).
 */
export function validadorTitular(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (!valor || !valor.trim()) return null;

  const texto = valor.trim();
  if (texto.length < 3) {
    return { minlength: { requiredLength: 3, actualLength: texto.length } };
  }

  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(texto)) {
    return { titularInvalido: true };
  }

  return null;
}

/**
 * Validador de código de seguridad (CVV/CVC de 3 o 4 dígitos numéricos).
 */
export function validadorCvv(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (!valor) return null;

  const digitos = valor.replace(/\D/g, '');
  if (!/^\d{3,4}$/.test(digitos)) {
    return { cvvInvalido: true };
  }

  return null;
}

export interface CasoPruebaTarjeta {
  id: string;
  titulo: string;
  descripcion: string;
  tipoResultado: 'aprobado' | 'rechazo_bancario' | 'luhn_invalido';
  numero: string;
  titular: string;
  vencimiento: string;
  cvv: string;
}

/**
 * Catálogo de tarjetas de prueba preconfiguradas y verificadas programáticamente.
 */
export const CASOS_PRUEBA_TARJETAS: CasoPruebaTarjeta[] = [
  {
    id: 'visa_aprobada',
    titulo: 'Visa (Aprobada)',
    descripcion: 'Pasa checksum Luhn y simula transacción bancaria exitosa.',
    tipoResultado: 'aprobado',
    numero: '4509 9535 6623 3704',
    titular: 'JUAN PEREZ',
    vencimiento: '12/28',
    cvv: '123'
  },
  {
    id: 'mastercard_aprobada',
    titulo: 'Mastercard (Aprobada)',
    descripcion: 'Pasa checksum Luhn y simula transacción bancaria exitosa.',
    tipoResultado: 'aprobado',
    numero: '5105 1051 0510 5100',
    titular: 'MARIA GOMEZ',
    vencimiento: '10/29',
    cvv: '456'
  },
  {
    id: 'fondos_insuficientes',
    titulo: 'Rechazo Bancario (Fondos Insuficientes)',
    descripcion: 'Pasa checksum Luhn, pero la entidad bancaria simula rechazo por fondos.',
    tipoResultado: 'rechazo_bancario',
    numero: '4000 0000 0000 0002',
    titular: 'CARLOS LOPEZ',
    vencimiento: '08/27',
    cvv: '789'
  },
  {
    id: 'luhn_erroneo',
    titulo: 'Checksum Inválido (Falla de Luhn)',
    descripcion: 'Número con dígito de control corrupto. Falla la validación matemática.',
    tipoResultado: 'luhn_invalido',
    numero: '4509 9535 6623 3700',
    titular: 'ANA RODRIGUEZ',
    vencimiento: '11/27',
    cvv: '321'
  }
];
