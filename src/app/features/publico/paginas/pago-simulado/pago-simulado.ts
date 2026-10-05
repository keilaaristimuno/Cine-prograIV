import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DatosBorradorCompra, ResultadoCompra } from '../../../../core/modelos/compra';
import { ServicioCompras } from '../../../../core/servicios/servicio-compras';

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

interface CasoPruebaTarjeta {
  id: string;
  titulo: string;
  descripcion: string;
  tipoResultado: 'aprobado' | 'rechazo_bancario' | 'luhn_invalido';
  numero: string;
  titular: string;
  vencimiento: string;
  cvv: string;
}

@Component({
  selector: 'app-pago-simulado',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './pago-simulado.html',
  styleUrl: './pago-simulado.scss'
})
export class PagoSimulado implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly servicioCompras = inject(ServicioCompras);

  readonly borrador = signal<DatosBorradorCompra | null>(null);
  readonly procesando = signal<boolean>(false);
  readonly errorPago = signal<string | null>(null);
  readonly errorConcurrencia = signal<string | null>(null);

  /** Formulario reactivo de captura de tarjeta */
  readonly formularioPago: FormGroup = this.fb.group({
    numeroTarjeta: ['', [Validators.required, validadorLuhn]],
    nombreTitular: ['', [Validators.required, validadorTitular]],
    vencimiento: ['', [Validators.required, validadorVencimiento]],
    cvv: ['', [Validators.required, validadorCvv]]
  });

  /**
   * Catálogo de tarjetas de prueba preconfiguradas y verificadas programáticamente.
   * Todos los números han sido evaluados previamente con el algoritmo de checksum de Luhn.
   */
  readonly casosPrueba: CasoPruebaTarjeta[] = [
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

  /** Detección de marca de tarjeta para visualización */
  readonly marcaTarjeta = computed<'visa' | 'mastercard' | 'generica'>(() => {
    const num = (this.formularioPago.get('numeroTarjeta')?.value || '').replace(/\D/g, '');
    if (num.startsWith('4')) return 'visa';
    if (num.startsWith('5') || num.startsWith('2')) return 'mastercard';
    return 'generica';
  });

  ngOnInit(): void {
    // 1. Recuperar el borrador en memoria desde el servicio o el historial de navegación
    const borradorServicio = this.servicioCompras.obtenerBorrador();
    const state = history.state as { borrador?: DatosBorradorCompra };
    const borradorFinal = borradorServicio || state?.borrador || null;

    if (!borradorFinal) {
      this.borrador.set(null);
      return;
    }

    this.borrador.set(borradorFinal);
  }

  /**
   * Carga rápidamente un caso de prueba para agilizar la evaluación académica.
   */
  cargarCasoPrueba(caso: CasoPruebaTarjeta): void {
    this.formularioPago.patchValue({
      numeroTarjeta: caso.numero,
      nombreTitular: caso.titular,
      vencimiento: caso.vencimiento,
      cvv: caso.cvv
    });

    this.formularioPago.markAllAsTouched();
    this.errorPago.set(null);
    this.errorConcurrencia.set(null);
  }

  /**
   * Formateo automático de número de tarjeta en bloques de 4 dígitos.
   */
  onInputNumeroTarjeta(event: Event): void {
    const input = event.target as HTMLInputElement;
    let digitos = input.value.replace(/\D/g, '');
    if (digitos.length > 19) {
      digitos = digitos.substring(0, 19);
    }
    const formateado = digitos.replace(/(\d{4})(?=\d)/g, '$1 ');
    this.formularioPago.get('numeroTarjeta')?.setValue(formateado, { emitEvent: false });
  }

  /**
   * Formateo automático de fecha de vencimiento (MM/AA).
   */
  onInputVencimiento(event: Event): void {
    const input = event.target as HTMLInputElement;
    let digitos = input.value.replace(/\D/g, '');
    if (digitos.length > 4) {
      digitos = digitos.substring(0, 4);
    }
    let formateado = digitos;
    if (digitos.length >= 3) {
      formateado = `${digitos.substring(0, 2)}/${digitos.substring(2)}`;
    }
    this.formularioPago.get('vencimiento')?.setValue(formateado, { emitEvent: false });
  }

  /**
   * Formateo de CVV limitando a dígitos numéricos.
   */
  onInputCvv(event: Event): void {
    const input = event.target as HTMLInputElement;
    let digitos = input.value.replace(/\D/g, '');
    if (digitos.length > 4) {
      digitos = digitos.substring(0, 4);
    }
    this.formularioPago.get('cvv')?.setValue(digitos, { emitEvent: false });
  }

  /**
   * Procesa la simulación de pago con tarjeta.
   *
   * Flujo de seguridad:
   * 1. Valida el formulario reactivo y las reglas de Luhn / vencimiento.
   * 2. Simula latencia de red con la entidad bancaria ficticia.
   * 3. Si la tarjeta corresponde al caso simulado de fondos insuficientes, RECHAZA la transacción
   *    sin invocar realizar_compra_entradas ni reservar butacas.
   * 4. Si el pago es aprobado, invoca la RPC atómica en PostgreSQL.
   * 5. PostgreSQL calcula y persiste los precios definitivos.
   * 6. En ningún momento se persisten ni transmiten los datos de la tarjeta.
   */
  async procesarPago(): Promise<void> {
    if (this.formularioPago.invalid) {
      this.formularioPago.markAllAsTouched();
      return;
    }

    const borradorActual = this.borrador();
    if (!borradorActual) {
      this.errorPago.set('No se encontró una orden de compra activa.');
      return;
    }

    this.procesando.set(true);
    this.errorPago.set(null);
    this.errorConcurrencia.set(null);

    // 1. Simulación de procesamiento de la pasarela bancaria
    await new Promise(resolve => setTimeout(resolve, 1000));

    const numeroLimpio = (this.formularioPago.get('numeroTarjeta')?.value || '').replace(/\D/g, '');

    // 2. Simulación de rechazo bancario por fondos insuficientes antes de tocar la base de datos
    if (numeroLimpio === '4000000000000002') {
      this.procesando.set(false);
      this.errorPago.set(
        'Pago rechazado por la entidad bancaria: fondos insuficientes o tarjeta denegada (código de simulación 51). No se realizó ningún cargo ni se confirmaron las entradas.'
      );
      return;
    }

    // 3. Pago aprobado: llamada a la RPC de PostgreSQL que es la única autoridad de precios y persistencia
    try {
      const resultado = await this.servicioCompras.realizarCompra({
        funcionId: borradorActual.funcionId,
        butacaIds: borradorActual.butacas.map(b => b.id),
        emailContacto: borradorActual.emailContacto
      });

      // 4. Limpieza de memoria
      this.servicioCompras.limpiarBorrador();
      this.formularioPago.reset();

      // 5. Redirección a confirmación con datos definitivos retornados por PostgreSQL
      const resultadoConImagen: ResultadoCompra = {
        ...resultado,
        funcion: {
          ...resultado.funcion,
          pelicula_imagen_url:
            resultado.funcion?.pelicula_imagen_url ||
            borradorActual.funcion.peliculaImagenUrl ||
            null
        }
      };

      this.router.navigate(['/compra', resultado.compra_id, 'confirmacion'], {
        state: { compra: resultadoConImagen }
      });
    } catch (err: any) {
      console.error('Error al procesar la compra en PostgreSQL:', err);
      const mensaje = err.message || '';

      if (
        mensaje.includes('ya fueron adquiridas') ||
        mensaje.includes('acaban de ser compradas') ||
        mensaje.includes('uq_entradas_funcion_butaca_activa')
      ) {
        this.errorConcurrencia.set(
          'Una o más de las butacas seleccionadas acaban de ser adquiridas por otro espectador mientras completabas el pago. No se debitó ningún importe.'
        );
      } else {
        this.errorPago.set(mensaje || 'Ocurrió un error inesperado al procesar la compra.');
      }
    } finally {
      this.procesando.set(false);
    }
  }

  /**
   * Helper para formatear fecha completa en español
   */
  formatearFechaHora(fechaIso: string): string {
    if (!fechaIso) return '';
    const fecha = new Date(fechaIso);
    const opcionesFecha: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    };
    const fechaTexto = fecha.toLocaleDateString('es-AR', opcionesFecha);
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    return `${fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1)} • ${horas}:${minutos} hs`;
  }
}
