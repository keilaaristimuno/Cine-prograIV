import { Component } from '@angular/core';
import { Pelicula } from '../../../../../core/modelos/pelicula';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-listado-peliculas',
  imports: [RouterLink],
  templateUrl: './listado-peliculas.html',
  styleUrl: './listado-peliculas.scss'
})
export class ListadoPeliculas {
  peliculas: Pelicula[] = [
    {
      id: '1',
      nombre: 'Dune Parte Dos',
      sinopsis: 'Paul Atreides se une a Chani y a los Fremen.',
      duracionMinutos: 166,
      imagenUrl: '',
      fechaEstreno: '2026-09-20',
      clasificacionEdad: '+13',
      generos: ['Ciencia ficción', 'Aventura', 'Drama'],
      estaActiva: true
    },
    {
      id: '2',
      nombre: 'Intensa Mente 2',
      sinopsis: 'Nuevas emociones llegan a la mente de Riley.',
      duracionMinutos: 96,
      imagenUrl: '',
      fechaEstreno: '2026-10-10',
      clasificacionEdad: 'ATP',
      generos: ['Animación', 'Comedia'],
      estaActiva: true
    },
    {
      id: '3',
      nombre: 'Película archivada',
      sinopsis: 'Ejemplo de una película que no está visible.',
      duracionMinutos: 120,
      imagenUrl: '',
      fechaEstreno: '2025-05-15',
      clasificacionEdad: '+18',
      generos: ['Terror'],
      estaActiva: false
    }
  ];
}