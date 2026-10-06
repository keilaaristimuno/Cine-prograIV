import { computed, effect, Injectable, signal } from '@angular/core';
import { ItemCarritoCandy } from '../modelos/compra-candy';
import { ProductoCandy } from '../modelos/producto-candy';

const CLAVE_STORAGE_CARRITO = 'pm_carrito_candy';

@Injectable({
  providedIn: 'root'
})
export class ServicioCarritoCandy {
  /** Lista reactiva de productos seleccionados en el carrito */
  private readonly itemsSignal = signal<ItemCarritoCandy[]>(this.cargarItemsDesdeStorage());

  /** Señales públicas de solo lectura */
  readonly items = this.itemsSignal.asReadonly();

  /** Cantidad total acumulada de unidades de todos los productos */
  readonly cantidadTotal = computed<number>(() => {
    return this.itemsSignal().reduce((acc, it) => acc + it.cantidad, 0);
  });

  /** Subtotal acumulado en pesos de todos los productos en el carrito */
  readonly subtotal = computed<number>(() => {
    return this.itemsSignal().reduce((acc, it) => acc + it.subtotal, 0);
  });

  /** Indicador booleano de si el carrito no tiene productos */
  readonly estaVacio = computed<boolean>(() => {
    return this.itemsSignal().length === 0;
  });

  constructor() {
    // Sincronizar automáticamente cualquier cambio de items con localStorage
    effect(() => {
      const items = this.itemsSignal();
      this.guardarEnStorage(items);
    });
  }

  /**
   * Agrega un producto al carrito o incrementa su cantidad.
   * Valida que no supere el stock conocido en el frontend.
   * Retorna true si se pudo agregar, false si no hay stock disponible.
   */
  agregarProducto(producto: ProductoCandy, cantidad: number = 1): boolean {
    if (producto.stock <= 0 || cantidad <= 0) {
      return false;
    }

    const itemsActuales = [...this.itemsSignal()];
    const indice = itemsActuales.findIndex(it => it.producto.id === producto.id);

    if (indice >= 0) {
      const itemExistente = itemsActuales[indice];
      const nuevaCantidad = itemExistente.cantidad + cantidad;

      // Impedir desde la UI superar el stock conocido
      if (nuevaCantidad > producto.stock) {
        itemsActuales[indice] = {
          ...itemExistente,
          producto,
          cantidad: producto.stock,
          subtotal: Math.round(producto.stock * producto.precio * 100) / 100
        };
      } else {
        itemsActuales[indice] = {
          ...itemExistente,
          producto,
          cantidad: nuevaCantidad,
          subtotal: Math.round(nuevaCantidad * producto.precio * 100) / 100
        };
      }
    } else {
      const cantidadInicial = Math.min(cantidad, producto.stock);
      itemsActuales.push({
        producto,
        cantidad: cantidadInicial,
        subtotal: Math.round(cantidadInicial * producto.precio * 100) / 100
      });
    }

    this.itemsSignal.set(itemsActuales);
    return true;
  }

  /**
   * Incrementa en 1 unidad un producto en el carrito respetando el stock conocido.
   */
  incrementarCantidad(productoId: string): boolean {
    const items = [...this.itemsSignal()];
    const indice = items.findIndex(it => it.producto.id === productoId);
    if (indice < 0) return false;

    const item = items[indice];
    if (item.cantidad >= item.producto.stock) {
      return false; // Alcanzó el stock límite conocido
    }

    const nuevaCantidad = item.cantidad + 1;
    items[indice] = {
      ...item,
      cantidad: nuevaCantidad,
      subtotal: Math.round(nuevaCantidad * item.producto.precio * 100) / 100
    };

    this.itemsSignal.set(items);
    return true;
  }

  /**
   * Decrementa en 1 unidad un producto en el carrito.
   * Si llega a 0, elimina el ítem.
   */
  decrementarCantidad(productoId: string): void {
    const items = [...this.itemsSignal()];
    const indice = items.findIndex(it => it.producto.id === productoId);
    if (indice < 0) return;

    const item = items[indice];
    const nuevaCantidad = item.cantidad - 1;

    if (nuevaCantidad <= 0) {
      items.splice(indice, 1);
    } else {
      items[indice] = {
        ...item,
        cantidad: nuevaCantidad,
        subtotal: Math.round(nuevaCantidad * item.producto.precio * 100) / 100
      };
    }

    this.itemsSignal.set(items);
  }

  /**
   * Elimina un producto por completo del carrito.
   */
  eliminarProducto(productoId: string): void {
    const items = this.itemsSignal().filter(it => it.producto.id !== productoId);
    this.itemsSignal.set(items);
  }

  /**
   * Vacía la totalidad de los ítems del carrito (por ejemplo, tras una compra exitosa).
   */
  vaciarCarrito(): void {
    this.itemsSignal.set([]);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(CLAVE_STORAGE_CARRITO);
      } catch (e) {
        console.warn('No se pudo limpiar localStorage:', e);
      }
    }
  }

  /**
   * Obtiene un ítem del carrito por su ID si existe.
   */
  obtenerItemPorId(productoId: string): ItemCarritoCandy | undefined {
    return this.itemsSignal().find(it => it.producto.id === productoId);
  }

  /**
   * Permite actualizar o ajustar cantidades si se detecta que el stock en el backend cambió.
   */
  ajustarPorStock(productoId: string, nuevoStock: number): void {
    const items = [...this.itemsSignal()];
    const indice = items.findIndex(it => it.producto.id === productoId);
    if (indice < 0) return;

    if (nuevoStock <= 0) {
      items.splice(indice, 1);
    } else if (items[indice].cantidad > nuevoStock) {
      const item = items[indice];
      items[indice] = {
        ...item,
        producto: { ...item.producto, stock: nuevoStock },
        cantidad: nuevoStock,
        subtotal: Math.round(nuevoStock * item.producto.precio * 100) / 100
      };
    }

    this.itemsSignal.set(items);
  }

  private cargarItemsDesdeStorage(): ItemCarritoCandy[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const crudo = localStorage.getItem(CLAVE_STORAGE_CARRITO);
      if (!crudo) return [];
      const parsed = JSON.parse(crudo);
      if (Array.isArray(parsed)) {
        return parsed.filter(item =>
          item &&
          item.producto &&
          item.producto.id &&
          typeof item.cantidad === 'number' &&
          item.cantidad > 0
        );
      }
      return [];
    } catch {
      return [];
    }
  }

  private guardarEnStorage(items: ItemCarritoCandy[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(CLAVE_STORAGE_CARRITO, JSON.stringify(items));
    } catch (e) {
      console.warn('No se pudo guardar el carrito en localStorage:', e);
    }
  }
}
