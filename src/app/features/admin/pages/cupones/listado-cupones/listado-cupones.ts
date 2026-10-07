import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CuponCliente } from '../../../../../core/modelos/fidelizacion';
import { ServicioFidelizacion } from '../../../../../core/servicios/servicio-fidelizacion';

@Component({
  selector: 'app-listado-cupones',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe, SlicePipe],
  templateUrl: './listado-cupones.html',
  styleUrl: './listado-cupones.scss'
})
export class ListadoCupones implements OnInit {
  private readonly servicioFidelizacion = inject(ServicioFidelizacion);

  readonly cupones = signal<CuponCliente[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string>('');

  readonly filtroEstado = signal<string>('todos');
  readonly textoBusqueda = signal<string>('');
  readonly codigoCopiado = signal<string | null>(null);

  readonly cuponesFiltrados = computed(() => {
    const lista = this.cupones();
    const filtro = this.filtroEstado();
    const query = this.textoBusqueda().trim().toLowerCase();
    const ahora = new Date();

    return lista.filter(c => {
      // Estado funcional
      const fechaVence = new Date(c.venceEn);
      const estaVencido = c.estado === 'vencido' || (c.estado === 'disponible' && fechaVence < ahora);
      const estadoEfectivo = c.estado === 'utilizado' ? 'utilizado' : (estaVencido ? 'vencido' : 'disponible');

      if (filtro !== 'todos' && estadoEfectivo !== filtro) {
        return false;
      }

      if (query) {
        const codigo = c.codigoCupon.toLowerCase();
        const recompensa = (c.descripcion || '').toLowerCase();
        const usuario = (c.usuarioId || '').toLowerCase();
        return codigo.includes(query) || recompensa.includes(query) || usuario.includes(query);
      }

      return true;
    });
  });

  readonly conteoPorEstado = computed(() => {
    const lista = this.cupones();
    const ahora = new Date();
    let disponibles = 0;
    let utilizados = 0;
    let vencidos = 0;

    for (const c of lista) {
      const fechaVence = new Date(c.venceEn);
      if (c.estado === 'utilizado') {
        utilizados++;
      } else if (c.estado === 'vencido' || (c.estado === 'disponible' && fechaVence < ahora)) {
        vencidos++;
      } else {
        disponibles++;
      }
    }

    return { todos: lista.length, disponibles, utilizados, vencidos };
  });

  ngOnInit(): void {
    void this.cargarCupones();
  }

  async cargarCupones(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');

    try {
      const data = await this.servicioFidelizacion.obtenerCuponesAdmin();
      this.cupones.set(data);
    } catch (err: any) {
      console.error('Error al cargar cupones de administración:', err);
      this.error.set(err.message || 'Error al obtener la lista de cupones.');
    } finally {
      this.cargando.set(false);
    }
  }

  esCuponVencido(cupon: CuponCliente): boolean {
    return cupon.estado === 'vencido' || (cupon.estado === 'disponible' && new Date(cupon.venceEn) < new Date());
  }

  obtenerEstadoVisual(cupon: CuponCliente): { etiqueta: string; clase: string } {
    if (cupon.estado === 'utilizado') {
      return { etiqueta: 'Utilizado', clase: 'badge-estado--utilizado' };
    }
    if (this.esCuponVencido(cupon)) {
      return { etiqueta: 'Vencido', clase: 'badge-estado--vencido' };
    }
    return { etiqueta: 'Disponible', clase: 'badge-estado--disponible' };
  }

  obtenerEtiquetaTipo(tipo: string): string {
    switch (tipo) {
      case 'entrada_gratis': return '🎟 Entrada Gratis';
      case 'descuento_porcentual': return '🏷 Descuento %';
      case 'descuento_monto_fijo': return '💵 Descuento $';
      case 'producto_candy': return '🍿 Candy Bar';
      default: return tipo;
    }
  }

  async copiarCodigo(codigo: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(codigo);
      this.codigoCopiado.set(codigo);
      setTimeout(() => this.codigoCopiado.set(null), 2000);
    } catch (err) {
      console.error('No se pudo copiar el código:', err);
    }
  }
}
