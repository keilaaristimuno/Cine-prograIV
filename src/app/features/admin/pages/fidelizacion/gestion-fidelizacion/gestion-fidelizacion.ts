import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  DatosNuevaRecompensa,
  Recompensa,
  TipoBeneficio
} from '../../../../../core/modelos/fidelizacion';
import { ServicioFidelizacion } from '../../../../../core/servicios/servicio-fidelizacion';

@Component({
  selector: 'app-gestion-fidelizacion',
  imports: [RouterLink, FormsModule, DecimalPipe],
  templateUrl: './gestion-fidelizacion.html',
  styleUrl: './gestion-fidelizacion.scss'
})
export class GestionFidelizacion implements OnInit {
  private readonly servicioFidelizacion = inject(ServicioFidelizacion);

  // 1. Estado de Configuración Comercial
  readonly pesosPorPunto = signal<number>(1);
  readonly fidelizacionActiva = signal<boolean>(true);
  readonly guardandoConfig = signal<boolean>(false);
  readonly mensajeConfig = signal<string>('');
  readonly errorConfig = signal<string>('');

  // 2. Estado de Catálogo de Recompensas
  readonly recompensas = signal<Recompensa[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string>('');

  // 3. Modal de Creación / Edición
  readonly modalAbierto = signal<boolean>(false);
  readonly recompensaEditandoId = signal<string | null>(null);
  readonly guardandoRecompensa = signal<boolean>(false);
  readonly errorModal = signal<string>('');

  // Campos del formulario modal
  formNombre = '';
  formDescripcion = '';
  formCostoPuntos = 1000;
  formTipo: TipoBeneficio = 'entrada_gratis';
  formValorBeneficio = 1;
  formDiasValidez = 30;
  formActiva = true;

  ngOnInit(): void {
    void this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');

    try {
      const [config, lista] = await Promise.all([
        this.servicioFidelizacion.obtenerConfiguracionFidelizacion(),
        this.servicioFidelizacion.obtenerRecompensasAdmin()
      ]);

      this.pesosPorPunto.set(config.pesosPorPunto);
      this.fidelizacionActiva.set(config.fidelizacionActiva);
      this.recompensas.set(lista);
    } catch (err: any) {
      console.error('Error al cargar gestión de fidelización:', err);
      this.error.set(err.message || 'Error al cargar datos de fidelización.');
    } finally {
      this.cargando.set(false);
    }
  }

  async guardarConfiguracion(): Promise<void> {
    this.guardandoConfig.set(true);
    this.mensajeConfig.set('');
    this.errorConfig.set('');

    const pesos = Number(this.pesosPorPunto());
    if (pesos <= 0) {
      this.errorConfig.set('El valor en pesos por punto debe ser mayor a 0.');
      this.guardandoConfig.set(false);
      return;
    }

    try {
      await this.servicioFidelizacion.actualizarConfiguracionFidelizacion(
        pesos,
        this.fidelizacionActiva()
      );
      this.mensajeConfig.set('¡Configuración actualizada con éxito!');
      setTimeout(() => this.mensajeConfig.set(''), 3000);
    } catch (err: any) {
      console.error('Error al actualizar configuración:', err);
      this.errorConfig.set(err.message || 'Error al guardar configuración.');
    } finally {
      this.guardandoConfig.set(false);
    }
  }

  async alternarEstado(recompensa: Recompensa): Promise<void> {
    const nuevoEstado = !recompensa.activa;
    try {
      await this.servicioFidelizacion.alternarEstadoRecompensa(recompensa.id, nuevoEstado);
      this.recompensas.update(lista =>
        lista.map(r => (r.id === recompensa.id ? { ...r, activa: nuevoEstado } : r))
      );
    } catch (err: any) {
      console.error('Error al alternar estado:', err);
      alert('No se pudo actualizar el estado de la recompensa.');
    }
  }

  abrirModalNuevo(): void {
    this.recompensaEditandoId.set(null);
    this.formNombre = '';
    this.formDescripcion = '';
    this.formCostoPuntos = 1000;
    this.formTipo = 'entrada_gratis';
    this.formValorBeneficio = 1;
    this.formDiasValidez = 30;
    this.formActiva = true;
    this.errorModal.set('');
    this.modalAbierto.set(true);
  }

  abrirModalEditar(r: Recompensa): void {
    this.recompensaEditandoId.set(r.id);
    this.formNombre = r.nombre;
    this.formDescripcion = r.descripcion;
    this.formCostoPuntos = r.costoPuntos;
    this.formTipo = r.tipo;
    this.formValorBeneficio = r.valorBeneficio;
    this.formDiasValidez = r.diasValidez;
    this.formActiva = r.activa;
    this.errorModal.set('');
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  async guardarModalRecompensa(): Promise<void> {
    this.errorModal.set('');

    if (!this.formNombre.trim()) {
      this.errorModal.set('El nombre de la recompensa es obligatorio.');
      return;
    }
    if (this.formCostoPuntos <= 0) {
      this.errorModal.set('El costo en puntos debe ser mayor a 0.');
      return;
    }
    if (this.formDiasValidez <= 0) {
      this.errorModal.set('Los días de validez deben ser mayores a 0.');
      return;
    }

    this.guardandoRecompensa.set(true);

    const datos: DatosNuevaRecompensa = {
      nombre: this.formNombre,
      descripcion: this.formDescripcion,
      costoPuntos: this.formCostoPuntos,
      tipo: this.formTipo,
      valorBeneficio: this.formValorBeneficio,
      diasValidez: this.formDiasValidez,
      activa: this.formActiva
    };

    try {
      const id = this.recompensaEditandoId() ?? undefined;
      await this.servicioFidelizacion.guardarRecompensa(datos, id);
      this.modalAbierto.set(false);
      await this.cargarDatos();
    } catch (err: any) {
      console.error('Error al guardar recompensa:', err);
      this.errorModal.set(err.message || 'No se pudo guardar la recompensa.');
    } finally {
      this.guardandoRecompensa.set(false);
    }
  }

  obtenerEtiquetaTipo(tipo: string): string {
    switch (tipo) {
      case 'entrada_gratis': return '🎟 Entrada Gratis';
      case 'descuento_porcentual': return '🏷 Descuento %';
      case 'descuento_monto_fijo': return '💵 Descuento $';
      case 'producto_candy': return '🍿 Producto Candy';
      default: return tipo;
    }
  }
}
