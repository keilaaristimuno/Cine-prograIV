import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Butaca } from '../../../../core/modelos/butaca';
import { DatosBorradorCompra } from '../../../../core/modelos/compra';
import { FuncionConDetalle } from '../../../../core/modelos/funcion';
import { ResumenPreciosFuncion } from '../../../../core/modelos/tarifa';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';
import { ServicioButacas } from '../../../../core/servicios/servicio-butacas';
import { ServicioCompras } from '../../../../core/servicios/servicio-compras';
import { ServicioFunciones } from '../../../../core/servicios/servicio-funciones';
import { ServicioTarifas } from '../../../../core/servicios/servicio-tarifas';
import { MapaButacas } from '../../../../shared/components/mapa-butacas/mapa-butacas';

/**
 * Página pública de disponibilidad, selección y compra de butacas (/funcion/:id/butacas).
 *
 * Características:
 * - Accesible tanto para usuarios anónimos como autenticados.
 * - Mantiene selección local en Signal (seleccionadasIds).
 * - Sincroniza en tiempo real con Supabase Realtime (tabla 'entradas').
 * - Despliega modal de confirmación con resumen de compra, advertencia de edad y captura de email para anónimos.
 * - Invoca la transacción atómica RPC 'realizar_compra_entradas' en PostgreSQL.
 * - Transfiere el resultado de la compra de forma privada y segura hacia /compra/:id/confirmacion.
 */
@Component({
  selector: 'app-seleccion-butacas',
  imports: [CommonModule, RouterLink, FormsModule, MapaButacas],
  templateUrl: './seleccion-butacas.html',
  styleUrl: './seleccion-butacas.scss'
})
export class SeleccionButacas implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly servicioFunciones = inject(ServicioFunciones);
  private readonly servicioButacas = inject(ServicioButacas);
  private readonly servicioAuth = inject(ServicioAuth);
  private readonly servicioCompras = inject(ServicioCompras);
  private readonly servicioTarifas = inject(ServicioTarifas);

  readonly funcion = signal<FuncionConDetalle | null>(null);
  readonly butacas = signal<Butaca[]>([]);
  readonly ocupadasIds = signal<Set<string>>(new Set());
  readonly seleccionadasIds = signal<Set<string>>(new Set());

  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly avisoConflicto = signal<string | null>(null);

  /** Indica si la función admite selección de butacas */
  readonly permiteSeleccion = signal<boolean>(true);

  // Estados del modal de confirmación de compra
  readonly mostrarModalConfirmacion = signal<boolean>(false);
  readonly emailContacto = signal<string>('');
  readonly errorEmail = signal<string | null>(null);
  readonly procesandoCompra = signal<boolean>(false);
  readonly errorCompra = signal<string | null>(null);

  private canalRealtime: RealtimeChannel | null = null;
  private timerAviso: any = null;

  /** Cantidad total de butacas seleccionadas */
  readonly cantidadSeleccionadas = computed(() => this.seleccionadasIds().size);

  /** Datos de autenticación para diferenciar flujo registrado vs anónimo */
  readonly esUsuarioAutenticado = computed(() => this.servicioAuth.estaAutenticado());
  readonly usuarioPerfil = computed(() => this.servicioAuth.perfilActual());
  readonly usuarioAuth = computed(() => this.servicioAuth.usuarioActual());

  /**
   * Colección ordenada de butacas seleccionadas para mostrar en la barra resumen y modal.
   */
  readonly butacasSeleccionadas = computed<Butaca[]>(() => {
    const ids = this.seleccionadasIds();
    if (ids.size === 0) {
      return [];
    }
    const seleccionadas = this.butacas().filter(b => ids.has(b.id));
    return this.servicioButacas.ordenarButacas(seleccionadas);
  });

  /** Resumen de precios, recargos y promociones de la función */
  readonly resumenPrecios = signal<ResumenPreciosFuncion | null>(null);

  /**
   * Cálculo financiero en tiempo real de la selección:
   * Cantidades por tipo, subtotal, mejor descuento aplicable (no acumulable) y total estimado.
   */
  readonly calculoDetalle = computed(() => {
    const seleccionadas = this.butacasSeleccionadas();
    const resumen = this.resumenPrecios();
    const pNormal = resumen?.precioBase ?? 10000;
    const pVip = resumen?.precioVip ?? 15000;

    let subtotal = 0;
    let cantNormal = 0;
    let cantVip = 0;

    for (const b of seleccionadas) {
      if (b.tipo === 'vip') {
        subtotal += pVip;
        cantVip++;
      } else {
        subtotal += pNormal;
        cantNormal++;
      }
    }

    const tipoDesc = resumen?.tipoMejorDescuento ?? 'ninguno';
    const porcDesc = resumen?.mejorDescuentoPorcentaje ?? 0;
    const montoDesc = Math.round(subtotal * (porcDesc / 100));
    const total = subtotal - montoDesc;

    return {
      pNormal,
      pVip,
      cantNormal,
      cantVip,
      subtotal,
      tipoDesc,
      porcDesc,
      montoDesc,
      total
    };
  });

  obtenerPrecioUnitario(tipo: string): number {
    const resumen = this.resumenPrecios();
    if (tipo === 'vip') {
      return resumen?.precioVip ?? 15000;
    }
    return resumen?.precioBase ?? 10000;
  }

  /**
   * Calcula la edad real en años considerando año, mes y día.
   * Evita problemas de desfase horario parseando directamente la fecha en formato YYYY-MM-DD.
   */
  calcularEdad(fechaNacimientoIso: string): number {
    if (!fechaNacimientoIso) return 0;
    const soloFecha = fechaNacimientoIso.split('T')[0];
    const partes = soloFecha.split('-');
    if (partes.length < 3) return 0;

    const anioNac = parseInt(partes[0], 10);
    const mesNac = parseInt(partes[1], 10) - 1; // 0-indexed
    const diaNac = parseInt(partes[2], 10);

    if (isNaN(anioNac) || isNaN(mesNac) || isNaN(diaNac)) return 0;

    const hoy = new Date();
    let edad = hoy.getFullYear() - anioNac;
    const mesActual = hoy.getMonth();
    const diaActual = hoy.getDate();

    // Si aún no llegó el mes o el día de cumpleaños en el año corriente, restar un año
    if (mesActual < mesNac || (mesActual === mesNac && diaActual < diaNac)) {
      edad--;
    }
    return edad;
  }

  /**
   * Edad del usuario autenticado calculada en tiempo real a partir de su fecha de nacimiento
   */
  readonly edadUsuario = computed<number | null>(() => {
    if (!this.esUsuarioAutenticado()) {
      return null;
    }
    const fechaNac = this.usuarioPerfil()?.fechaNacimiento;
    if (!fechaNac) {
      return null;
    }
    return this.calcularEdad(fechaNac);
  });

  /**
   * Evalúa si un usuario registrado está bloqueado para la compra debido a la restricción de edad (+13 o +18).
   * Si es anónimo, nunca se bloquea porque no hay dato de edad verificable.
   */
  readonly bloqueoEdadRegistrado = computed<{
    bloqueado: boolean;
    mensaje: string | null;
    edad: number | null;
  }>(() => {
    if (!this.esUsuarioAutenticado()) {
      return { bloqueado: false, mensaje: null, edad: null };
    }

    const clasif = this.funcion()?.pelicula?.clasificacionEdad;
    if (clasif !== '+13' && clasif !== '+18') {
      return { bloqueado: false, mensaje: null, edad: this.edadUsuario() };
    }

    const edad = this.edadUsuario();
    if (edad === null) {
      return {
        bloqueado: true,
        mensaje: 'No se pudo verificar tu edad porque tu perfil no cuenta con una fecha de nacimiento registrada.',
        edad: null
      };
    }

    if (clasif === '+18' && edad < 18) {
      return {
        bloqueado: true,
        mensaje: `Esta película es exclusiva para mayores de 18 años (+18) y tu edad registrada es de ${edad} años. La compra se encuentra bloqueada por disposición legal.`,
        edad
      };
    }

    if (clasif === '+13' && edad < 13) {
      return {
        bloqueado: true,
        mensaje: `Esta película tiene restricción para mayores de 13 años (+13) y tu edad registrada es de ${edad} años. La compra se encuentra bloqueada.`,
        edad
      };
    }

    return { bloqueado: false, mensaje: null, edad };
  });

  /**
   * Genera el texto de advertencia de clasificación de edad y acompañamiento de un adulto.
   */
  readonly advertenciaClasificacion = computed<string | null>(() => {
    const clasif = this.funcion()?.pelicula?.clasificacionEdad;
    if (clasif === '+18') {
      return 'Película clasificada exclusivamente para mayores de 18 años (+18). Los menores de edad deben asistir obligatoriamente acompañados por un adulto responsable al ingresar a la sala.';
    }
    if (clasif === '+13') {
      return 'Película con restricción para mayores de 13 años (+13). Los menores de edad deben asistir obligatoriamente acompañados por un adulto responsable al ingresar a la sala.';
    }
    return null;
  });

  ngOnInit(): void {
    this.cargarDatos();

    // Limpieza segura del canal Realtime al navegar o destruir el componente
    this.destroyRef.onDestroy(() => {
      this.limpiarCanalRealtime();
      if (this.timerAviso) {
        clearTimeout(this.timerAviso);
      }
    });
  }

  /**
   * Carga la función solicitada, la sala, las butacas físicas y las ocupadas.
   */
  async cargarDatos(): Promise<void> {
    const funcionId = this.route.snapshot.paramMap.get('id');
    if (!funcionId) {
      this.error.set('No se especificó un identificador de función válido.');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    this.permiteSeleccion.set(true);

    try {
      // 1. Obtener datos de la función con película y sala
      const funcionData = await this.servicioFunciones.obtenerFuncionPorId(funcionId);
      if (!funcionData) {
        this.error.set('La función solicitada no existe o no se encuentra disponible.');
        this.permiteSeleccion.set(false);
        return;
      }

      this.funcion.set(funcionData);

      // 2. Validaciones de casos borde de la función
      if (funcionData.estado === 'cancelada') {
        this.error.set('Esta función ha sido cancelada y no admite venta ni selección de butacas.');
        this.permiteSeleccion.set(false);
        return;
      }

      const fechaInicio = new Date(funcionData.fechaHoraInicio);
      if (fechaInicio.getTime() <= Date.now()) {
        this.error.set('Esta función ya ha comenzado y no admite selección de butacas.');
        this.permiteSeleccion.set(false);
        return;
      }

      // 3. Cargar butacas físicas de la sala y butacas ocupadas en paralelo
      const [butacasData, ocupadasSet] = await Promise.all([
        this.servicioButacas.obtenerButacasPorSala(funcionData.salaId),
        this.servicioButacas.obtenerIdsButacasOcupadas(funcionId)
      ]);

      if (butacasData.length === 0) {
        this.error.set('No se encontraron butacas físicas registradas para la sala de esta función.');
        this.permiteSeleccion.set(false);
        return;
      }

      this.butacas.set(butacasData);
      this.ocupadasIds.set(ocupadasSet);

      // 4. Cargar tarifas y promociones aplicables para esta función
      const usuarioId = this.servicioAuth.usuarioActual()?.id ?? null;
      const resumen = await this.servicioTarifas.obtenerResumenPreciosFuncion(funcionData, usuarioId);
      this.resumenPrecios.set(resumen);

      // 5. Iniciar suscripción Realtime para detectar ocupaciones concurrentes
      this.iniciarSuscripcionRealtime(funcionId);
    } catch (err: any) {
      console.error('Error al inicializar la pantalla de selección de butacas:', err);
      this.error.set(
        err?.message || 'Ocurrió un error al cargar la disponibilidad de la sala.'
      );
    } finally {
      this.cargando.set(false);
    }
  }

  /**
   * Conecta el canal Realtime de Supabase para la función actual.
   */
  private iniciarSuscripcionRealtime(funcionId: string): void {
    this.limpiarCanalRealtime();

    this.canalRealtime = this.servicioButacas.suscribirOcupacionFuncion(
      funcionId,
      evento => this.procesarCambioRealtime(evento)
    );
  }

  /**
   * Procesa las notificaciones en tiempo real provenientes de la base de datos.
   */
  private procesarCambioRealtime(evento: { tipo: 'ocupada' | 'liberada'; butacaId: string }): void {
    if (evento.tipo === 'ocupada') {
      // 1. Marcar como ocupada en el signal
      this.ocupadasIds.update(set => {
        const nuevo = new Set(set);
        nuevo.add(evento.butacaId);
        return nuevo;
      });

      // 2. Si el usuario actual tenía esta butaca seleccionada localmente, expulsarla y alertar
      if (this.seleccionadasIds().has(evento.butacaId)) {
        this.seleccionadasIds.update(set => {
          const nuevo = new Set(set);
          nuevo.delete(evento.butacaId);
          return nuevo;
        });

        const butaca = this.butacas().find(b => b.id === evento.butacaId);
        const identificacion = butaca
          ? `Fila ${butaca.fila} — Butaca ${butaca.numero}`
          : 'Una de tus butacas';

        this.mostrarAvisoConflicto(
          `¡Atención! ${identificacion} acaba de ser confirmada por otro usuario y fue deseleccionada.`
        );

        // Si el modal de confirmación estaba abierto, cerrarlo para que revise la nueva selección
        if (this.mostrarModalConfirmacion()) {
          this.cerrarModalConfirmacion();
        }
      }
    } else if (evento.tipo === 'liberada') {
      // Liberar la butaca en la vista
      this.ocupadasIds.update(set => {
        const nuevo = new Set(set);
        nuevo.delete(evento.butacaId);
        return nuevo;
      });
    }
  }

  /**
   * Alterna la selección local de una butaca disponible.
   */
  alternarSeleccion(butaca: Butaca): void {
    if (!this.permiteSeleccion() || !butaca.estaActiva || this.ocupadasIds().has(butaca.id)) {
      return;
    }

    this.seleccionadasIds.update(actuales => {
      const nuevo = new Set(actuales);
      if (nuevo.has(butaca.id)) {
        nuevo.delete(butaca.id);
      } else {
        nuevo.add(butaca.id);
      }
      return nuevo;
    });
  }

  /**
   * Deselecciona todas las butacas elegidas localmente.
   */
  limpiarSeleccion(): void {
    this.seleccionadasIds.set(new Set());
  }

  /**
   * Abre el modal de confirmación con el resumen de la compra.
   */
  abrirModalConfirmacion(): void {
    if (this.cantidadSeleccionadas() === 0 || !this.permiteSeleccion()) {
      return;
    }

    // Bloquear si el usuario registrado no cumple con la restricción de edad
    if (this.bloqueoEdadRegistrado().bloqueado) {
      return;
    }

    this.errorCompra.set(null);
    this.errorEmail.set(null);

    // Si está autenticado, pre-completar con el email de su cuenta
    if (this.esUsuarioAutenticado()) {
      this.emailContacto.set(this.usuarioAuth()?.email || '');
    } else {
      this.emailContacto.set('');
    }

    this.mostrarModalConfirmacion.set(true);
  }

  /**
   * Cierra el modal de confirmación si no se encuentra procesando la transacción.
   */
  cerrarModalConfirmacion(): void {
    if (this.procesandoCompra()) {
      return;
    }
    this.mostrarModalConfirmacion.set(false);
    this.errorCompra.set(null);
    this.errorEmail.set(null);
  }

  /**
   * Valida los datos del comprador y la restricción de edad, construye el borrador
   * de compra en memoria y redirige a la pantalla de pago simulado (M5.2).
   */
  confirmarCompra(): void {
    if (this.procesandoCompra()) {
      return;
    }

    // Doble validación en frontend de restricción de edad antes de avanzar al pago
    if (this.bloqueoEdadRegistrado().bloqueado) {
      this.errorCompra.set(
        this.bloqueoEdadRegistrado().mensaje ||
        'La compra se encuentra bloqueada debido a la restricción de edad de la película.'
      );
      return;
    }

    const funcionActual = this.funcion();
    if (!funcionActual) {
      return;
    }

    // Validación de email para compras anónimas
    let emailFinal = this.emailContacto().trim();
    if (!this.esUsuarioAutenticado()) {
      if (!emailFinal) {
        this.errorEmail.set('El correo electrónico es obligatorio para recibir el comprobante.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFinal)) {
        this.errorEmail.set('Por favor ingresá un formato de correo electrónico válido.');
        return;
      }
    } else {
      // Para usuario registrado, si no escribió un email alternativo, usar el de su cuenta
      if (!emailFinal) {
        emailFinal = this.usuarioAuth()?.email || '';
      }
    }

    this.errorCompra.set(null);
    this.errorEmail.set(null);

    // Preparar el borrador en memoria para la pantalla de pago
    const borrador: DatosBorradorCompra = {
      funcionId: funcionActual.id,
      funcion: {
        id: funcionActual.id,
        peliculaNombre: funcionActual.pelicula?.nombre || 'Película',
        clasificacionEdad: funcionActual.pelicula?.clasificacionEdad || 'ATP',
        fechaHoraInicio: funcionActual.fechaHoraInicio,
        formato: funcionActual.formato,
        salaNumero: funcionActual.sala?.numero || 1,
        salaNombre: funcionActual.sala?.nombre || 'Sala'
      },
      butacas: this.butacasSeleccionadas().map(b => ({
        id: b.id,
        fila: b.fila,
        numero: b.numero,
        bloque: b.bloque,
        tipo: b.tipo,
        precioUnitario: this.obtenerPrecioUnitario(b.tipo)
      })),
      emailContacto: emailFinal,
      subtotalEstimado: this.calculoDetalle().subtotal,
      descuentoEstimado: this.calculoDetalle().montoDesc,
      totalEstimado: this.calculoDetalle().total,
      tipoDescuento: this.calculoDetalle().tipoDesc,
      porcentajeDescuento: this.calculoDetalle().porcDesc
    };

    // Guardar borrador en memoria en el servicio
    this.servicioCompras.establecerBorrador(borrador);

    // Cerrar modal
    this.mostrarModalConfirmacion.set(false);

    // Redirigir a la pantalla de pago simulado
    this.router.navigate(['/compra/pago'], {
      state: { borrador }
    });
  }

  /**
   * Alias semántico para avanzar al pago.
   */
  continuarAlPago(): void {
    this.confirmarCompra();
  }

  /**
   * Muestra un mensaje temporal de conflicto cuando Realtime ocupa una butaca seleccionada.
   */
  private mostrarAvisoConflicto(mensaje: string): void {
    this.avisoConflicto.set(mensaje);
    if (this.timerAviso) {
      clearTimeout(this.timerAviso);
    }
    this.timerAviso = setTimeout(() => {
      this.avisoConflicto.set(null);
    }, 7000);
  }

  cerrarAvisoConflicto(): void {
    this.avisoConflicto.set(null);
    if (this.timerAviso) {
      clearTimeout(this.timerAviso);
    }
  }

  private limpiarCanalRealtime(): void {
    if (this.canalRealtime) {
      this.servicioButacas.desuscribirCanal(this.canalRealtime);
      this.canalRealtime = null;
    }
  }

  /**
   * Helper para formatear fecha completa en español (ej: "Jueves 15 de Octubre - 20:30 hs")
   */
  formatearFechaHora(fechaIso: string): string {
    if (!fechaIso) return '';
    const fecha = new Date(fechaIso);
    const opcionesFecha: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    };
    const fechaTexto = fecha.toLocaleDateString('es-AR', opcionesFecha);
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    return `${fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1)} • ${horas}:${minutos} hs`;
  }
}
