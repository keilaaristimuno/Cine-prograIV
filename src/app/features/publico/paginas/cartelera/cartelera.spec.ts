import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServicioPeliculas } from '../../../../core/servicios/servicio-peliculas';
import { ServicioResenas } from '../../../../core/servicios/servicio-resenas';
import { Cartelera } from './cartelera';

describe('Cartelera Component (M7 - Ranking Top 3)', () => {
  let component: Cartelera;
  let fixture: ComponentFixture<Cartelera>;

  let mockServicioPeliculas: any;
  let mockServicioResenas: any;

  beforeEach(async () => {
    mockServicioPeliculas = {
      obtenerPeliculasCartelera: vi.fn().mockResolvedValue([
        {
          id: 'pel-1',
          nombre: 'Película Uno',
          sinopsis: 'Sinopsis Uno',
          duracionMinutos: 120,
          fechaEstreno: '2026-01-01',
          clasificacionEdad: 'ATP',
          estaActiva: true,
          generos: ['Acción'],
          imagenUrl: 'https://cdn.example.com/p1.jpg'
        }
      ])
    };

    mockServicioResenas = {
      obtenerTop3Peliculas: vi.fn().mockResolvedValue([
        {
          id: 'pel-top-1',
          nombre: 'El Padrino',
          imagenUrl: 'https://cdn.example.com/padrino.jpg',
          fechaEstreno: '2026-01-01',
          duracionMinutos: 175,
          clasificacionEdad: '+18',
          promedio: 4.9,
          cantidadResenas: 30
        },
        {
          id: 'pel-top-2',
          nombre: 'Pulp Fiction',
          imagenUrl: 'https://cdn.example.com/pulp.jpg',
          fechaEstreno: '2026-01-02',
          duracionMinutos: 154,
          clasificacionEdad: '+18',
          promedio: 4.8,
          cantidadResenas: 25
        }
      ])
    };

    await TestBed.configureTestingModule({
      imports: [Cartelera],
      providers: [
        provideRouter([]),
        { provide: ServicioPeliculas, useValue: mockServicioPeliculas },
        { provide: ServicioResenas, useValue: mockServicioResenas }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Cartelera);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse e invocar la carga de cartelera y ranking Top 3', () => {
    expect(component).toBeTruthy();
    expect(mockServicioPeliculas.obtenerPeliculasCartelera).toHaveBeenCalled();
    expect(mockServicioResenas.obtenerTop3Peliculas).toHaveBeenCalled();
  });

  it('debe renderizar los elementos del podio cuando existen películas en el ranking', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.top3Peliculas().length).toBe(2);
    expect(component.top3Peliculas()[0].nombre).toBe('El Padrino');
    expect(component.top3Peliculas()[0].promedio).toBe(4.9);

    const compiled = fixture.nativeElement as HTMLElement;
    const titulos = compiled.querySelectorAll('.tarjeta-podio__titulo');
    expect(titulos.length).toBe(2);
    expect(titulos[0].textContent).toContain('El Padrino');
    expect(titulos[1].textContent).toContain('Pulp Fiction');
  });

  it('debe mostrar exactamente "Todavía no hay películas calificadas." cuando el ranking está vacío', async () => {
    mockServicioResenas.obtenerTop3Peliculas.mockResolvedValue([]);
    await component.cargarTop3();
    fixture.detectChanges();

    expect(component.top3Peliculas().length).toBe(0);

    const compiled = fixture.nativeElement as HTMLElement;
    const mensajeVacio = compiled.querySelector('.ranking-vacio .estado-cartelera__titulo');
    expect(mensajeVacio).toBeTruthy();
    expect(mensajeVacio?.textContent?.trim()).toBe('Todavía no hay películas calificadas.');
  });
});
