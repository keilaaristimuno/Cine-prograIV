import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Butaca } from '../../../../../core/modelos/butaca';
import { Sala } from '../../../../../core/modelos/sala';
import { ServicioButacas } from '../../../../../core/servicios/servicio-butacas';
import { ServicioSalas } from '../../../../../core/servicios/servicio-salas';
import { MapaButacas } from '../../../../../shared/components/mapa-butacas/mapa-butacas';

/**
 * Pantalla administrativa para inspeccionar la distribución física de butacas
 * de una sala particular (/admin/salas/:id/butacas).
 *
 * Maneja estados de:
 * - Carga (spinner cinematográfico)
 * - Error de consulta o red con opción de reintento
 * - Sala inexistente
 * - Sala sin butacas generadas
 * - Visualización exitosa integrando el componente reutilizable MapaButacas.
 */
@Component({
  selector: 'app-mapa-sala',
  imports: [RouterLink, MapaButacas],
  templateUrl: './mapa-sala.html',
  styleUrl: './mapa-sala.scss'
})
export class MapaSala implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly servicioSalas = inject(ServicioSalas);
  private readonly servicioButacas = inject(ServicioButacas);

  readonly sala = signal<Sala | null>(null);
  readonly butacas = signal<Butaca[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    const salaId = this.activatedRoute.snapshot.paramMap.get('id');
    if (!salaId) {
      this.error.set('No se especificó un identificador de sala válido.');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    try {
      const [salaData, butacasData] = await Promise.all([
        this.servicioSalas.obtenerSalaPorId(salaId),
        this.servicioButacas.obtenerButacasPorSala(salaId)
      ]);

      if (!salaData) {
        this.error.set('La sala solicitada no existe o no fue encontrada.');
        return;
      }

      this.sala.set(salaData);
      this.butacas.set(butacasData);
    } catch (err: any) {
      console.error('Error al cargar la sala y sus butacas:', err);
      this.error.set(
        err?.message || 'Ocurrió un error al cargar la distribución de butacas.'
      );
    } finally {
      this.cargando.set(false);
    }
  }
}
