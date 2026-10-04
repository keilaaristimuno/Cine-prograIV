import { inject, Injectable } from '@angular/core';
import { DatosConfirmarCompra, ResultadoCompra } from '../modelos/compra';
import { ServicioSupabase } from './servicio-supabase';

@Injectable({
  providedIn: 'root'
})
export class ServicioCompras {
  private readonly servicioSupabase = inject(ServicioSupabase);

  /**
   * Ejecuta la compra atómica de entradas a través de la función RPC de PostgreSQL.
   *
   * Garantiza que dentro de una sola transacción:
   * 1. Se valida la función, sala y butacas.
   * 2. Se verifica que ninguna butaca esté ya ocupada.
   * 3. Se crea la compra y cada una de las entradas.
   * 4. Se devuelve el resultado estructurado para la confirmación.
   */
  async realizarCompra(datos: DatosConfirmarCompra): Promise<ResultadoCompra> {
    const cliente = this.servicioSupabase.cliente;

    const { data, error } = await cliente.rpc('realizar_compra_entradas', {
      p_funcion_id: datos.funcionId,
      p_butaca_ids: datos.butacaIds,
      p_email_contacto: datos.emailContacto?.trim() || null
    });

    if (error) {
      console.error('Error al ejecutar la RPC de compra:', error);

      // Detección de colisión de concurrencia (PostgreSQL 23505 o mensaje personalizado)
      if (
        error.code === '23505' ||
        error.message?.includes('ya fueron adquiridas') ||
        error.message?.includes('uq_entradas_funcion_butaca_activa')
      ) {
        throw new Error(
          'Una o más de las butacas seleccionadas acaban de ser compradas por otro usuario. Por favor, revisá el mapa y elegí otra ubicación.'
        );
      }

      throw new Error(
        error.message || 'Ocurrió un error inesperado al procesar la compra.'
      );
    }

    return data as ResultadoCompra;
  }

  /**
   * Obtiene los datos de una compra para usuarios autenticados que consulten su comprobante.
   * Respeta RLS en Supabase (solo el titular de la compra o admin pueden consultarla).
   */
  async obtenerCompraPorId(compraId: string): Promise<ResultadoCompra | null> {
    const cliente = this.servicioSupabase.cliente;

    const { data, error } = await cliente
      .from('compras')
      .select(`
        id,
        usuario_id,
        email_contacto,
        estado,
        creado_en,
        total,
        entradas (
          id,
          funcion_id,
          estado,
          butaca:butacas (
            id,
            fila,
            numero,
            bloque,
            tipo
          ),
          funcion:funciones (
            id,
            fecha_hora_inicio,
            formato,
            pelicula:peliculas ( nombre, clasificacion_edad ),
            sala:salas ( numero, nombre )
          )
        )
      `)
      .eq('id', compraId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const primerDetalle = (data.entradas as any[])?.[0];
    const funcionData = primerDetalle?.funcion;

    return {
      compra_id: data.id,
      usuario_id: data.usuario_id,
      email_contacto: data.email_contacto,
      estado: data.estado,
      creado_en: data.creado_en,
      total: data.total,
      funcion: {
        id: funcionData?.id || '',
        pelicula_nombre: funcionData?.pelicula?.nombre || 'Película',
        clasificacion_edad: funcionData?.pelicula?.clasificacion_edad || 'ATP',
        fecha_hora_inicio: funcionData?.fecha_hora_inicio || '',
        formato: funcionData?.formato || '',
        sala_numero: funcionData?.sala?.numero || 1,
        sala_nombre: funcionData?.sala?.nombre || ''
      },
      butacas: (data.entradas as any[]).map(e => ({
        id: e.butaca.id,
        fila: e.butaca.fila,
        numero: e.butaca.numero,
        bloque: e.butaca.bloque,
        tipo: e.butaca.tipo
      }))
    };
  }
}
