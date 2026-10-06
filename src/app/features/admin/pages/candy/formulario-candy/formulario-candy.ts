import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CATEGORIAS_CANDY, CategoriaCandy, ProductoCandyFormDTO } from '../../../../../core/modelos/producto-candy';
import { ServicioCandy } from '../../../../../core/servicios/servicio-candy';

@Component({
  selector: 'app-formulario-candy',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './formulario-candy.html',
  styleUrl: './formulario-candy.scss'
})
export class FormularioCandy implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly servicioCandy = inject(ServicioCandy);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private productoId: string | null = null;
  readonly modoEdicion = signal<boolean>(false);
  readonly cargandoProducto = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly mensajeExito = signal<string>('');
  readonly mensajeError = signal<string>('');

  readonly imagenUrlActual = signal<string | null>(null);
  readonly vistaPreviaImagen = signal<string | null>(null);
  readonly errorImagen = signal<string>('');

  readonly categoriasDisponibles = CATEGORIAS_CANDY;

  readonly archivoImagenControl = new FormControl<File | null>(null);

  readonly formulario = this.fb.nonNullable.group({
    nombre: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(100)]
    ],
    descripcion: ['', [Validators.maxLength(500)]],
    categoria: this.fb.nonNullable.control<CategoriaCandy>('combos', [Validators.required]),
    precio: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    esDestacado: [false],
    estaActivo: [true]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productoId = id;
      this.modoEdicion.set(true);
      this.cargarDatosProducto(id);
    }
  }

  private async cargarDatosProducto(id: string): Promise<void> {
    this.cargandoProducto.set(true);
    this.mensajeError.set('');

    try {
      const prod = await this.servicioCandy.obtenerProductoPorId(id);
      if (!prod) {
        this.mensajeError.set('El producto solicitado no existe.');
        return;
      }

      this.formulario.patchValue({
        nombre: prod.nombre,
        descripcion: prod.descripcion || '',
        categoria: prod.categoria,
        precio: prod.precio,
        stock: prod.stock,
        esDestacado: prod.esDestacado,
        estaActivo: prod.estaActivo
      });

      if (prod.imagenUrl) {
        this.imagenUrlActual.set(prod.imagenUrl);
      }
    } catch (err: any) {
      console.error('Error al cargar datos del producto:', err);
      this.mensajeError.set(err.message || 'No se pudieron recuperar los datos del producto.');
    } finally {
      this.cargandoProducto.set(false);
    }
  }

  onArchivoSeleccionado(evento: Event): void {
    this.errorImagen.set('');
    const input = evento.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      this.archivoImagenControl.setValue(null);
      this.vistaPreviaImagen.set(null);
      return;
    }

    const archivo = input.files[0];

    // Validación de tipo de archivo
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!tiposPermitidos.includes(archivo.type)) {
      this.errorImagen.set('Formato de imagen no válido. Usá JPG, PNG o WebP.');
      input.value = '';
      return;
    }

    // Validación de tamaño (máximo 4 MB)
    const maxBytes = 4 * 1024 * 1024;
    if (archivo.size > maxBytes) {
      this.errorImagen.set('La imagen supera el límite de 4 MB.');
      input.value = '';
      return;
    }

    this.archivoImagenControl.setValue(archivo);

    // Crear vista previa local
    const reader = new FileReader();
    reader.onload = () => {
      this.vistaPreviaImagen.set(reader.result as string);
    };
    reader.readAsDataURL(archivo);
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    const formValues = this.formulario.getRawValue();
    const datosDTO: ProductoCandyFormDTO = {
      nombre: formValues.nombre,
      descripcion: formValues.descripcion || null,
      categoria: formValues.categoria,
      precio: Number(formValues.precio),
      stock: Math.floor(Number(formValues.stock)),
      esDestacado: formValues.esDestacado,
      estaActivo: formValues.estaActivo
    };

    const archivoImagen = this.archivoImagenControl.value;

    try {
      if (this.modoEdicion() && this.productoId) {
        await this.servicioCandy.actualizarProducto(this.productoId, datosDTO, archivoImagen);
        this.mensajeExito.set('¡Producto actualizado correctamente!');
      } else {
        await this.servicioCandy.crearProducto(datosDTO, archivoImagen);
        this.mensajeExito.set('¡Producto creado con éxito!');
      }

      setTimeout(() => {
        this.router.navigate(['/admin/candy']);
      }, 900);
    } catch (err: any) {
      console.error('Error al guardar producto:', err);
      this.mensajeError.set(err.message || 'Ocurrió un error al guardar el producto.');
    } finally {
      this.guardando.set(false);
    }
  }
}
