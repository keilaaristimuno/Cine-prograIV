import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CATEGORIAS_CANDY, CategoriaCandy, ProductoCandy } from '../../../../../core/modelos/producto-candy';
import { ServicioCandy } from '../../../../../core/servicios/servicio-candy';

@Component({
  selector: 'app-listado-candy',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './listado-candy.html',
  styleUrl: './listado-candy.scss'
})
export class ListadoCandy implements OnInit {
  private readonly servicioCandy = inject(ServicioCandy);

  readonly cargando = signal<boolean>(true);
  readonly mensajeError = signal<string | null>(null);
  readonly productos = signal<ProductoCandy[]>([]);
  readonly textoBusqueda = signal<string>('');
  readonly categoriaFiltro = signal<CategoriaCandy | 'todos'>('todos');
  readonly procesandoId = signal<string | null>(null);

  readonly categoriasDisponibles = CATEGORIAS_CANDY;

  readonly productosFiltrados = computed<ProductoCandy[]>(() => {
    const listado = this.productos();
    const filtroCat = this.categoriaFiltro();
    const query = this.textoBusqueda().toLowerCase().trim();

    return listado.filter(p => {
      const coincideCat = filtroCat === 'todos' || p.categoria === filtroCat;
      const coincideTexto =
        !query ||
        p.nombre.toLowerCase().includes(query) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(query));

      return coincideCat && coincideTexto;
    });
  });

  ngOnInit(): void {
    this.cargarProductos();
  }

  async cargarProductos(): Promise<void> {
    this.cargando.set(true);
    this.mensajeError.set(null);

    try {
      const data = await this.servicioCandy.obtenerTodosLosProductos();
      this.productos.set(data);
    } catch (err: any) {
      console.error('Error al cargar productos de Candy para admin:', err);
      this.mensajeError.set(err.message || 'No se pudo cargar el catálogo de productos.');
    } finally {
      this.cargando.set(false);
    }
  }

  async alternarEstado(producto: ProductoCandy): Promise<void> {
    const nuevoEstado = !producto.estaActivo;
    this.procesandoId.set(producto.id);

    try {
      await this.servicioCandy.cambiarEstadoActivo(producto.id, nuevoEstado);
      this.productos.update(items =>
        items.map(item => (item.id === producto.id ? { ...item, estaActivo: nuevoEstado } : item))
      );
    } catch (err: any) {
      console.error('Error al cambiar estado del producto:', err);
      alert('No se pudo actualizar el estado del producto: ' + err.message);
    } finally {
      this.procesandoId.set(null);
    }
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(precio);
  }
}
