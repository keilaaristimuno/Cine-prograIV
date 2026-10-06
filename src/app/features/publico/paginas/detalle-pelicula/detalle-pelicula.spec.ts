import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';
import { ServicioFunciones } from '../../../../core/servicios/servicio-funciones';
import { ServicioPeliculas } from '../../../../core/servicios/servicio-peliculas';
import { ServicioResenas } from '../../../../core/servicios/servicio-resenas';
import { DetallePelicula } from './detalle-pelicula';

describe('DetallePelicula Component (M7 - Reseñas y Calificaciones)', () => {
  let component: DetallePelicula;
  let fixture: ComponentFixture<DetallePelicula>;

  let mockServicioPeliculas: any;
  let mockServicioFunciones: any;
  let mockServicioAuth: any;
  let mockServicioResenas: any;

  beforeEach(async () => {
    mockServicioPeliculas = {
      obtenerPeliculaPublicaPorId: vi.fn().mockResolvedValue({
        id: 'pelicula-uuid-1',
        nombre: 'Oppenheimer',
        sinopsis: 'Historia de J. Robert Oppenheimer',
        duracionMinutos: 180,
        fechaEstreno: '2026-01-01',
        clasificacionEdad: '+13',
        estaActiva: true,
        generos: ['Drama', 'Historia'],
        imagenUrl: 'https://cdn.example.com/oppenheimer.jpg'
      })
    };

    mockServicioFunciones = {
      obtenerFuncionesDisponiblesPorPelicula: vi.fn().mockResolvedValue([])
    };

    mockServicioAuth = {
      asegurarSesionLista: vi.fn().mockResolvedValue(undefined),
      estaAutenticado: vi.fn().mockReturnValue(true),
      esCliente: vi.fn().mockReturnValue(true)
    };

    mockServicioResenas = {
      obtenerResenasPelicula: vi.fn().mockResolvedValue({
        peliculaId: 'pelicula-uuid-1',
        promedio: 4.5,
        cantidadResenas: 2,
        resenas: [
          {
            id: 'res-1',
            usuarioId: 'usr-1',
            puntuacion: 5,
            comentario: 'Una obra maestra indiscutible del cine contemporáneo.',
            creadoEn: '2026-10-06T12:00:00Z',
            actualizadoEn: '2026-10-06T12:00:00Z',
            nombreAutor: 'Laura M.'
          }
        ]
      }),
      verificarElegibilidad: vi.fn().mockResolvedValue({
        puedeResenar: true,
        motivo: 'elegible',
        mensaje: '¡Cumplís con los requisitos!',
        yaReseno: false,
        resenaExistente: null
      }),
      guardarResena: vi.fn().mockResolvedValue({
        ok: true,
        accion: 'creada',
        mensaje: '¡Tu reseña fue publicada con éxito!'
      })
    };

    await TestBed.configureTestingModule({
      imports: [DetallePelicula],
      providers: [
        provideRouter([]),
        { provide: ServicioPeliculas, useValue: mockServicioPeliculas },
        { provide: ServicioFunciones, useValue: mockServicioFunciones },
        { provide: ServicioAuth, useValue: mockServicioAuth },
        { provide: ServicioResenas, useValue: mockServicioResenas },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: vi.fn().mockReturnValue('pelicula-uuid-1')
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DetallePelicula);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse e inicializar la carga de la película, reseñas y elegibilidad', () => {
    expect(component).toBeTruthy();
    expect(mockServicioPeliculas.obtenerPeliculaPublicaPorId).toHaveBeenCalledWith('pelicula-uuid-1');
    expect(mockServicioResenas.obtenerResenasPelicula).toHaveBeenCalledWith('pelicula-uuid-1');
    expect(mockServicioResenas.verificarElegibilidad).toHaveBeenCalledWith('pelicula-uuid-1');
  });

  it('debe mostrar el promedio de calificación y cantidad de opiniones en el estado de reseñas', async () => {
    await fixture.whenStable();
    expect(component.resumenResenas()?.promedio).toBe(4.5);
    expect(component.resumenResenas()?.cantidadResenas).toBe(2);
    expect(component.resumenResenas()?.resenas.length).toBe(1);
    expect(component.resumenResenas()?.resenas[0].nombreAutor).toBe('Laura M.');
  });

  it('debe validar que el comentario tenga al menos 10 caracteres antes de enviar', async () => {
    component.comentarioForm.set('Corto');
    component.puntuacionForm.set(5);

    await component.enviarResena();

    expect(component.errorFormResena()).toContain('al menos 10 caracteres');
    expect(mockServicioResenas.guardarResena).not.toHaveBeenCalled();
  });

  it('debe enviar la reseña correctamente cuando los datos son válidos', async () => {
    component.comentarioForm.set('Excelente experiencia y gran ambientación sonora.');
    component.puntuacionForm.set(5);

    await component.enviarResena();

    expect(mockServicioResenas.guardarResena).toHaveBeenCalledWith({
      peliculaId: 'pelicula-uuid-1',
      puntuacion: 5,
      comentario: 'Excelente experiencia y gran ambientación sonora.'
    });
    expect(component.exitoFormResena()).toBe('¡Tu reseña fue publicada con éxito!');
  });

  it('debe precargar los datos de reseña existente si el usuario ya había calificado', async () => {
    mockServicioResenas.verificarElegibilidad.mockResolvedValue({
      puedeResenar: true,
      motivo: 'elegible_con_resena_previa',
      mensaje: 'Ya calificaste esta película.',
      yaReseno: true,
      resenaExistente: {
        id: 'res-previa',
        puntuacion: 4,
        comentario: 'Opinión previa válida de prueba',
        creadoEn: '2026-10-05T10:00:00Z',
        actualizadoEn: '2026-10-05T10:00:00Z'
      }
    });

    await component.cargarElegibilidad('pelicula-uuid-1');

    expect(component.elegibilidad()?.yaReseno).toBe(true);
    expect(component.puntuacionForm()).toBe(4);
    expect(component.comentarioForm()).toBe('Opinión previa válida de prueba');
  });

  it('debe informar no_autenticado si el usuario no ha iniciado sesión', async () => {
    mockServicioAuth.estaAutenticado.mockReturnValue(false);

    await component.cargarElegibilidad('pelicula-uuid-1');

    expect(component.elegibilidad()?.puedeResenar).toBe(false);
    expect(component.elegibilidad()?.motivo).toBe('no_autenticado');
  });
});
