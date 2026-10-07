import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CuponCliente } from '../../../../core/modelos/fidelizacion';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';
import { ServicioFidelizacion } from '../../../../core/servicios/servicio-fidelizacion';

import { CabeceraCuenta } from '../../componentes/cabecera-cuenta/cabecera-cuenta';

export type FiltroEstadoCupon = 'todos' | 'disponible' | 'utilizado' | 'vencido';

@Component({
  selector: 'app-cupones',
  imports: [RouterLink, CabeceraCuenta],
  templateUrl: './cupones.html',
  styleUrl: './cupones.scss'
})
export class Cupones implements OnInit {
  private readonly servicioFidelizacion = inject(ServicioFidelizacion);
  private readonly servicioAuth = inject(ServicioAuth);
  private readonly router = inject(Router);

  readonly cupones = signal<CuponCliente[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  // Filtro activo
  readonly filtroSeleccionado = signal<FiltroEstadoCupon>('todos');

  // Feedback de copiado en portapapeles
  readonly codigoCopiado = signal<string | null>(null);

  // Cupones filtrados
  readonly cuponesFiltrados = computed(() => {
    const lista = this.cupones();
    const filtro = this.filtroSeleccionado();
    const ahora = new Date();

    return lista.filter(c => {
      // Estado efectivo derivado (si vence_en < ahora -> vencido)
      const esVencido = c.estado === 'vencido' || (c.estado === 'disponible' && new Date(c.venceEn) < ahora);
      const estadoEfectivo = esVencido ? 'vencido' : c.estado;

      if (filtro === 'todos') return true;
      if (filtro === 'vencido') return estadoEfectivo === 'vencido';
      if (filtro === 'disponible') return estadoEfectivo === 'disponible';
      if (filtro === 'utilizado') return estadoEfectivo === 'utilizado';
      return true;
    });
  });

  ngOnInit(): void {
    void this.inicializar();
  }

  async inicializar(): Promise<void> {
    await this.servicioAuth.asegurarSesionLista();
    if (!this.servicioAuth.estaAutenticado()) {
      await this.router.navigate(['/iniciar-sesion'], {
        queryParams: { redirect: '/mi-cuenta/cupones' }
      });
      return;
    }

    await this.cargarCupones();
  }

  async cargarCupones(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');

    try {
      const data = await this.servicioFidelizacion.obtenerMisCupones();
      this.cupones.set(data);
    } catch (err: any) {
      console.error('Error al cargar cupones:', err);
      this.error.set(err.message || 'No pudimos cargar tus cupones.');
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarFiltro(filtro: FiltroEstadoCupon): void {
    this.filtroSeleccionado.set(filtro);
  }

  async copiarCodigo(codigo: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(codigo);
      this.codigoCopiado.set(codigo);
      setTimeout(() => {
        if (this.codigoCopiado() === codigo) {
          this.codigoCopiado.set(null);
        }
      }, 2500);
    } catch (e) {
      console.error('Error al copiar al portapapeles:', e);
    }
  }

  formatearFecha(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  obtenerEstadoEfectivo(c: CuponCliente): 'disponible' | 'utilizado' | 'vencido' | 'cancelado' {
    if (c.estado === 'vencido') return 'vencido';
    if (c.estado === 'disponible' && new Date(c.venceEn) < new Date()) {
      return 'vencido';
    }
    return c.estado;
  }
}
