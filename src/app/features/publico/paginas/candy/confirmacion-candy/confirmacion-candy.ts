import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ResultadoCompraCandy } from '../../../../../core/modelos/compra-candy';
import { ServicioAuth } from '../../../../../core/servicios/servicio-auth';
import { ServicioCandy } from '../../../../../core/servicios/servicio-candy';
import { ServicioPdfCandy } from '../../../../../core/servicios/servicio-pdf-candy';

@Component({
  selector: 'app-confirmacion-candy',
  imports: [CommonModule, RouterLink],
  templateUrl: './confirmacion-candy.html',
  styleUrl: './confirmacion-candy.scss'
})
export class ConfirmacionCandy implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicioCandy = inject(ServicioCandy);
  private readonly servicioAuth = inject(ServicioAuth);
  private readonly servicioPdf = inject(ServicioPdfCandy);

  readonly compraId = signal<string>('');
  readonly compra = signal<ResultadoCompraCandy | null>(null);
  readonly cargando = signal<boolean>(true);
  readonly esAnonimoSinState = signal<boolean>(false);

  /** Código QR generado localmente en formato DataURL */
  readonly qrDataUrl = signal<string | null>(null);
  readonly generandoQr = signal<boolean>(false);
  readonly descargandoPdf = signal<boolean>(false);
  readonly copiadoExitoso = signal<boolean>(false);

  constructor() {
    // Generación reactiva del QR tan pronto como el código CD esté disponible
    effect(async () => {
      const c = this.compra();
      const codigo = c?.codigo_alfanumerico;
      if (codigo) {
        try {
          this.generandoQr.set(true);
          const dataUrl = await this.servicioPdf.generarQrDataUrl(codigo);
          this.qrDataUrl.set(dataUrl);
        } catch (err) {
          console.error('Error al generar código QR local de Candy:', err);
        } finally {
          this.generandoQr.set(false);
        }
      }
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.compraId.set(id);

    // 1. Intentar recuperar desde el router navigation state (inmediato tras el checkout)
    const navegacion = this.router.getCurrentNavigation();
    const stateNav = navegacion?.extras.state as { resultadoCompraCandy?: ResultadoCompraCandy } | undefined;
    const stateHistory = history.state as { resultadoCompraCandy?: ResultadoCompraCandy } | undefined;

    const resultadoEnState = stateNav?.resultadoCompraCandy || stateHistory?.resultadoCompraCandy;

    if (resultadoEnState && resultadoEnState.compra_id === id) {
      this.compra.set(resultadoEnState);
      this.cargando.set(false);
      return;
    }

    // 2. Si no está en el state (por ejemplo, recarga del navegador F5)
    this.recuperarCompra(id);
  }

  private async recuperarCompra(id: string): Promise<void> {
    this.cargando.set(true);
    await this.servicioAuth.asegurarSesionLista();

    if (!this.servicioAuth.estaAutenticado()) {
      // Compra anónima sin state: por seguridad y principio de mínimo privilegio,
      // NO se realizan consultas públicas por ID que debiliten RLS.
      this.esAnonimoSinState.set(true);
      this.cargando.set(false);
      return;
    }

    try {
      const compraRecuperada = await this.servicioCandy.obtenerCompraPorId(id);
      if (compraRecuperada) {
        this.compra.set(compraRecuperada);
      } else {
        this.esAnonimoSinState.set(true);
      }
    } catch (err) {
      console.error('Error al recuperar voucher de Candy desde Supabase:', err);
      this.esAnonimoSinState.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  formatearPrecio(monto: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(monto);
  }

  async copiarCodigo(): Promise<void> {
    const codigo = this.compra()?.codigo_alfanumerico;
    if (!codigo) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(codigo);
        this.copiadoExitoso.set(true);
        setTimeout(() => this.copiadoExitoso.set(false), 2500);
      }
    } catch (err) {
      console.warn('No se pudo copiar al portapapeles:', err);
    }
  }

  async descargarPdf(): Promise<void> {
    const c = this.compra();
    if (!c || this.descargandoPdf()) return;

    this.descargandoPdf.set(true);
    try {
      await this.servicioPdf.descargarPdf(c);
    } catch (err) {
      console.error('Error al generar PDF del voucher Candy:', err);
    } finally {
      this.descargandoPdf.set(false);
    }
  }
}
