import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ServicioAuth } from '../../../../../core/servicios/servicio-auth';
import { ServicioCandy } from '../../../../../core/servicios/servicio-candy';
import { ServicioCarritoCandy } from '../../../../../core/servicios/servicio-carrito-candy';
import {
  CASOS_PRUEBA_TARJETAS,
  CasoPruebaTarjeta,
  validadorCvv,
  validadorLuhn,
  validadorTitular,
  validadorVencimiento
} from '../../../../../core/utilidades/validadores-pago';

@Component({
  selector: 'app-pago-candy',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './pago-candy.html',
  styleUrl: './pago-candy.scss'
})
export class PagoCandy implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly servicioCandy = inject(ServicioCandy);
  readonly carrito = inject(ServicioCarritoCandy);
  private readonly servicioAuth = inject(ServicioAuth);

  readonly procesando = signal<boolean>(false);
  readonly errorPago = signal<string | null>(null);
  readonly errorStock = signal<string | null>(null);

  readonly casosPrueba: CasoPruebaTarjeta[] = CASOS_PRUEBA_TARJETAS;

  /** Formulario reactivo para contacto y simulación de tarjeta */
  readonly formularioPago: FormGroup = this.fb.group({
    emailContacto: [
      '',
      [Validators.required, Validators.email]
    ],
    numeroTarjeta: ['', [Validators.required, validadorLuhn]],
    nombreTitular: ['', [Validators.required, validadorTitular]],
    vencimiento: ['', [Validators.required, validadorVencimiento]],
    cvv: ['', [Validators.required, validadorCvv]]
  });

  private readonly numeroTarjetaValor = toSignal(
    this.formularioPago.get('numeroTarjeta')!.valueChanges,
    { initialValue: '' }
  );

  /** Detección reactiva de marca de tarjeta */
  readonly marcaTarjeta = computed<'visa' | 'mastercard' | 'generica'>(() => {
    const raw = this.numeroTarjetaValor() || this.formularioPago.get('numeroTarjeta')?.value || '';
    const num = raw.replace(/\D/g, '');
    if (num.startsWith('4')) return 'visa';
    if (num.startsWith('5') || num.startsWith('2')) return 'mastercard';
    return 'generica';
  });

  ngOnInit(): void {
    // Si el carrito está vacío al entrar directamente a /candy/pago, redirigir al catálogo
    if (this.carrito.estaVacio()) {
      this.router.navigate(['/candy']);
      return;
    }

    // Prellenar email si el usuario ya está autenticado
    const usuario = this.servicioAuth.usuarioActual();
    if (usuario?.email) {
      this.formularioPago.patchValue({ emailContacto: usuario.email });
    }
  }

  formatearPrecio(monto: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(monto);
  }

  /**
   * Carga los datos de una tarjeta de prueba en el formulario para agilizar la prueba.
   */
  aplicarCasoPrueba(caso: CasoPruebaTarjeta): void {
    this.errorPago.set(null);
    this.errorStock.set(null);

    this.formularioPago.patchValue({
      numeroTarjeta: caso.numero,
      nombreTitular: caso.titular,
      vencimiento: caso.vencimiento,
      cvv: caso.cvv
    });
    this.formularioPago.markAsDirty();
  }

  /**
   * Da formato al número de tarjeta en bloques de 4 dígitos (XXXX XXXX XXXX XXXX).
   */
  formatearNumeroTarjeta(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/\D/g, '').substring(0, 16);
    const partes = limpio.match(/.{1,4}/g);
    input.value = partes ? partes.join(' ') : limpio;
    this.formularioPago.get('numeroTarjeta')?.setValue(input.value, { emitEvent: false });
  }

  /**
   * Da formato a la fecha de vencimiento (MM/AA).
   */
  formatearFechaVencimiento(event: Event): void {
    const input = event.target as HTMLInputElement;
    let limpio = input.value.replace(/\D/g, '').substring(0, 4);
    if (limpio.length >= 3) {
      limpio = `${limpio.substring(0, 2)}/${limpio.substring(2)}`;
    }
    input.value = limpio;
    this.formularioPago.get('vencimiento')?.setValue(input.value, { emitEvent: false });
  }

  /**
   * Procesa la simulación de pago bancario y ejecuta la compra atómica en Supabase.
   */
  async confirmarPagoCandy(): Promise<void> {
    if (this.formularioPago.invalid) {
      this.formularioPago.markAllAsTouched();
      return;
    }

    if (this.carrito.estaVacio()) {
      this.errorStock.set('El carrito está vacío. Agregá productos antes de pagar.');
      return;
    }

    this.procesando.set(true);
    this.errorPago.set(null);
    this.errorStock.set(null);

    try {
      // 1. Simulación de procesamiento bancario (latencia de red)
      await new Promise(resolve => setTimeout(resolve, 800));

      const { numeroTarjeta, emailContacto } = this.formularioPago.getRawValue();
      const numLimpio = numeroTarjeta.replace(/\D/g, '');

      // Simulación de rechazo por fondos insuficientes con tarjeta de prueba
      if (numLimpio === '4000000000000002') {
        this.errorPago.set(
          'Transacción denegada por la entidad bancaria: fondos insuficientes o tarjeta rechazada.'
        );
        this.procesando.set(false);
        return;
      }

      // 2. Ejecutar la compra atómica en PostgreSQL solo después de la aprobación del pago
      const lineasPayload = this.carrito.items().map(it => ({
        productoId: it.producto.id,
        cantidad: it.cantidad
      }));

      const resultado = await this.servicioCandy.realizarCompra({
        emailContacto: emailContacto.trim(),
        lineas: lineasPayload
      });

      // 3. Vaciar carrito en memoria y localStorage tras éxito
      this.carrito.vaciarCarrito();

      // 4. Navegar a la página de confirmación/voucher pasando el estado estructurado
      await this.router.navigate(['/candy/confirmacion', resultado.compra_id], {
        state: { resultadoCompraCandy: resultado }
      });
    } catch (err: any) {
      console.error('Error al procesar la compra de Candy:', err);

      const mensaje = err.message || '';
      if (mensaje.includes('Stock insuficiente') || mensaje.includes('inactivo') || mensaje.includes('ya no se encuentran disponibles')) {
        this.errorStock.set(
          `${mensaje} Por favor, revisá tu carrito e intentá nuevamente.`
        );
      } else {
        this.errorPago.set(
          mensaje || 'Ocurrió un error inesperado al procesar el pago. Por favor, intentá nuevamente.'
        );
      }
    } finally {
      this.procesando.set(false);
    }
  }
}
