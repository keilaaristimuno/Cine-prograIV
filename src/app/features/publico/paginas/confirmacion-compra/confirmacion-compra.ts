import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ResultadoCompra } from '../../../../core/modelos/compra';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';
import { ServicioCompras } from '../../../../core/servicios/servicio-compras';
import { ServicioPdfEntrada } from '../../../../core/servicios/servicio-pdf-entrada';

/**
 * Pantalla de confirmación de compra y Entrada Digital (/compra/:id/confirmacion).
 *
 * M5.3 — Entrada Digital + QR + PDF:
 * - Muestra la confirmación de la compra y el pase digital del cine.
 * - Genera un único código QR para toda la compra (1 compra = 1 QR de acceso grupal).
 * - Muestra el código alfanumérico legible (TK-XXXX-XXXX) debajo del QR para validación manual.
 * - Presenta póster (si está disponible), función, sala, butacas y estado de acceso.
 * - Provee descarga directa de entrada en formato PDF vectorial con jsPDF.
 * - Soporta recarga segura para usuarios registrados mediante RLS en Supabase.
 */
@Component({
  selector: 'app-confirmacion-compra',
  imports: [CommonModule, RouterLink],
  templateUrl: './confirmacion-compra.html',
  styleUrl: './confirmacion-compra.scss'
})
export class ConfirmacionCompra implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicioCompras = inject(ServicioCompras);
  private readonly servicioAuth = inject(ServicioAuth);
  private readonly servicioPdf = inject(ServicioPdfEntrada);

  readonly compraId = signal<string>('');
  readonly compra = signal<ResultadoCompra | null>(null);
  readonly cargando = signal<boolean>(true);
  readonly esAnonimoSinState = signal<boolean>(false);

  /** Código QR generado localmente en formato DataURL */
  readonly qrDataUrl = signal<string | null>(null);
  readonly generandoQr = signal<boolean>(false);
  readonly descargandoPdf = signal<boolean>(false);

  /** Computados para textos de grupo o individual */
  readonly cantidadEntradas = computed<number>(() => this.compra()?.butacas?.length ?? 1);
  readonly esEntradaGrupal = computed<boolean>(() => this.cantidadEntradas() > 1);

  constructor() {
    // Generar reactivamente el QR cuando el código alfanumérico esté disponible
    effect(async () => {
      const c = this.compra();
      const codigo = c?.codigo_alfanumerico;
      if (codigo) {
        try {
          this.generandoQr.set(true);
          const dataUrl = await this.servicioPdf.generarQrDataUrl(codigo);
          this.qrDataUrl.set(dataUrl);
        } catch (err) {
          console.error('Error al generar código QR local:', err);
        } finally {
          this.generandoQr.set(false);
        }
      }
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/']);
      return;
    }

    this.compraId.set(id);

    // 1. Intentar obtener el resultado de la compra desde el estado de navegación
    const state = history.state as { compra?: ResultadoCompra };
    if (state?.compra && state.compra.compra_id === id) {
      this.compra.set(state.compra);
      this.cargando.set(false);
      return;
    }

    // 2. Si no hay state, intentar consultar desde base de datos si el usuario está autenticado
    this.recuperarCompraDesdeBaseDeDatos(id);
  }

  private async recuperarCompraDesdeBaseDeDatos(id: string): Promise<void> {
    try {
      await this.servicioAuth.asegurarSesionLista();

      if (this.servicioAuth.estaAutenticado()) {
        const datos = await this.servicioCompras.obtenerCompraPorId(id);
        if (datos) {
          this.compra.set(datos);
          this.cargando.set(false);
          return;
        }
      }

      // Si es compra anónima recargada o no se encontró con su usuario
      this.esAnonimoSinState.set(true);
    } catch (err) {
      console.error('Error al recuperar comprobante de compra:', err);
      this.esAnonimoSinState.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  /**
   * Genera y descarga el archivo PDF de la entrada digital.
   */
  async descargarPdf(): Promise<void> {
    const c = this.compra();
    if (!c || this.descargandoPdf()) {
      return;
    }

    try {
      this.descargandoPdf.set(true);
      await this.servicioPdf.descargarEntradaPdf(c);
    } catch (err) {
      console.error('Error al generar el PDF de la entrada:', err);
    } finally {
      this.descargandoPdf.set(false);
    }
  }

  formatearFechaHora(fechaIso: string): string {
    if (!fechaIso) return '';
    const fecha = new Date(fechaIso);
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    };
    const texto = fecha.toLocaleDateString('es-AR', opciones);
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    return `${texto.charAt(0).toUpperCase() + texto.slice(1)} • ${horas}:${minutos} hs`;
  }
}
