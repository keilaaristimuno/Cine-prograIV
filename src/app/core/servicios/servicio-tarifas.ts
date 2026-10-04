import { inject, Injectable } from '@angular/core';
import { FuncionConDetalle } from '../modelos/funcion';
import { ConfiguracionCine, FormatoProyeccion, ResumenPreciosFuncion, TarifaFormato } from '../modelos/tarifa';
import { ServicioSupabase } from './servicio-supabase';

@Injectable({
  providedIn: 'root'
})
export class ServicioTarifas {
  private readonly servicioSupabase = inject(ServicioSupabase);

  /**
   * Valores por defecto para fallback en caso de no haberse ejecutado el SQL aún
   */
  private readonly tarifasPorDefecto: Record<FormatoProyeccion, number> = {
    '2D': 10000,
    '3D': 12000,
    '4D': 15000,
    '5D': 18000
  };

  private readonly configPorDefecto: ConfiguracionCine = {
    id: 1,
    porcentajeRecargoVip: 50,
    porcentajeDescuentoPrimeraCompra: 20,
    descuentoPrimeraCompraActivo: true,
    diasAnticipacionPreventa: 7
  };

  /**
   * Obtiene la lista completa de tarifas por formato.
   */
  async obtenerTarifasFormatos(): Promise<TarifaFormato[]> {
    const cliente = this.servicioSupabase.cliente;
    const { data, error } = await cliente
      .from('tarifas_formato')
      .select('formato, precio_base, actualizado_en')
      .order('formato', { ascending: true });

    if (error || !data || data.length === 0) {
      // Fallback a los valores aprobados
      return (['2D', '3D', '4D', '5D'] as FormatoProyeccion[]).map(f => ({
        formato: f,
        precioBase: this.tarifasPorDefecto[f]
      }));
    }

    return data.map(t => ({
      formato: t.formato as FormatoProyeccion,
      precioBase: Number(t.precio_base),
      actualizadoEn: t.actualizado_en
    }));
  }

  /**
   * Actualiza el precio base de un formato específico (solo Administrador).
   */
  async actualizarTarifaFormato(formato: FormatoProyeccion, precioBase: number): Promise<void> {
    const cliente = this.servicioSupabase.cliente;
    const { error } = await cliente
      .from('tarifas_formato')
      .upsert({
        formato,
        precio_base: precioBase,
        actualizado_en: new Date().toISOString()
      }, { onConflict: 'formato' });

    if (error) {
      console.error('Error al actualizar tarifa:', error);
      throw error;
    }
  }

  /**
   * Obtiene la configuración general del cine (recargo VIP, primera compra, preventa).
   */
  async obtenerConfiguracionCine(): Promise<ConfiguracionCine> {
    const cliente = this.servicioSupabase.cliente;
    const { data, error } = await cliente
      .from('configuracion_cine')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) {
      return this.configPorDefecto;
    }

    return {
      id: data.id,
      porcentajeRecargoVip: Number(data.porcentaje_recargo_vip ?? 50),
      porcentajeDescuentoPrimeraCompra: Number(data.porcentaje_descuento_primera_compra ?? 20),
      descuentoPrimeraCompraActivo: Boolean(data.descuento_primera_compra_activo ?? true),
      diasAnticipacionPreventa: Number(data.dias_anticipacion_preventa ?? 7),
      actualizadoEn: data.actualizado_en
    };
  }

  /**
   * Actualiza los parámetros generales de la configuración del cine (solo Administrador).
   */
  async actualizarConfiguracionCine(config: Partial<ConfiguracionCine>): Promise<void> {
    const cliente = this.servicioSupabase.cliente;
    const datosActualizar: Record<string, any> = {
      actualizado_en: new Date().toISOString()
    };

    if (config.porcentajeRecargoVip !== undefined) {
      datosActualizar['porcentaje_recargo_vip'] = config.porcentajeRecargoVip;
    }
    if (config.porcentajeDescuentoPrimeraCompra !== undefined) {
      datosActualizar['porcentaje_descuento_primera_compra'] = config.porcentajeDescuentoPrimeraCompra;
    }
    if (config.descuentoPrimeraCompraActivo !== undefined) {
      datosActualizar['descuento_primera_compra_activo'] = config.descuentoPrimeraCompraActivo;
    }
    if (config.diasAnticipacionPreventa !== undefined) {
      datosActualizar['dias_anticipacion_preventa'] = config.diasAnticipacionPreventa;
    }

    const { error } = await cliente
      .from('configuracion_cine')
      .upsert({
        id: 1,
        ...datosActualizar
      }, { onConflict: 'id' });

    if (error) {
      console.error('Error al actualizar configuración de cine:', error);
      throw error;
    }
  }

  /**
   * Verifica si un usuario registrado califica para el descuento de primera compra
   * (tiene 0 compras completadas y la promoción está activa).
   */
  async verificarPrimeraCompraUsuario(usuarioId: string): Promise<boolean> {
    if (!usuarioId) {
      return false;
    }

    const cliente = this.servicioSupabase.cliente;
    const { count, error } = await cliente
      .from('compras')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId)
      .eq('estado', 'completada');

    if (error) {
      console.warn('No se pudo verificar historial de compras del usuario:', error);
      return false;
    }

    return (count ?? 0) === 0;
  }

  /**
   * Determina si una película se encuentra actualmente en período de preventa.
   */
  estaEnPreventa(pelicula: any, diasAnticipacionGlobal = 7): boolean {
    if (!pelicula || !pelicula.permitePreventa || !pelicula.fechaEstreno) {
      return false;
    }

    const hoy = new Date();
    // Normalizar a día calendario para comparación sin desfase de horas
    const hoyTimestamp = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();

    const partesEstreno = pelicula.fechaEstreno.split('T')[0].split('-');
    if (partesEstreno.length < 3) return false;
    const fechaEstreno = new Date(
      parseInt(partesEstreno[0], 10),
      parseInt(partesEstreno[1], 10) - 1,
      parseInt(partesEstreno[2], 10)
    );
    const estrenoTimestamp = fechaEstreno.getTime();

    // Solo puede estar en preventa ANTES del estreno oficial
    if (hoyTimestamp >= estrenoTimestamp) {
      return false;
    }

    const dias = pelicula.diasAnticipacionPreventa ?? diasAnticipacionGlobal;
    const fechaInicioPreventa = new Date(fechaEstreno);
    fechaInicioPreventa.setDate(fechaInicioPreventa.getDate() - dias);

    return hoyTimestamp >= fechaInicioPreventa.getTime();
  }

  /**
   * Obtiene el resumen consolidado de precios y promociones para una función particular.
   */
  async obtenerResumenPreciosFuncion(
    funcion: FuncionConDetalle,
    usuarioId?: string | null
  ): Promise<ResumenPreciosFuncion> {
    const [tarifas, config] = await Promise.all([
      this.obtenerTarifasFormatos(),
      this.obtenerConfiguracionCine()
    ]);

    const formato = (funcion.formato || '2D') as FormatoProyeccion;
    const tarifa = tarifas.find(t => t.formato === formato);
    const precioBase = tarifa?.precioBase ?? this.tarifasPorDefecto[formato] ?? 10000;
    const recargoVipPorcentaje = config.porcentajeRecargoVip;
    const precioVip = Math.round(precioBase * (1 + recargoVipPorcentaje / 100));

    // Evaluar preventa
    const pelicula = funcion.pelicula;
    const enPreventa = this.estaEnPreventa(pelicula, config.diasAnticipacionPreventa);
    const porcentajeDescuentoPreventa = enPreventa
      ? (pelicula?.porcentajeDescuentoPreventa ?? 20)
      : 0;

    // Evaluar primera compra
    let esPrimeraCompra = false;
    let aplicaPrimeraCompra = false;
    let porcentajeDescuentoPrimeraCompra = 0;

    if (usuarioId) {
      esPrimeraCompra = await this.verificarPrimeraCompraUsuario(usuarioId);
      if (esPrimeraCompra && config.descuentoPrimeraCompraActivo) {
        aplicaPrimeraCompra = true;
        porcentajeDescuentoPrimeraCompra = config.porcentajeDescuentoPrimeraCompra;
      }
    }

    // Regla de negocio M4.6: Descuentos no acumulables, gana el mayor porcentaje
    let mejorDescuentoPorcentaje = 0;
    let tipoMejorDescuento: 'ninguno' | 'preventa' | 'primera_compra' = 'ninguno';

    if (enPreventa && aplicaPrimeraCompra) {
      if (porcentajeDescuentoPreventa >= porcentajeDescuentoPrimeraCompra) {
        mejorDescuentoPorcentaje = porcentajeDescuentoPreventa;
        tipoMejorDescuento = 'preventa';
      } else {
        mejorDescuentoPorcentaje = porcentajeDescuentoPrimeraCompra;
        tipoMejorDescuento = 'primera_compra';
      }
    } else if (enPreventa) {
      mejorDescuentoPorcentaje = porcentajeDescuentoPreventa;
      tipoMejorDescuento = 'preventa';
    } else if (aplicaPrimeraCompra) {
      mejorDescuentoPorcentaje = porcentajeDescuentoPrimeraCompra;
      tipoMejorDescuento = 'primera_compra';
    }

    return {
      formato,
      precioBase,
      precioVip,
      recargoVipPorcentaje,
      enPreventa,
      porcentajeDescuentoPreventa,
      esPrimeraCompra,
      aplicaPrimeraCompra,
      porcentajeDescuentoPrimeraCompra,
      mejorDescuentoPorcentaje,
      tipoMejorDescuento
    };
  }
}
