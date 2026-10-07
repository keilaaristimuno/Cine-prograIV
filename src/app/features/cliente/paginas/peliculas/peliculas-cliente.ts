import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ServicioCompras } from '../../../../core/servicios/servicio-compras';
import { CabeceraCuenta } from '../../componentes/cabecera-cuenta/cabecera-cuenta';

export interface PeliculaClienteItem {
  peliculaId: string;
  nombre: string;
  imagenUrl: string | null;
  clasificacionEdad: string;
  generos: string[];
  ultimaFechaFuncion: string;
  totalCompras: number;
  totalEntradas: number;
  asistenciaValidada: boolean;
  ultimaFechaValidacion: string | null;
}

@Component({
  selector: 'app-peliculas-cliente',
  standalone: true,
  imports: [CommonModule, RouterLink, CabeceraCuenta],
  templateUrl: './peliculas-cliente.html',
  styleUrl: './peliculas-cliente.scss'
})
export class PeliculasCliente implements OnInit {
  private readonly servicioCompras = inject(ServicioCompras);

  readonly peliculas = signal<PeliculaClienteItem[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  /** Filtros */
  readonly filtroAsistencia = signal<'todas' | 'validadas' | 'pendientes'>('todas');
  readonly terminoBusqueda = signal<string>('');

  readonly peliculasFiltradas = computed<PeliculaClienteItem[]>(() => {
    let items = this.peliculas();
    const filtro = this.filtroAsistencia();
    const busqueda = this.terminoBusqueda().trim().toLowerCase();

    if (filtro === 'validadas') {
      items = items.filter(p => p.asistenciaValidada);
    } else if (filtro === 'pendientes') {
      items = items.filter(p => !p.asistenciaValidada);
    }

    if (busqueda) {
      items = items.filter(p => {
        const nombre = p.nombre.toLowerCase();
        const tieneGenero = p.generos.some(g => g.toLowerCase().includes(busqueda));
        return nombre.includes(busqueda) || tieneGenero;
      });
    }

    return items;
  });

  async ngOnInit(): Promise<void> {
    await this.cargarPeliculas();
  }

  async cargarPeliculas(): Promise<void> {
    try {
      this.cargando.set(true);
      this.error.set(null);

      const compras = await this.servicioCompras.obtenerMisCompras();
      const mapaPeliculas = new Map<string, PeliculaClienteItem>();

      for (const compra of compras) {
        const id = compra.funcion.pelicula_id || compra.funcion.pelicula_nombre;
        if (!id) continue;

        const existente = mapaPeliculas.get(id);
        const cantButacas = compra.butacas?.length ?? 1;
        const validado = Boolean(compra.acceso_sala_validado);

        if (!existente) {
          mapaPeliculas.set(id, {
            peliculaId: compra.funcion.pelicula_id || id,
            nombre: compra.funcion.pelicula_nombre,
            imagenUrl: compra.funcion.pelicula_imagen_url || null,
            clasificacionEdad: compra.funcion.clasificacion_edad || 'ATP',
            generos: compra.funcion.pelicula_generos || [],
            ultimaFechaFuncion: compra.funcion.fecha_hora_inicio,
            totalCompras: 1,
            totalEntradas: cantButacas,
            asistenciaValidada: validado,
            ultimaFechaValidacion: validado ? compra.acceso_sala_validado_en || null : null
          });
        } else {
          existente.totalCompras += 1;
          existente.totalEntradas += cantButacas;

          if (validado) {
            existente.asistenciaValidada = true;
            if (compra.acceso_sala_validado_en && (!existente.ultimaFechaValidacion || compra.acceso_sala_validado_en > existente.ultimaFechaValidacion)) {
              existente.ultimaFechaValidacion = compra.acceso_sala_validado_en;
            }
          }

          if (compra.funcion.fecha_hora_inicio > existente.ultimaFechaFuncion) {
            existente.ultimaFechaFuncion = compra.funcion.fecha_hora_inicio;
          }
        }
      }

      // Ordenar por última función vista/comprada descendente
      const lista = Array.from(mapaPeliculas.values()).sort(
        (a, b) => new Date(b.ultimaFechaFuncion).getTime() - new Date(a.ultimaFechaFuncion).getTime()
      );

      this.peliculas.set(lista);
    } catch (err: any) {
      console.error('Error al cargar películas del cliente:', err);
      this.error.set(
        err.message || 'No se pudieron cargar tus películas. Por favor, intentá nuevamente.'
      );
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarFiltro(filtro: 'todas' | 'validadas' | 'pendientes'): void {
    this.filtroAsistencia.set(filtro);
  }

  actualizarBusqueda(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.terminoBusqueda.set(input.value || '');
  }
}
