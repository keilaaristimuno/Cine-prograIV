import { inject, Injectable } from '@angular/core';
import {
  CuponCliente,
  DatosNuevaRecompensa,
  MovimientoPuntos,
  PanelFidelizacionCliente,
  Recompensa,
  ResultadoCanje
} from '../modelos/fidelizacion';
import { ServicioSupabase } from './servicio-supabase';

@Injectable({
  providedIn: 'root'
})
export class ServicioFidelizacion {
  private readonly servicioSupabase = inject(ServicioSupabase);

  /**
   * Obtiene el resumen unificado del cliente: saldo, catálogo, movimientos y cupones
   */
  async obtenerMiFidelizacion(): Promise<PanelFidelizacionCliente> {
    const { data, error } = await this.servicioSupabase.cliente.rpc(
      'obtener_mi_fidelizacion'
    );

    if (error) {
      console.error('Error al obtener fidelización del cliente:', error);
      throw new Error(error.message || 'No se pudo cargar la información de fidelización.');
    }

    const payload = data as {
      ok: boolean;
      saldo_puntos: number;
      pesos_por_punto: number;
      fidelizacion_activa: boolean;
      recompensas: any[];
      movimientos: any[];
      cupones: any[];
    };

    return {
      ok: payload.ok,
      saldoPuntos: Number(payload.saldo_puntos ?? 0),
      pesosPorPunto: Number(payload.pesos_por_punto ?? 1),
      fidelizacionActiva: Boolean(payload.fidelizacion_activa ?? true),
      recompensas: (payload.recompensas || []).map(r => this.mapearRecompensa(r)),
      movimientos: (payload.movimientos || []).map(m => this.mapearMovimiento(m)),
      cupones: (payload.cupones || []).map(c => this.mapearCupon(c))
    };
  }

  /**
   * Obtiene exclusivamente los cupones pertenecientes al cliente autenticado
   */
  async obtenerMisCupones(): Promise<CuponCliente[]> {
    const { data: usuario } = await this.servicioSupabase.cliente.auth.getUser();
    if (!usuario.user) return [];

    const { data, error } = await this.servicioSupabase.cliente
      .from('cupones_cliente')
      .select('*')
      .eq('usuario_id', usuario.user.id)
      .order('creado_en', { ascending: false });

    if (error) {
      console.error('Error al obtener cupones del cliente:', error);
      throw error;
    }

    return (data || []).map(c => this.mapearCupon(c));
  }

  /**
   * Ejecuta el canje atómico de una recompensa mediante RPC
   */
  async canjearRecompensa(recompensaId: string): Promise<ResultadoCanje> {
    const { data, error } = await this.servicioSupabase.cliente.rpc(
      'canjear_recompensa',
      { p_recompensa_id: recompensaId }
    );

    if (error) {
      console.error('Error al canjear recompensa:', error);
      throw new Error(error.message || 'No se pudo procesar el canje.');
    }

    const payload = data as {
      ok: boolean;
      mensaje: string;
      nuevo_saldo?: number;
      puntos_canjeados?: number;
      codigo_error?: string;
      cupon?: any;
    };

    return {
      ok: payload.ok,
      mensaje: payload.mensaje,
      nuevoSaldo: payload.nuevo_saldo,
      puntosCanjeados: payload.puntos_canjeados,
      codigoError: payload.codigo_error,
      cupon: payload.cupon ? this.mapearCupon(payload.cupon) : undefined
    };
  }

  /**
   * Consulta el catálogo completo de recompensas para administración
   */
  async obtenerRecompensasAdmin(): Promise<Recompensa[]> {
    const { data, error } = await this.servicioSupabase.cliente
      .from('recompensas')
      .select('*')
      .order('costo_puntos', { ascending: true });

    if (error) {
      console.error('Error al obtener recompensas para administración:', error);
      throw error;
    }

    return (data || []).map(r => this.mapearRecompensa(r));
  }

  /**
   * Crea o actualiza una recompensa (solo Administrador)
   */
  async guardarRecompensa(
    datos: DatosNuevaRecompensa,
    id?: string
  ): Promise<Recompensa> {
    const fila: Record<string, any> = {
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion.trim(),
      costo_puntos: datos.costoPuntos,
      tipo: datos.tipo,
      valor_beneficio: datos.valorBeneficio,
      producto_candy_id: datos.productoCandyId || null,
      dias_validez: datos.diasValidez,
      activa: datos.activa ?? true,
      actualizado_en: new Date().toISOString()
    };

    let query;
    if (id) {
      query = this.servicioSupabase.cliente
        .from('recompensas')
        .update(fila)
        .eq('id', id)
        .select()
        .single();
    } else {
      query = this.servicioSupabase.cliente
        .from('recompensas')
        .insert(fila)
        .select()
        .single();
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error al guardar recompensa:', error);
      throw error;
    }

    return this.mapearRecompensa(data);
  }

  /**
   * Activa o pausa una recompensa
   */
  async alternarEstadoRecompensa(id: string, activa: boolean): Promise<void> {
    const { error } = await this.servicioSupabase.cliente
      .from('recompensas')
      .update({ activa, actualizado_en: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error al cambiar estado de recompensa:', error);
      throw error;
    }
  }

  /**
   * Elimina una recompensa (solo Administrador)
   */
  async eliminarRecompensa(id: string): Promise<void> {
    const { error } = await this.servicioSupabase.cliente
      .from('recompensas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar recompensa:', error);
      throw error;
    }
  }

  /**
   * Obtiene los parámetros de equivalencia de puntos desde configuracion_cine
   */
  async obtenerConfiguracionFidelizacion(): Promise<{
    pesosPorPunto: number;
    fidelizacionActiva: boolean;
  }> {
    const { data, error } = await this.servicioSupabase.cliente
      .from('configuracion_cine')
      .select('pesos_por_punto, fidelizacion_activa')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) {
      return { pesosPorPunto: 1.0, fidelizacionActiva: true };
    }

    return {
      pesosPorPunto: Number(data.pesos_por_punto ?? 1.0),
      fidelizacionActiva: Boolean(data.fidelizacion_activa ?? true)
    };
  }

  /**
   * Actualiza los parámetros de fidelización en configuracion_cine (solo Administrador)
   */
  async actualizarConfiguracionFidelizacion(
    pesosPorPunto: number,
    fidelizacionActiva: boolean
  ): Promise<void> {
    const { error } = await this.servicioSupabase.cliente
      .from('configuracion_cine')
      .update({
        pesos_por_punto: pesosPorPunto,
        fidelizacion_activa: fidelizacionActiva,
        actualizado_en: new Date().toISOString()
      })
      .eq('id', 1);

    if (error) {
      console.error('Error al actualizar configuración de fidelización:', error);
      throw error;
    }
  }

  /**
   * Obtiene el listado de cupones emitidos para auditoría de administración
   */
  async obtenerCuponesAdmin(): Promise<CuponCliente[]> {
    const { data, error } = await this.servicioSupabase.cliente
      .from('cupones_cliente')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error al obtener cupones para administración:', error);
      throw error;
    }

    return (data || []).map(c => this.mapearCupon(c));
  }

  // Mappers privados
  private mapearRecompensa(r: any): Recompensa {
    return {
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion,
      costoPuntos: Number(r.costo_puntos),
      tipo: r.tipo,
      valorBeneficio: Number(r.valor_beneficio ?? 0),
      productoCandyId: r.producto_candy_id,
      diasValidez: Number(r.dias_validez ?? 30),
      activa: Boolean(r.activa),
      creadoEn: r.creado_en,
      actualizadoEn: r.actualizado_en
    };
  }

  private mapearCupon(c: any): CuponCliente {
    return {
      id: c.id,
      codigoCupon: c.codigo_cupon,
      usuarioId: c.usuario_id,
      recompensaId: c.recompensa_id,
      tipo: c.tipo,
      valorBeneficio: Number(c.valor_beneficio ?? 0),
      descripcion: c.descripcion,
      origen: c.origen,
      estado: c.estado,
      creadoEn: c.creado_en,
      venceEn: c.vence_en,
      utilizadoEn: c.utilizado_en
    };
  }

  private mapearMovimiento(m: any): MovimientoPuntos {
    return {
      id: m.id,
      tipoMovimiento: m.tipo_movimiento,
      puntos: Number(m.puntos),
      saldoResultante: Number(m.saldo_resultante ?? 0),
      motivo: m.motivo,
      creadoEn: m.creado_en
    };
  }
}
