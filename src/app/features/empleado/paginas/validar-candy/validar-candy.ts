import {
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Html5Qrcode } from 'html5-qrcode';
import { ServicioCandy } from '../../../../core/servicios/servicio-candy';
import { ResultadoValidarEntregaCandy } from '../../../../core/modelos/compra-candy';

export type ModoIngresoCandy = 'qr' | 'manual';

@Component({
  selector: 'app-validar-candy',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './validar-candy.html',
  styleUrl: './validar-candy.scss'
})
export class ValidarCandy implements OnInit, OnDestroy {
  private readonly servicioCandy = inject(ServicioCandy);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef, { optional: true });

  readonly modoActual = signal<ModoIngresoCandy>('qr');
  readonly cargandoValidacion = signal(false);
  readonly resultado = signal<ResultadoValidarEntregaCandy | null>(null);

  // Cámara / Escáner QR
  readonly camaraActiva = signal(false);
  readonly cargandoCamara = signal(false);
  readonly errorCamara = signal('');
  private html5QrCode: Html5Qrcode | null = null;
  readonly elementoCamaraId = 'lector-qr-candy';

  // Formulario Manual: formato estricto CD-XXXX-XXXX
  readonly formularioManual = this.fb.nonNullable.group({
    codigo: [
      '',
      [
        Validators.required,
        Validators.pattern(/^CD-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/i)
      ]
    ]
  });

  ngOnInit(): void {
    // La cámara NO se enciende automáticamente por especificación.
  }

  async ngOnDestroy(): Promise<void> {
    await this.detenerCamara();
  }

  cambiarModo(modo: ModoIngresoCandy): void {
    if (this.modoActual() === modo) return;
    this.modoActual.set(modo);
    this.errorCamara.set('');

    if (modo === 'manual' && this.camaraActiva()) {
      this.detenerCamara();
    }
  }

  /**
   * Enciende la cámara para escanear el QR óptico del voucher de Candy.
   * Asegura que el contenedor exista en el DOM con dimensiones reales antes de invocar Html5Qrcode.
   */
  async iniciarCamara(): Promise<void> {
    this.errorCamara.set('');
    this.cargandoCamara.set(true);

    this.camaraActiva.set(true);
    this.cdr?.detectChanges();

    try {
      if (!this.html5QrCode) {
        this.html5QrCode = new Html5Qrcode(this.elementoCamaraId);
      }

      const configuracionEscaneo = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.floor(minEdge * 0.75);
          return {
            width: Math.max(size, 160),
            height: Math.max(size, 160)
          };
        }
      };

      const alDetectarQr = async (decodedText: string) => {
        await this.detenerCamara();
        await this.validarCodigo(decodedText);
      };

      const onErrorEscaneo = (_errorMessage: string) => {
        // Frame sin detección (comportamiento continuo normal)
      };

      try {
        await this.html5QrCode.start(
          { facingMode: 'environment' },
          configuracionEscaneo,
          alDetectarQr,
          onErrorEscaneo
        );
      } catch (errConstraint) {
        console.warn('Fallback a restricciones de cámara por defecto:', errConstraint);
        await this.html5QrCode.start(
          {},
          configuracionEscaneo,
          alDetectarQr,
          onErrorEscaneo
        );
      }
    } catch (error: any) {
      console.error('Error al encender cámara de Candy:', error);
      await this.detenerCamara();
      const msg = String(error?.message || error || '').toLowerCase();

      if (
        msg.includes('permission') ||
        msg.includes('notallowed') ||
        msg.includes('denied')
      ) {
        this.errorCamara.set(
          'Permiso denegado: permití el acceso a la cámara en el navegador para escanear el código QR.'
        );
      } else if (
        msg.includes('notfound') ||
        msg.includes('devices not found')
      ) {
        this.errorCamara.set(
          'No se encontró una cámara en este dispositivo. Podés usar la pestaña de Ingreso Manual.'
        );
      } else {
        this.errorCamara.set(
          'No se pudo inicializar la cámara. Podés ingresar el código alfanumérico manualmente.'
        );
      }
    } finally {
      this.cargandoCamara.set(false);
      this.cdr?.detectChanges();
    }
  }

  /**
   * Detiene y libera completamente el flujo de la cámara.
   */
  async detenerCamara(): Promise<void> {
    if (this.html5QrCode && this.html5QrCode.isScanning) {
      try {
        await this.html5QrCode.stop();
      } catch (err) {
        console.warn('Error al detener scanner:', err);
      }
    }
    this.camaraActiva.set(false);
    this.cargandoCamara.set(false);
    this.cdr?.detectChanges();
  }

  /**
   * Envía el código ingresado manualmente en el formulario.
   */
  async enviarCodigoManual(): Promise<void> {
    if (this.formularioManual.invalid || this.cargandoValidacion()) return;

    const codigo = this.formularioManual.getRawValue().codigo.trim().toUpperCase();
    await this.validarCodigo(codigo);
  }

  /**
   * Punto de convergencia único: valida el código mediante la RPC transaccional validar_entrega_candy.
   */
  async validarCodigo(codigo: string): Promise<void> {
    const normalizado = codigo.trim().toUpperCase();
    if (!normalizado) return;

    this.cargandoValidacion.set(true);
    this.errorCamara.set('');

    try {
      const res = await this.servicioCandy.validarEntregaCandy(normalizado);
      this.resultado.set(res);

      if (res.ok) {
        this.formularioManual.reset();
      }
    } catch (err: any) {
      console.error('Error al validar retiro de Candy:', err);
      this.resultado.set({
        ok: false,
        estado_validacion: 'codigo_invalido',
        mensaje: err.message || 'Error de comunicación al intentar validar el retiro del pedido.'
      });
    } finally {
      this.cargandoValidacion.set(false);
      this.cdr?.detectChanges();
    }
  }

  /**
   * Resetea el resultado para permitir una nueva validación en mostrador.
   */
  validarOtro(): void {
    this.resultado.set(null);
    this.errorCamara.set('');
    this.formularioManual.reset();
  }

  formatearPrecio(monto: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(monto);
  }
}
