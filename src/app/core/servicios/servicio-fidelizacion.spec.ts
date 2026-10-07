import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServicioFidelizacion } from './servicio-fidelizacion';
import { ServicioSupabase } from './servicio-supabase';

describe('ServicioFidelizacion (M8.1)', () => {
  let servicio: ServicioFidelizacion;
  let mockSupabaseCliente: any;

  beforeEach(() => {
    mockSupabaseCliente = {
      rpc: vi.fn(),
      from: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ServicioFidelizacion,
        {
          provide: ServicioSupabase,
          useValue: { cliente: mockSupabaseCliente }
        }
      ]
    });

    servicio = TestBed.inject(ServicioFidelizacion);
  });

  it('debe crearse correctamente', () => {
    expect(servicio).toBeTruthy();
  });

  describe('obtenerMiFidelizacion', () => {
    it('debe invocar a obtener_mi_fidelizacion y mapear la respuesta del cliente', async () => {
      mockSupabaseCliente.rpc.mockResolvedValue({
        data: {
          ok: true,
          saldo_puntos: 1250,
          pesos_por_punto: 1.0,
          fidelizacion_activa: true,
          recompensas: [
            {
              id: 'rec-1',
              nombre: 'Entrada 2D Gratis',
              descripcion: 'Válida de lunes a jueves',
              costo_puntos: 1000,
              tipo: 'entrada_gratis',
              valor_beneficio: 1,
              dias_validez: 30,
              activa: true
            }
          ],
          movimientos: [
            {
              id: 'mov-1',
              tipo_movimiento: 'acreditacion_compra_cine',
              puntos: 500,
              saldo_resultante: 1250,
              motivo: 'Puntos por compra de entradas',
              creado_en: '2026-10-06T12:00:00Z'
            }
          ],
          cupones: [
            {
              id: 'cup-1',
              codigo_cupon: 'CP-ABCD-EF23',
              tipo: 'entrada_gratis',
              valor_beneficio: 1,
              descripcion: 'Entrada gratis',
              origen: 'canje_puntos',
              estado: 'disponible',
              creado_en: '2026-10-06T12:00:00Z',
              vence_en: '2026-11-06T12:00:00Z'
            }
          ]
        },
        error: null
      });

      const resultado = await servicio.obtenerMiFidelizacion();

      expect(mockSupabaseCliente.rpc).toHaveBeenCalledWith('obtener_mi_fidelizacion');
      expect(resultado.ok).toBe(true);
      expect(resultado.saldoPuntos).toBe(1250);
      expect(resultado.recompensas.length).toBe(1);
      expect(resultado.movimientos.length).toBe(1);
      expect(resultado.cupones.length).toBe(1);
      expect(resultado.cupones[0].codigoCupon).toBe('CP-ABCD-EF23');
    });

    it('debe lanzar error si la RPC falla', async () => {
      mockSupabaseCliente.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(servicio.obtenerMiFidelizacion()).rejects.toThrow('Database error');
    });
  });

  describe('canjearRecompensa', () => {
    it('debe invocar canjear_recompensa y retornar el cupón generado', async () => {
      mockSupabaseCliente.rpc.mockResolvedValue({
        data: {
          ok: true,
          mensaje: '¡Canje realizado con éxito!',
          nuevo_saldo: 250,
          puntos_canjeados: 1000,
          cupon: {
            id: 'cup-2',
            codigo_cupon: 'CP-9876-WXYZ',
            tipo: 'entrada_gratis',
            valor_beneficio: 1,
            descripcion: 'Entrada 2D Gratis',
            origen: 'canje_puntos',
            estado: 'disponible',
            creado_en: '2026-10-06T14:00:00Z',
            vence_en: '2026-11-06T14:00:00Z'
          }
        },
        error: null
      });

      const res = await servicio.canjearRecompensa('rec-1');

      expect(mockSupabaseCliente.rpc).toHaveBeenCalledWith('canjear_recompensa', {
        p_recompensa_id: 'rec-1'
      });
      expect(res.ok).toBe(true);
      expect(res.nuevoSaldo).toBe(250);
      expect(res.cupon?.codigoCupon).toBe('CP-9876-WXYZ');
    });
  });

  describe('administración de recompensas y configuración', () => {
    it('debe consultar la configuración de fidelización', async () => {
      mockSupabaseCliente.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { pesos_por_punto: 2.5, fidelizacion_activa: true },
              error: null
            })
          })
        })
      });

      const config = await servicio.obtenerConfiguracionFidelizacion();
      expect(config.pesosPorPunto).toBe(2.5);
      expect(config.fidelizacionActiva).toBe(true);
    });
  });
});
