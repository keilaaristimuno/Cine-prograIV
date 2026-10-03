import { inject, Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  BloqueButaca,
  Butaca,
  IdentificadorFila,
  ORDEN_FILAS_CANONICO,
  TipoButaca
} from '../modelos/butaca';
import { ServicioSupabase } from './servicio-supabase';

@Injectable({
  providedIn: 'root'
})
export class ServicioButacas {
  private readonly servicioSupabase = inject(ServicioSupabase);

  /**
   * Obtiene todas las butacas físicas activas de una sala específica,
   * ordenadas según la secuencia lógica de filas (A-I, JK, L-Q, R-T)
   * y dentro de cada fila por número correlativo ascendente (numero ASC).
   */
  async obtenerButacasPorSala(salaId: string): Promise<Butaca[]> {
    const cliente = this.servicioSupabase.cliente;

    const { data, error } = await cliente
      .from('butacas')
      .select(`
        id,
        sala_id,
        fila,
        numero,
        bloque,
        posicion_en_bloque,
        tipo,
        esta_activa
      `)
      .eq('sala_id', salaId)
      .eq('esta_activa', true);

    if (error) {
      throw error;
    }

    const butacas = (data ?? []).map(fila => this.mapearFilaButaca(fila));

    return this.ordenarButacas(butacas);
  }

  /**
   * Ordena las butacas respetando la secuencia canónica física:
   * A -> B -> ... -> I -> JK -> L -> ... -> T
   * y dentro de la misma fila por número ascendente (1..28 o 1..14).
   */
  ordenarButacas(butacas: Butaca[]): Butaca[] {
    const ordenMap = new Map<string, number>();
    ORDEN_FILAS_CANONICO.forEach((f, idx) => ordenMap.set(f, idx));

    return [...butacas].sort((a, b) => {
      const posFilaA = ordenMap.get(a.fila) ?? 999;
      const posFilaB = ordenMap.get(b.fila) ?? 999;

      if (posFilaA !== posFilaB) {
        return posFilaA - posFilaB;
      }

      return a.numero - b.numero;
    });
  }

  /**
   * Mapeador de fila de Supabase (snake_case) al modelo TypeScript (camelCase)
   */
  private mapearFilaButaca(fila: Record<string, any>): Butaca {
    return {
      id: fila['id'],
      salaId: fila['sala_id'],
      fila: fila['fila'] as IdentificadorFila,
      numero: fila['numero'],
      bloque: fila['bloque'] as BloqueButaca,
      posicionEnBloque: fila['posicion_en_bloque'],
      tipo: fila['tipo'] as TipoButaca,
      estaActiva: fila['esta_activa']
    };
  }

  /**
   * Obtiene el conjunto de identificadores de butacas que se encuentran ocupadas
   * (con entradas en estado 'comprada') para una función específica.
   */
  async obtenerIdsButacasOcupadas(funcionId: string): Promise<Set<string>> {
    const cliente = this.servicioSupabase.cliente;

    const { data, error } = await cliente
      .from('entradas')
      .select('butaca_id')
      .eq('funcion_id', funcionId)
      .eq('estado', 'comprada');

    if (error) {
      console.error('Error al obtener butacas ocupadas para la función:', error);
      throw error;
    }

    const setOcupadas = new Set<string>();
    for (const fila of data ?? []) {
      if (fila['butaca_id']) {
        setOcupadas.add(fila['butaca_id']);
      }
    }

    return setOcupadas;
  }

  /**
   * Suscribe en tiempo real a los cambios de ocupación (entradas) de una función particular.
   * Notifica cuando una butaca pasa a estar ocupada (comprada) o es liberada (cancelación/eliminación).
   */
  suscribirOcupacionFuncion(
    funcionId: string,
    alCambiar: (evento: { tipo: 'ocupada' | 'liberada'; butacaId: string }) => void
  ): RealtimeChannel {
    const cliente = this.servicioSupabase.cliente;

    const canal = cliente
      .channel(`ocupacion-funcion-${funcionId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entradas',
          filter: `funcion_id=eq.${funcionId}`
        },
        payload => {
          if (payload.eventType === 'INSERT') {
            const nueva = payload.new as Record<string, any>;
            if (nueva && nueva['estado'] === 'comprada' && nueva['butaca_id']) {
              alCambiar({ tipo: 'ocupada', butacaId: nueva['butaca_id'] });
            }
          } else if (payload.eventType === 'DELETE') {
            const vieja = payload.old as Record<string, any>;
            if (vieja && vieja['butaca_id']) {
              alCambiar({ tipo: 'liberada', butacaId: vieja['butaca_id'] });
            }
          } else if (payload.eventType === 'UPDATE') {
            const nueva = payload.new as Record<string, any>;
            if (nueva && nueva['butaca_id']) {
              if (nueva['estado'] === 'cancelada') {
                alCambiar({ tipo: 'liberada', butacaId: nueva['butaca_id'] });
              } else if (nueva['estado'] === 'comprada') {
                alCambiar({ tipo: 'ocupada', butacaId: nueva['butaca_id'] });
              }
            }
          }
        }
      )
      .subscribe();

    return canal;
  }

  /**
   * Cancela la suscripción a un canal Realtime y libera los recursos en Supabase.
   */
  desuscribirCanal(canal: RealtimeChannel): void {
    if (canal) {
      this.servicioSupabase.cliente.removeChannel(canal);
    }
  }
}
