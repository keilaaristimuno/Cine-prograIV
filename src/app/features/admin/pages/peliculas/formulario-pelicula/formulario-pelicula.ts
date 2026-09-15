import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClasificacionEdad } from '../../../../../core/modelos/pelicula';
import  {ServicioPeliculas} from '../../../../../core/servicios/servicio-peliculas';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-formulario-pelicula',
  styleUrl: './formulario-pelicula.scss',
  templateUrl: './formulario-pelicula.html',
})

export class FormularioPelicula {
  /* readonly: podes leerlo pero no puede ser modificado ni borrado, no reemplaza el formulario por otro */
  private readonly constructorFormularios = inject(FormBuilder);

  private readonly servicioPeliculas =
  inject(ServicioPeliculas);

  readonly guardando = signal(false);
  readonly mensajeGuardado = signal('');
  readonly mensajeErrorGuardado = signal('');
  
  readonly generosDisponibles: string[] = [
    'Acción',
    'Animación',
    'Aventura',
    'Ciencia ficción',
    'Comedia',
    'Drama',
    'Fantasía',
    'Terror'
  ];

  readonly formularioPelicula = this.constructorFormularios.nonNullable.group({
    /* no puede tener un valor nulo  */
  nombre: [
    '',
    [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(100)
    ]
  ],
  sinopsis: [
    '',
    [
      Validators.required,
      Validators.minLength(20),
      Validators.maxLength(1000)
    ]
  ],
  duracionMinutos: [
    0,
    [
      Validators.required,
      Validators.min(1),
      Validators.max(600)
    ]
  ],
  fechaEstreno: [
        '',
        Validators.required
  ],
  clasificacionEdad:
    this.constructorFormularios.nonNullable.control<ClasificacionEdad>(
          'ATP',
          Validators.required
    ),
    estaActiva: [true],
      /* es  */
    generos: this.constructorFormularios.nonNullable.control<string[]>(
    [],
    Validators.required    
    ),

    /* Campo de imagen */
    imagen: new FormControl<File | null>(
    null,
    Validators.required
    )
});

      /* maneja los cambios en los géneros */

  cambiarGenero(genero: string, evento: Event): void {
    const checkbox = evento.target as HTMLInputElement;
    const generosSeleccionados =
      this.formularioPelicula.controls.generos.value;

    if (checkbox.checked) {
      this.formularioPelicula.controls.generos.setValue([
        ...generosSeleccionados, genero
      ]);
    } else {
      this.formularioPelicula.controls.generos.setValue(
        generosSeleccionados.filter(
          generoSeleccionado => generoSeleccionado !== genero
        )
      );
    }

    this.formularioPelicula.controls.generos.markAsTouched();
  }

      /* Maneja la selección de imagen */
  seleccionarImagen(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    const controlImagen = this.formularioPelicula.controls.imagen;

    controlImagen.markAsTouched();
    if (!archivo) {
      controlImagen.setValue(null);
      return;
    }
    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];
    /* valida el tipo de archivo */
    /* supabase no superar 6 MB */
    const tamanioMaximo = 5 * 1024 * 1024;

    if (!tiposPermitidos.includes(archivo.type)) {
      controlImagen.setValue(null);
      controlImagen.setErrors({ tipoInvalido: true });
      input.value = '';
      return;
    }
    if (archivo.size > tamanioMaximo) {
      controlImagen.setValue(null);
      controlImagen.setErrors({ tamanioExcedido: true });
      input.value = '';
      return;
    }
    controlImagen.setValue(archivo);
  }

  
/* Guarda los datos de la película */
  async guardarPelicula() : Promise<void> {
    if (this.formularioPelicula.invalid){
      this.formularioPelicula.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.mensajeGuardado.set('');
    this.mensajeErrorGuardado.set('');

    const datosFormulario = this.formularioPelicula.getRawValue();

    const imagen = datosFormulario.imagen;

    if (!imagen) {
      this.formularioPelicula.controls.imagen.setErrors({
        required: true
      });

      this.formularioPelicula.controls.imagen.markAsTouched();
      this.guardando.set(false);
      return;
    }
    try {
      await this.servicioPeliculas.guardarPelicula(
        {
          nombre: datosFormulario.nombre,
          sinopsis: datosFormulario.sinopsis,
          duracionMinutos:
            datosFormulario.duracionMinutos,
          fechaEstreno:
            datosFormulario.fechaEstreno,
          clasificacionEdad:
            datosFormulario.clasificacionEdad,
          estaActiva:
            datosFormulario.estaActiva,
          generos:
            datosFormulario.generos
        },
        imagen
      );

      this.mensajeGuardado.set( 
        'La película se guardó correctamente.'
      );
      console.log(
        'Película guardada correctamente en Supabase.'
      );
    } catch (error) {
      console.error(
        'Error al guardar la película:',
        error
      );

      this.mensajeErrorGuardado.set('No se pudo guardar la película.'
      );
    } finally {
      this.guardando.set(false);
    }
  }
}
