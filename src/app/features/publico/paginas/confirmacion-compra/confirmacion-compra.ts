import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ResultadoCompra } from '../../../../core/modelos/compra';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';
import { ServicioCompras } from '../../../../core/servicios/servicio-compras';

/**
 * Pantalla de confirmación de compra exitosa (/compra/:id/confirmacion).
 *
 * Características de seguridad y privacidad:
 * - Para compras anónimas, consume de manera inmediata el objeto ResultadoCompra
 *   proveniente de la RPC de compra a través del estado de navegación (history.state),
 *   evitando abrir permisos públicos indiscriminados de SELECT en la tabla 'compras'.
 * - Para usuarios registrados, si recargan la página, recupera su compra desde la base
 *   de datos validando RLS (usuario_id = auth.uid()).
 * - Muestra el identificador de orden, película, función, sala y detalle de butacas adquiridas.
 */
@Component({
  selector: 'app-confirmacion-compra',
  imports: [RouterLink],
  templateUrl: './confirmacion-compra.html',
  styleUrl: './confirmacion-compra.scss'
})
export class ConfirmacionCompra implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicioCompras = inject(ServicioCompras);
  private readonly servicioAuth = inject(ServicioAuth);

  readonly compraId = signal<string>('');
  readonly compra = signal<ResultadoCompra | null>(null);
  readonly cargando = signal<boolean>(true);
  readonly esAnonimoSinState = signal<boolean>(false);

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
