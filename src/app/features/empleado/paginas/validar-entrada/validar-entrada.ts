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
import { ServicioCompras } from '../../../../core/servicios/servicio-compras';
import { ResultadoValidacionAcceso } from '../../../../core/modelos/validacion-acceso';

export type ModoIngreso = 'qr' | 'manual';

@Component({
  selector: 'app-validar-entrada',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './validar-entrada.html',
  styleUrl: './validar-entrada.scss'
})
export class ValidarEntrada implements OnInit, OnDestroy {
  private readonly servicioCompras = inject(ServicioCompras);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef, { optional: true });

  readonly modoActual = signal<ModoIngreso>('qr');
  readonly cargandoValidacion = signal(false);
  readonly resultado = signal<ResultadoValidacionAcceso | null>(null);

  // Cámara / Escáner QR
  readonly camaraActiva = signal(false);
  readonly cargandoCamara = signal(false);
  readonly errorCamara = signal('');
  private html5QrCode: Html5Qrcode | null = null;
  readonly elementoCamaraId = 'lector-qr-camara';

  // Formulario Manual
  readonly formularioManual = this.fb.nonNullable.group({
    codigo: [
      '',
      [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^[A-Za-z0-9-]+$/)
      ]
    ]
  });

  ngOnInit(): void {
    // La cámara NO se enciende automáticamente por especificación.
  }

  async ngOnDestroy(): Promise<void> {
    await this.detenerCamara();
  }

  cambiarModo(modo: ModoIngreso): void {
    if (this.modoActual() === modo) return;
    this.modoActual.set(modo);
    this.errorCamara.set('');

    // Si cambiamos a manual, detenemos la cámara si estaba prendida
    if (modo === 'manual' && this.camaraActiva()) {
      this.detenerCamara();
    }
  }

  /**
   * Enciende la cámara para escaneo óptico del QR de la entrada.
   * Asegura que el contenedor exista en el DOM con dimensiones reales antes de invocar Html5Qrcode.
   */
  async iniciarCamara(): Promise<void> {
    this.errorCamara.set('');
    this.cargandoCamara.set(true);

    // 1. Activar primero el estado para renderizar el contenedor en el DOM con tamaño real
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
        // Detener cámara inmediatamente al decodificar
        await this.detenerCamara();
        await this.validarCodigo(decodedText);
      };

      const onErrorEscaneo = (_errorMessage: string) => {
        // Frame sin detección (comportamiento continuo esperado)
      };

      try {
        // Intentar preferentemente con cámara trasera o cámara por defecto del sistema
        await this.html5QrCode.start(
          { facingMode: 'environment' },
          configuracionEscaneo,
          alDetectarQr,
          onErrorEscaneo
        );
      } catch (errConstraint) {
        console.warn('Fallback a restricciones de cámara por defecto:', errConstraint);
        // Fallback para cámaras de PC/notebook que no admiten facingMode environment
        await this.html5QrCode.start(
          {},
          configuracionEscaneo,
          alDetectarQr,
          onErrorEscaneo
        );
      }
    } catch (error: any) {
      console.error('Error al encender cámara:', error);
      await this.detenerCamara();
      const msg = String(error?.message || error || '').toLowerCase();

      if (
        msg.includes('permission') ||
        msg.includes('notallowed') ||
        msg.includes('denied')
      ) {
        this.errorCamara.set(
          'Permiso denegado: por favor permití el acceso a la cámara en el navegador para escanear.'
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
          'No se pudo inicializar la cámara. Podés validar la entrada mediante el código alfanumérico manual.'
        );
      }
    } finally {
      this.cargandoCamara.set(false);
      this.cdr?.detectChanges();
    }
  }

  /**
   * Detiene el flujo de la cámara y libera el hardware.
   */
  async detenerCamara(): Promise<void> {
    if (this.html5QrCode) {
      try {
        if (this.html5QrCode.isScanning) {
          await this.html5QrCode.stop();
        }
        this.html5QrCode.clear();
      } catch (err) {
        console.warn('Advertencia al detener lector QR:', err);
      } finally {
        this.camaraActiva.set(false);
        this.html5QrCode = null;
        this.cdr?.detectChanges();
      }
    } else {
      this.camaraActiva.set(false);
      this.cdr?.detectChanges();
    }
  }

  /**
   * Procesa el código manual del formulario.
   */
  async enviarCodigoManual(): Promise<void> {
    if (this.formularioManual.invalid) {
      this.formularioManual.markAllAsTouched();
      return;
    }

    const codigo = this.formularioManual.getRawValue().codigo;
    await this.validarCodigo(codigo);
  }

  /**
   * Método unificado de validación invocado por QR y por ingreso manual.
   */
  async validarCodigo(codigoBruto: string): Promise<void> {
    const codigo = codigoBruto.trim().toUpperCase();

    if (!codigo) {
      return;
    }

    this.cargandoValidacion.set(true);
    this.resultado.set(null);

    try {
      const res = await this.servicioCompras.validarAccesoSala(codigo);
      this.resultado.set(res);
    } catch (err) {
      console.error('Error al validar código:', err);
      this.resultado.set({
        ok: false,
        estado_validacion: 'error_desconocido',
        mensaje: 'Ocurrió un error inesperado al validar el acceso.',
        codigo_alfanumerico: codigo
      });
    } finally {
      this.cargandoValidacion.set(false);
    }
  }

  /**
   * Reinicia el estado para validar otra entrada.
   */
  nuevaValidacion(): void {
    this.resultado.set(null);
    this.formularioManual.reset();
    this.errorCamara.set('');
  }

  formatearFechaHora(iso?: string): string {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat('es-AR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch {
      return iso;
    }
  }
}
