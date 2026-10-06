import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServicioResenas } from './servicio-resenas';
import { ServicioSupabase } from './servicio-supabase';

describe('ServicioResenas (M7)', () => {
  let servicio: ServicioResenas;
  let mockSupabaseCliente: any;

  beforeEach(() => {
    mockSupabaseCliente = {
      rpc: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ServicioResenas,
        {
          provide: ServicioSupabase,
          useValue: { cliente: mockSupabaseCliente }
        }
      ]
    });

    servicio = TestBed.inject(ServicioResenas);
  });

  it('debe crearse correctamente', () => {
    expect(servicio).toBeTruthy();
  });

  describe('obtenerResenasPelicula', () => {
    it('debe llamar a la RPC obtener_resenas_pelicula y mapear la respuesta correctamente', async () => {
      mockSupabaseCliente.rpc.mockResolvedValue({
        data: {
          pelicula_id: 'pelicula-123',
          promedio: 4.8,
          cantidad_resenas: 2,
          resenas: [
            {
              id: 'res-1',
              usuario_id: 'user-1',
              puntuacion: 5,
              comentario: '¡Excelente película!',
              creado_en: '2026-10-06T10:00:00Z',
              actualizado_en: '2026-10-06T10:00:00Z',
              nombre_autor: 'Ana G.'
            },
            {
              id: 'res-2',
              usuario_id: 'user-2',
              puntuacion: 4,
              comentario: 'Muy buena trama y efectos.',
              creado_en: '2026-10-06T09:00:00Z',
              actualizado_en: '2026-10-06T09:00:00Z',
              nombre_autor: 'Carlos M.'
            }
          ]
        },
        error: null
      });

      const resultado = await servicio.obtenerResenasPelicula('pelicula-123');

      expect(mockSupabaseCliente.rpc).toHaveBeenCalledWith('obtener_resenas_pelicula', {
        p_pelicula_id: 'pelicula-123'
      });
      expect(resultado.peliculaId).toBe('pelicula-123');
      expect(resultado.promedio).toBe(4.8);
      expect(resultado.cantidadResenas).toBe(2);
      expect(resultado.resenas.length).toBe(2);
      expect(resultado.resenas[0].nombreAutor).toBe('Ana G.');
    });

    it('debe lanzar error si la RPC falla', async () => {
      mockSupabaseCliente.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(servicio.obtenerResenasPelicula('pelicula-123')).rejects.toThrow(
        'No pudimos cargar las reseñas de esta película.'
      );
    });
  });

  describe('verificarElegibilidad', () => {
    it('debe devolver elegibilidad aprobada cuando el usuario asistió a la sala', async () => {
      mockSupabaseCliente.rpc.mockResolvedValue({
        data: {
          puede_resenar: true,
          motivo: 'elegible',
          mensaje: '¡Cumplís con los requisitos!',
          ya_reseno: false,
          resena_existente: null
        },
        error: null
      });

      const resultado = await servicio.verificarElegibilidad('pelicula-123');

      expect(mockSupabaseCliente.rpc).toHaveBeenCalledWith('verificar_elegibilidad_resena', {
        p_pelicula_id: 'pelicula-123'
      });
      expect(resultado.puedeResenar).toBe(true);
      expect(resultado.motivo).toBe('elegible');
      expect(resultado.yaReseno).toBe(false);
      expect(resultado.resenaExistente).toBeNull();
    });

    it('debe devolver elegible_con_resena_previa si ya publicó una reseña', async () => {
      mockSupabaseCliente.rpc.mockResolvedValue({
        data: {
          puede_resenar: true,
          motivo: 'elegible_con_resena_previa',
          mensaje: 'Ya calificaste esta película.',
          ya_reseno: true,
          resena_existente: {
            id: 'res-previa-1',
            puntuacion: 5,
            comentario: 'Opinión original de más de 10 caracteres',
            creado_en: '2026-10-05T10:00:00Z',
            actualizado_en: '2026-10-05T10:00:00Z'
          }
        },
        error: null
      });

      const resultado = await servicio.verificarElegibilidad('pelicula-123');

      expect(resultado.puedeResenar).toBe(true);
      expect(resultado.yaReseno).toBe(true);
      expect(resultado.resenaExistente?.puntuacion).toBe(5);
    });

    it('debe devolver no_autenticado o no elegible si no asistió', async () => {
      mockSupabaseCliente.rpc.mockResolvedValue({
        data: {
          puede_resenar: false,
          motivo: 'sin_asistencia_validada',
          mensaje: 'Necesitás haber asistido a la sala para opinar.',
          ya_reseno: false,
          resena_existente: null
        },
        error: null
      });

      const resultado = await servicio.verificarElegibilidad('pelicula-123');

      expect(resultado.puedeResenar).toBe(false);
      expect(resultado.motivo).toBe('sin_asistencia_validada');
    });
  });

  describe('guardarResena', () => {
    it('debe enviar la reseña mediante RPC guardar_resena_pelicula y retornar el resultado exitoso', async () => {
      mockSupabaseCliente.rpc.mockResolvedValue({
        data: {
          ok: true,
          accion: 'creada',
          mensaje: '¡Tu reseña fue publicada con éxito!',
          resena: {
            id: 'res-nueva-1',
            pelicula_id: 'pelicula-123',
            puntuacion: 5,
            comentario: 'Comentario de prueba válido',
            creado_en: '2026-10-06T12:00:00Z',
            actualizado_en: '2026-10-06T12:00:00Z'
          }
        },
        error: null
      });

      const resultado = await servicio.guardarResena({
        peliculaId: 'pelicula-123',
        puntuacion: 5,
        comentario: 'Comentario de prueba válido'
      });

      expect(mockSupabaseCliente.rpc).toHaveBeenCalledWith('guardar_resena_pelicula', {
        p_pelicula_id: 'pelicula-123',
        p_puntuacion: 5,
        p_comentario: 'Comentario de prueba válido'
      });
      expect(resultado.ok).toBe(true);
      expect(resultado.accion).toBe('creada');
      expect(resultado.resena?.puntuacion).toBe(5);
    });
  });

  describe('obtenerTop3Peliculas', () => {
    it('debe invocar a obtener_top_3_peliculas y mapear la lista', async () => {
      mockSupabaseCliente.rpc.mockResolvedValue({
        data: [
          {
            id: 'pel-1',
            nombre: 'Interestelar',
            imagen_url: 'https://cdn.example.com/poster1.jpg',
            fecha_estreno: '2026-10-01',
            duracion_minutos: 169,
            clasificacion_edad: '+13',
            promedio: 4.9,
            cantidad_resenas: 25
          },
          {
            id: 'pel-2',
            nombre: 'Batman',
            imagen_url: 'https://cdn.example.com/poster2.jpg',
            fecha_estreno: '2026-10-02',
            duracion_minutos: 152,
            clasificacion_edad: '+13',
            promedio: 4.7,
            cantidad_resenas: 18
          }
        ],
        error: null
      });

      const ranking = await servicio.obtenerTop3Peliculas();

      expect(mockSupabaseCliente.rpc).toHaveBeenCalledWith('obtener_top_3_peliculas');
      expect(ranking.length).toBe(2);
      expect(ranking[0].nombre).toBe('Interestelar');
      expect(ranking[0].promedio).toBe(4.9);
      expect(ranking[0].cantidadResenas).toBe(25);
    });

    it('debe retornar un array vacío si la RPC arroja error', async () => {
      mockSupabaseCliente.rpc.mockResolvedValue({
        data: null,
        error: { message: 'DB Error' }
      });

      const ranking = await servicio.obtenerTop3Peliculas();
      expect(ranking).toEqual([]);
    });
  });
});
