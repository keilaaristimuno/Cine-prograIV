import { inject, Injectable, signal } from '@angular/core';
import { DatosBorradorCompra, DatosConfirmarCompra, ResultadoCompra } from '../modelos/compra';
import { ResultadoValidacionAcceso } from '../modelos/validacion-acceso';
import { ServicioSupabase } from './servicio-supabase';

@Injectable({
  providedIn: 'root'
})
export class ServicioCompras {
  private readonly servicioSupabase = inject(ServicioSupabase);

  /**
   * Estado puramente en memoria del borrador de compra en tránsito.
   * No se persiste en localStorage, sessionStorage ni base de datos.
   */
  private readonly borradorCompraSignal = signal<DatosBorradorCompra | null>(null);
  readonly borradorActual = this.borradorCompraSignal.asReadonly();

  /**
   * Guarda los datos preliminares de la compra para la pantalla de pago simulado.
   */
  establecerBorrador(datos: DatosBorradorCompra): void {
    this.borradorCompraSignal.set(datos);
  }

  /**
   * Retorna el borrador en memoria actual.
   */
  obtenerBorrador(): DatosBorradorCompra | null {
    return this.borradorCompraSignal();
  }

  /**
   * Limpia el borrador en memoria tras completar o cancelar la operación.
   */
  limpiarBorrador(): void {
    this.borradorCompraSignal.set(null);
  }

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
        subtotal,
        porcentaje_descuento_aplicado,
        monto_descuento,
        tipo_descuento_aplicado,
        es_primera_compra,
        total,
        codigo_alfanumerico,
        acceso_sala_validado,
        acceso_sala_validado_en,
        entradas (
          id,
          funcion_id,
          estado,
          precio_unitario,
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
            pelicula:peliculas ( id, nombre, clasificacion_edad, imagen_url, generos ),
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
      subtotal: Number(data.subtotal ?? data.total ?? 0),
      porcentaje_descuento_aplicado: Number(data.porcentaje_descuento_aplicado ?? 0),
      monto_descuento: Number(data.monto_descuento ?? 0),
      tipo_descuento_aplicado: data.tipo_descuento_aplicado ?? 'ninguno',
      es_primera_compra: Boolean(data.es_primera_compra ?? false),
      total: Number(data.total ?? 0),
      codigo_alfanumerico: data.codigo_alfanumerico || undefined,
      acceso_sala_validado: Boolean(data.acceso_sala_validado ?? false),
      acceso_sala_validado_en: data.acceso_sala_validado_en || null,
      funcion: {
        id: funcionData?.id || '',
        pelicula_id: funcionData?.pelicula?.id || '',
        pelicula_nombre: funcionData?.pelicula?.nombre || 'Película',
        clasificacion_edad: funcionData?.pelicula?.clasificacion_edad || 'ATP',
        fecha_hora_inicio: funcionData?.fecha_hora_inicio || '',
        formato: funcionData?.formato || '',
        sala_numero: funcionData?.sala?.numero || 1,
        sala_nombre: funcionData?.sala?.nombre || '',
        pelicula_imagen_url: funcionData?.pelicula?.imagen_url || null,
        pelicula_generos: Array.isArray(funcionData?.pelicula?.generos) ? funcionData.pelicula.generos : []
      },
      butacas: (data.entradas as any[]).map(e => ({
        id: e.butaca.id,
        fila: e.butaca.fila,
        numero: e.butaca.numero,
        bloque: e.butaca.bloque,
        tipo: e.butaca.tipo,
        precio_unitario: e.precio_unitario != null ? Number(e.precio_unitario) : null,
        precioUnitario: e.precio_unitario != null ? Number(e.precio_unitario) : undefined
      }))
    };
  }

  /**
   * Obtiene el listado histórico de compras del usuario autenticado.
   * Supabase RLS garantiza que solo se consulten las compras propias.
   */
  async obtenerMisCompras(): Promise<ResultadoCompra[]> {
    const cliente = this.servicioSupabase.cliente;

    const { data, error } = await cliente
      .from('compras')
      .select(`
        id,
        usuario_id,
        email_contacto,
        estado,
        creado_en,
        subtotal,
        porcentaje_descuento_aplicado,
        monto_descuento,
        tipo_descuento_aplicado,
        es_primera_compra,
        total,
        codigo_alfanumerico,
        acceso_sala_validado,
        acceso_sala_validado_en,
        entradas (
          id,
          funcion_id,
          estado,
          precio_unitario,
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
            pelicula:peliculas ( id, nombre, clasificacion_edad, imagen_url, generos ),
            sala:salas ( numero, nombre )
          )
        )
      `)
      .order('creado_en', { ascending: false });

    if (error || !data) {
      if (error) {
        console.error('Error al obtener mis compras:', error);
      }
      return [];
    }

    return (data as any[]).map(compra => {
      const primerDetalle = compra.entradas?.[0];
      const funcionData = primerDetalle?.funcion;

      return {
        compra_id: compra.id,
        usuario_id: compra.usuario_id,
        email_contacto: compra.email_contacto,
        estado: compra.estado,
        creado_en: compra.creado_en,
        subtotal: Number(compra.subtotal ?? compra.total ?? 0),
        porcentaje_descuento_aplicado: Number(compra.porcentaje_descuento_aplicado ?? 0),
        monto_descuento: Number(compra.monto_descuento ?? 0),
        tipo_descuento_aplicado: compra.tipo_descuento_aplicado ?? 'ninguno',
        es_primera_compra: Boolean(compra.es_primera_compra ?? false),
        total: Number(compra.total ?? 0),
        codigo_alfanumerico: compra.codigo_alfanumerico || undefined,
        acceso_sala_validado: Boolean(compra.acceso_sala_validado ?? false),
        acceso_sala_validado_en: compra.acceso_sala_validado_en || null,
        funcion: {
          id: funcionData?.id || '',
          pelicula_id: funcionData?.pelicula?.id || '',
          pelicula_nombre: funcionData?.pelicula?.nombre || 'Película',
          clasificacion_edad: funcionData?.pelicula?.clasificacion_edad || 'ATP',
          fecha_hora_inicio: funcionData?.fecha_hora_inicio || '',
          formato: funcionData?.formato || '',
          sala_numero: funcionData?.sala?.numero || 1,
          sala_nombre: funcionData?.sala?.nombre || '',
          pelicula_imagen_url: funcionData?.pelicula?.imagen_url || null,
          pelicula_generos: Array.isArray(funcionData?.pelicula?.generos) ? funcionData.pelicula.generos : []
        },
        butacas: (compra.entradas || []).map((e: any) => ({
          id: e.butaca?.id || e.id,
          fila: e.butaca?.fila || '',
          numero: e.butaca?.numero || 0,
          bloque: e.butaca?.bloque || '',
          tipo: e.butaca?.tipo || '',
          precio_unitario: e.precio_unitario != null ? Number(e.precio_unitario) : null,
          precioUnitario: e.precio_unitario != null ? Number(e.precio_unitario) : undefined
        }))
      };
    });
  }

  /**
   * Valida el acceso a la sala mediante el código alfanumérico único de la compra (o escaneo QR).
   * Solo disponible para roles 'empleado' y 'administrador'.
   * Invoca la función RPC en PostgreSQL con control de concurrencia y validación de uso único.
   */
  async validarAccesoSala(codigo: string): Promise<ResultadoValidacionAcceso> {
    const codigoLimpio = codigo.trim().toUpperCase();

    if (!codigoLimpio) {
      return {
        ok: false,
        estado_validacion: 'codigo_invalido',
        mensaje: 'Debés ingresar o escanear un código de acceso.'
      };
    }

    try {
      const cliente = this.servicioSupabase.cliente;
      const { data, error } = await cliente.rpc('validar_acceso_sala', {
        p_codigo: codigoLimpio
      });

      if (error) {
        console.error('Error al invocar validar_acceso_sala:', error);

        if (
          error.code === '42501' ||
          error.message?.includes('permisos') ||
          error.message?.includes('Acceso denegado')
        ) {
          return {
            ok: false,
            estado_validacion: 'no_autorizado',
            mensaje: 'No tenés permisos de empleado o administrador para validar entradas.'
          };
        }

        return {
          ok: false,
          estado_validacion: 'error_desconocido',
          mensaje: 'Ocurrió un error inesperado al procesar la validación. Por favor, intentá nuevamente.'
        };
      }

      return data as ResultadoValidacionAcceso;
    } catch (err) {
      console.error('Excepción inesperada en validarAccesoSala:', err);
      return {
        ok: false,
        estado_validacion: 'error_desconocido',
        mensaje: 'Error de conexión al validar la entrada. Por favor, revisá tu red e intentá de nuevo.'
      };
    }
  }
}

