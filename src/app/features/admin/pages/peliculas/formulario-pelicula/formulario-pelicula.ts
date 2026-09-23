import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ClasificacionEdad } from '../../../../../core/modelos/pelicula';
import  {ServicioPeliculas} from '../../../../../core/servicios/servicio-peliculas';

@Component({
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule],
  selector: 'app-formulario-pelicula',
  styleUrl: './formulario-pelicula.scss',
  templateUrl: './formulario-pelicula.html',
})

export class FormularioPelicula implements OnInit{
  /* readonly: podes leerlo pero no puede ser modificado ni borrado, no reemplaza el formulario por otro */
  private readonly constructorFormularios = inject(FormBuilder);

  private readonly servicioPeliculas = inject(ServicioPeliculas);
  private readonly ruta = inject(ActivatedRoute);
  private readonly enrutador = inject(Router);

  private idPelicula: string | null = null;
  readonly modoEdicion = signal(false);
  readonly cargandoPelicula = signal(false);
  readonly imagenActualUrl = signal('');

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
        /* Representa los generos que el usuario selecciono:  */
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

  ngOnInit(): void {
    const id = this.ruta.snapshot.paramMap.get('id');

    if (!id) {
      return;
    }

    this.idPelicula = id;
    this.modoEdicion.set(true);

    /*
    * En edición la imagen deja de ser obligatoria,
    * porque el usuario puede conservar el póster actual.
    */
    const controlImagen =
      this.formularioPelicula.controls.imagen;

    controlImagen.clearValidators();
    controlImagen.updateValueAndValidity();

    void this.cargarPelicula(id);
  }

    /*================================= 
      CARGAR PELICULA
    ====================================*/

  private async cargarPelicula(
    id: string
  ): Promise<void> {
    this.cargandoPelicula.set(true);
    this.mensajeErrorGuardado.set('');

    try {
      const pelicula = await this.servicioPeliculas.obtenerPeliculaPorId(id);

      if (!pelicula) {
        this.mensajeErrorGuardado.set(
          'La película no existe o fue eliminada.'
        );
        return;
      }

      this.formularioPelicula.patchValue({
        nombre: pelicula.nombre,
        sinopsis: pelicula.sinopsis,
        duracionMinutos: pelicula.duracionMinutos,
        /*El input type="date" necesita un valor con formato AAAA-MM-DD.*/
        fechaEstreno: pelicula.fechaEstreno.slice(0, 10),
        clasificacionEdad: pelicula.clasificacionEdad,
        estaActiva: pelicula.estaActiva,
        generos: [...pelicula.generos],
        imagen: null
      });

      this.imagenActualUrl.set(
        pelicula.imagenUrl
      );
    } catch (error) {
      console.error(
        'Error al cargar la película:',
        error
      );

      this.mensajeErrorGuardado.set(
        'No se pudieron cargar los datos de la película.'
      );
    } finally {
      this.cargandoPelicula.set(false);
    }
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
  async guardarPelicula(): Promise<void> {
    if (this.formularioPelicula.invalid) {
      this.formularioPelicula.markAllAsTouched();
      return;
    }
    const datosFormulario = this.formularioPelicula.getRawValue();
    const imagen = datosFormulario.imagen;
    /*
    * La imagen solamente es obligatoria cuando
    * estamos creando una película nueva.
    */
    if (!this.modoEdicion() && !imagen) {
      this.formularioPelicula.controls.imagen.setErrors({
          required: true
        });

      this.formularioPelicula.controls.imagen.markAsTouched();
      return;
    }

    this.guardando.set(true);
    this.mensajeGuardado.set('');
    this.mensajeErrorGuardado.set('');

    const datosPelicula = {
      nombre: datosFormulario.nombre,
      sinopsis: datosFormulario.sinopsis,
      duracionMinutos: datosFormulario.duracionMinutos,
      fechaEstreno: datosFormulario.fechaEstreno,
      clasificacionEdad: datosFormulario.clasificacionEdad,
      estaActiva: datosFormulario.estaActiva,
      generos: datosFormulario.generos
    };

    try {
      /* Si Existe un ID, estoy editando → ejecutar UPDATE */
      if (this.idPelicula) {
        await this.servicioPeliculas
          .actualizarPelicula(
            this.idPelicula,
            datosPelicula,
            imagen
          );

        this.mensajeGuardado.set(
          'La película se actualizó correctamente.'
        );
        console.log(
          'Película actualizada correctamente en Supabase.'
        );

        await this.enrutador.navigate([
          '/admin/peliculas'
        ]);
        return;
      }
      /*
      * TypeScript sabe que estamos creando
      * Aun asi se hace esta comprobación por seguridad */
      if (!imagen) {
        return;
      }

      await this.servicioPeliculas.guardarPelicula(datosPelicula, imagen);

      this.mensajeGuardado.set(
        'La película se guardó correctamente.'
      );
      console.log(
        'Película guardada correctamente en Supabase.'
      );
    } catch (error) {
      console.error(
        this.modoEdicion()
          ? 'Error al actualizar la película:'
          : 'Error al guardar la película:',
        error
      );

      this.mensajeErrorGuardado.set(
        this.modoEdicion()
          ? 'No se pudo actualizar la película.'
          : 'No se pudo guardar la película.'
      );
    } finally {
      this.guardando.set(false);
    }
  }
}
