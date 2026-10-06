import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CATEGORIAS_CANDY, CategoriaCandy, ProductoCandy } from '../../../../core/modelos/producto-candy';
import { ServicioCandy } from '../../../../core/servicios/servicio-candy';
import { ServicioCarritoCandy } from '../../../../core/servicios/servicio-carrito-candy';

@Component({
  selector: 'app-candy',
  imports: [CommonModule, FormsModule],
  templateUrl: './candy.html',
  styleUrl: './candy.scss'
})
export class Candy implements OnInit {
  private readonly servicioCandy = inject(ServicioCandy);
  private readonly router = inject(Router);
  readonly carrito = inject(ServicioCarritoCandy);

  readonly cargando = signal<boolean>(true);
  readonly mensajeError = signal<string | null>(null);
  readonly productos = signal<ProductoCandy[]>([]);
  readonly categoriaSeleccionada = signal<CategoriaCandy | 'todos'>('todos');
  readonly textoBusqueda = signal<string>('');
  readonly panelCarritoAbierto = signal<boolean>(false);

  readonly categoriasDisponibles = CATEGORIAS_CANDY;

  readonly productosFiltrados = computed<ProductoCandy[]>(() => {
    const todos = this.productos();
    const categoria = this.categoriaSeleccionada();
    const query = this.textoBusqueda().toLowerCase().trim();

    return todos.filter(p => {
      const coincideCategoria = categoria === 'todos' || p.categoria === categoria;
      const coincideBusqueda =
        !query ||
        p.nombre.toLowerCase().includes(query) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(query));

      return coincideCategoria && coincideBusqueda;
    });
  });

  readonly productosDestacados = computed<ProductoCandy[]>(() => {
    return this.productos().filter(p => p.esDestacado && p.stock > 0);
  });

  ngOnInit(): void {
    this.cargarCatalogo();
  }

  async cargarCatalogo(): Promise<void> {
    this.cargando.set(true);
    this.mensajeError.set(null);

    try {
      const data = await this.servicioCandy.obtenerProductosActivos();
      this.productos.set(data);
    } catch (err: any) {
      console.error('Error al cargar catálogo de Candy:', err);
      this.mensajeError.set(err.message || 'No se pudieron cargar los productos del Candy Bar.');
    } finally {
      this.cargando.set(false);
    }
  }

  seleccionarCategoria(cat: CategoriaCandy | 'todos'): void {
    this.categoriaSeleccionada.set(cat);
  }

  actualizarBusqueda(texto: string): void {
    this.textoBusqueda.set(texto);
  }

  limpiarFiltros(): void {
    this.categoriaSeleccionada.set('todos');
    this.textoBusqueda.set('');
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(precio);
  }

  obtenerIconoCategoria(categoria: CategoriaCandy): string {
    switch (categoria) {
      case 'combos':
        return '🍿🥤';
      case 'pochoclos':
        return '🍿';
      case 'bebidas':
        return '🥤';
      case 'snacks':
        return '🍫';
      default:
        return '🍿';
    }
  }

  obtenerCantidadEnCarrito(productoId: string): number {
    return this.carrito.obtenerItemPorId(productoId)?.cantidad ?? 0;
  }

  agregarAlCarrito(producto: ProductoCandy, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const exito = this.carrito.agregarProducto(producto, 1);
    if (exito) {
      this.panelCarritoAbierto.set(true);
    }
  }

  incrementarEnCarrito(productoId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.carrito.incrementarCantidad(productoId);
  }

  decrementarEnCarrito(productoId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.carrito.decrementarCantidad(productoId);
  }

  eliminarDelCarrito(productoId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.carrito.eliminarProducto(productoId);
  }

  abrirCarrito(): void {
    this.panelCarritoAbierto.set(true);
  }

  cerrarCarrito(): void {
    this.panelCarritoAbierto.set(false);
  }

  irAlPago(): void {
    if (this.carrito.estaVacio()) return;
    this.cerrarCarrito();
    this.router.navigate(['/candy/pago']);
  }
}
