import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormatoProyeccion } from '../../../../../core/modelos/tarifa';
import { ServicioTarifas } from '../../../../../core/servicios/servicio-tarifas';

@Component({
  selector: 'app-gestion-tarifas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './gestion-tarifas.html',
  styleUrl: './gestion-tarifas.scss'
})
export class GestionTarifas implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly servicioTarifas = inject(ServicioTarifas);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly mensajeExito = signal('');
  readonly mensajeError = signal('');

  formularioTarifas: FormGroup = this.fb.group({
    precio2D: [10000, [Validators.required, Validators.min(0)]],
    precio3D: [12000, [Validators.required, Validators.min(0)]],
    precio4D: [15000, [Validators.required, Validators.min(0)]],
    precio5D: [18000, [Validators.required, Validators.min(0)]],
    porcentajeRecargoVip: [50, [Validators.required, Validators.min(0), Validators.max(200)]],
    porcentajeDescuentoPrimeraCompra: [20, [Validators.required, Validators.min(0), Validators.max(100)]],
    descuentoPrimeraCompraActivo: [true]
  });

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    this.cargando.set(true);
    this.mensajeError.set('');

    try {
      const [tarifas, config] = await Promise.all([
        this.servicioTarifas.obtenerTarifasFormatos(),
        this.servicioTarifas.obtenerConfiguracionCine()
      ]);

      const mapaPrecios: Record<string, number> = {};
      for (const t of tarifas) {
        mapaPrecios[t.formato] = t.precioBase;
      }

      this.formularioTarifas.patchValue({
        precio2D: mapaPrecios['2D'] ?? 10000,
        precio3D: mapaPrecios['3D'] ?? 12000,
        precio4D: mapaPrecios['4D'] ?? 15000,
        precio5D: mapaPrecios['5D'] ?? 18000,
        porcentajeRecargoVip: config.porcentajeRecargoVip ?? 50,
        porcentajeDescuentoPrimeraCompra: config.porcentajeDescuentoPrimeraCompra ?? 20,
        descuentoPrimeraCompraActivo: config.descuentoPrimeraCompraActivo ?? true
      });
    } catch (error) {
      console.error('Error al cargar tarifas:', error);
      this.mensajeError.set('No se pudieron cargar los datos de tarifas.');
    } finally {
      this.cargando.set(false);
    }
  }

  async guardar(): Promise<void> {
    if (this.formularioTarifas.invalid) {
      this.formularioTarifas.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.mensajeExito.set('');
    this.mensajeError.set('');

    const val = this.formularioTarifas.value;

    try {
      await Promise.all([
        this.servicioTarifas.actualizarTarifaFormato('2D', Number(val.precio2D)),
        this.servicioTarifas.actualizarTarifaFormato('3D', Number(val.precio3D)),
        this.servicioTarifas.actualizarTarifaFormato('4D', Number(val.precio4D)),
        this.servicioTarifas.actualizarTarifaFormato('5D', Number(val.precio5D)),
        this.servicioTarifas.actualizarConfiguracionCine({
          porcentajeRecargoVip: Number(val.porcentajeRecargoVip),
          porcentajeDescuentoPrimeraCompra: Number(val.porcentajeDescuentoPrimeraCompra),
          descuentoPrimeraCompraActivo: Boolean(val.descuentoPrimeraCompraActivo)
        })
      ]);

      this.mensajeExito.set('Tarifas y configuración guardadas correctamente.');
    } catch (error) {
      console.error('Error al guardar tarifas:', error);
      this.mensajeError.set('Error al guardar las tarifas. Verifique la conexión.');
    } finally {
      this.guardando.set(false);
    }
  }
}
