import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ResultadoCompra } from '../../../../core/modelos/compra';
import { ServicioCompras } from '../../../../core/servicios/servicio-compras';
import { ServicioPdfEntrada } from '../../../../core/servicios/servicio-pdf-entrada';
import { CabeceraCuenta } from '../../componentes/cabecera-cuenta/cabecera-cuenta';

@Component({
  selector: 'app-entradas',
  standalone: true,
  imports: [CommonModule, RouterLink, CabeceraCuenta],
  templateUrl: './entradas.html',
  styleUrl: './entradas.scss'
})
export class Entradas implements OnInit {
  private readonly servicioCompras = inject(ServicioCompras);
  private readonly servicioPdf = inject(ServicioPdfEntrada);

  readonly compras = signal<ResultadoCompra[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  /** Filtros de listado */
  readonly filtroAcceso = signal<'todas' | 'pendientes' | 'validadas'>('todas');
  readonly terminoBusqueda = signal<string>('');

  /** Estado del visor de voucher / QR */
  readonly compraVoucher = signal<ResultadoCompra | null>(null);
  readonly qrDataUrl = signal<string | null>(null);
  readonly generandoQr = signal<boolean>(false);
  readonly descargandoPdfId = signal<string | null>(null);

  readonly comprasFiltradas = computed<ResultadoCompra[]>(() => {
    let items = this.compras();
    const filtro = this.filtroAcceso();
    const busqueda = this.terminoBusqueda().trim().toLowerCase();

    if (filtro === 'pendientes') {
      items = items.filter(c => !c.acceso_sala_validado);
    } else if (filtro === 'validadas') {
      items = items.filter(c => !!c.acceso_sala_validado);
    }

    if (busqueda) {
      items = items.filter(c => {
        const titulo = c.funcion.pelicula_nombre?.toLowerCase() || '';
        const codigo = c.codigo_alfanumerico?.toLowerCase() || '';
        const sala = c.funcion.sala_nombre?.toLowerCase() || '';
        return titulo.includes(busqueda) || codigo.includes(busqueda) || sala.includes(busqueda);
      });
    }

    return items;
  });

  async ngOnInit(): Promise<void> {
    await this.cargarCompras();
  }

  async cargarCompras(): Promise<void> {
    try {
      this.cargando.set(true);
      this.error.set(null);
      const data = await this.servicioCompras.obtenerMisCompras();
      this.compras.set(data);
    } catch (err: any) {
      console.error('Error al cargar mis compras:', err);
      this.error.set(
        err.message || 'No se pudieron cargar tus compras. Por favor, intentá nuevamente.'
      );
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarFiltro(filtro: 'todas' | 'pendientes' | 'validadas'): void {
    this.filtroAcceso.set(filtro);
  }

  actualizarBusqueda(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.terminoBusqueda.set(input.value || '');
  }

  async abrirVoucher(compra: ResultadoCompra): Promise<void> {
    this.compraVoucher.set(compra);
    this.qrDataUrl.set(null);

    const codigo = compra.codigo_alfanumerico;
    if (codigo) {
      try {
        this.generandoQr.set(true);
        const dataUrl = await this.servicioPdf.generarQrDataUrl(codigo);
        this.qrDataUrl.set(dataUrl);
      } catch (err) {
        console.error('Error al generar QR de entrada:', err);
      } finally {
        this.generandoQr.set(false);
      }
    }
  }

  cerrarVoucher(): void {
    this.compraVoucher.set(null);
    this.qrDataUrl.set(null);
  }

  async descargarPdf(compra: ResultadoCompra): Promise<void> {
    try {
      this.descargandoPdfId.set(compra.compra_id);
      await this.servicioPdf.descargarEntradaPdf(compra);
    } catch (err) {
      console.error('Error al descargar PDF:', err);
    } finally {
      this.descargandoPdfId.set(null);
    }
  }
}
