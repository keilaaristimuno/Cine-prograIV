import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClasificacionEdad } from '../../../../../core/modelos/pelicula';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-formulario-pelicula',
  styleUrl: './formulario-pelicula.scss',
  templateUrl: './formulario-pelicula.html',
})

export class FormularioPelicula {
  /* readonly: podes leerlo pero no puede ser modificado ni borrado, no reemplaza el formulario por otro */
  private readonly constructorFormularios = inject(FormBuilder);
  
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
  guardarPelicula() : void {
    if (this.formularioPelicula.invalid) {
      this.formularioPelicula.markAllAsTouched();
      return;
    }
    const datosPelicula = this.formularioPelicula.getRawValue();
    console.log('Datos de la pelicula: ', datosPelicula);
  }
}
