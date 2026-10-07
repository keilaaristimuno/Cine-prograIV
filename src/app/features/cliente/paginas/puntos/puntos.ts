import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  MovimientoPuntos,
  PanelFidelizacionCliente,
  Recompensa,
  ResultadoCanje
} from '../../../../core/modelos/fidelizacion';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';
import { ServicioFidelizacion } from '../../../../core/servicios/servicio-fidelizacion';

import { CabeceraCuenta } from '../../componentes/cabecera-cuenta/cabecera-cuenta';

@Component({
  selector: 'app-puntos',
  imports: [RouterLink, CabeceraCuenta],
  templateUrl: './puntos.html',
  styleUrl: './puntos.scss'
})
export class Puntos implements OnInit {
  private readonly servicioFidelizacion = inject(ServicioFidelizacion);
  private readonly servicioAuth = inject(ServicioAuth);
  private readonly router = inject(Router);

  readonly panel = signal<PanelFidelizacionCliente | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');

  // Estado del canje en curso
  readonly canjeandoId = signal<string | null>(null);
  readonly resultadoCanje = signal<ResultadoCanje | null>(null);
  readonly errorCanje = signal('');

  // Saldo reactivo
  readonly saldoActual = computed(() => this.panel()?.saldoPuntos ?? 0);
  readonly recompensas = computed(() => this.panel()?.recompensas ?? []);
  readonly movimientos = computed(() => this.panel()?.movimientos ?? []);

  ngOnInit(): void {
    void this.inicializar();
  }

  async inicializar(): Promise<void> {
    await this.servicioAuth.asegurarSesionLista();
    if (!this.servicioAuth.estaAutenticado()) {
      await this.router.navigate(['/iniciar-sesion'], {
        queryParams: { redirect: '/mi-cuenta/puntos' }
      });
      return;
    }

    await this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');

    try {
      const data = await this.servicioFidelizacion.obtenerMiFidelizacion();
      this.panel.set(data);
    } catch (err: any) {
      console.error('Error al cargar panel de puntos:', err);
      this.error.set(err.message || 'No pudimos cargar tus puntos y recompensas.');
    } finally {
      this.cargando.set(false);
    }
  }

  async ejecutarCanje(recompensa: Recompensa): Promise<void> {
    this.errorCanje.set('');
    this.resultadoCanje.set(null);
    this.canjeandoId.set(recompensa.id);

    try {
      const res = await this.servicioFidelizacion.canjearRecompensa(recompensa.id);
      if (!res.ok) {
        this.errorCanje.set(res.mensaje);
        return;
      }

      this.resultadoCanje.set(res);
      // Recargar datos para actualizar saldo y lista de movimientos
      await this.cargarDatos();
    } catch (err: any) {
      console.error('Error al canjear recompensa:', err);
      this.errorCanje.set(err.message || 'Ocurrió un error al procesar el canje.');
    } finally {
      this.canjeandoId.set(null);
    }
  }

  cerrarModalExito(): void {
    this.resultadoCanje.set(null);
  }

  formatearFecha(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  obtenerEtiquetaTipo(tipo: string): string {
    switch (tipo) {
      case 'entrada_gratis':
        return '🎟 Entrada Gratis';
      case 'descuento_porcentual':
        return '🏷 Descuento %';
      case 'descuento_monto_fijo':
        return '💵 Descuento $';
      case 'producto_candy':
        return '🍿 Producto Candy';
      default:
        return '⭐ Beneficio';
    }
  }
}
