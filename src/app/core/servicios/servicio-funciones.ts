import { inject, Injectable } from '@angular/core';
import {
  DatosNuevaFuncion,
  DatosProgramarFuncion,
  EstadoFuncion,
  Funcion,
  FuncionConDetalle,
  ResultadoProgramacion
} from '../modelos/funcion';
import { FormatoProyeccion, Sala } from '../modelos/sala';
import { ServicioPeliculas } from './servicio-peliculas';
import { ServicioSalas } from './servicio-salas';
import { ServicioSupabase } from './servicio-supabase';

/**
 * Margen obligatorio de limpieza y desinfección entre funciones en minutos.
 */
export const MINUTOS_LIMPIEZA_SALA = 30;

@Injectable({
  providedIn: 'root'
})
export class ServicioFunciones {
  private readonly servicioSupabase = inject(ServicioSupabase);
  private readonly servicioSalas = inject(ServicioSalas);
  private readonly servicioPeliculas = inject(ServicioPeliculas);

  /**
   * Obtiene todas las funciones ordenadas cronológicamente,
   * incluyendo los datos asociados de película y sala.
   */
  async obtenerFunciones(): Promise<FuncionConDetalle[]> {
    const cliente = this.servicioSupabase.cliente;

    const { data, error } = await cliente
      .from('funciones')
      .select(`
        id,
        pelicula_id,
        sala_id,
        fecha_hora_inicio,
        fecha_hora_fin,
        formato,
        estado,
        pelicula:peliculas (
          id,
          nombre,
          duracion_minutos,
          imagen_url
        ),
        sala:salas (
          id,
          numero,
          nombre,
          formato
        )
      `)
      .order('fecha_hora_inicio', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(fila => this.mapearFilaFuncion(fila));
  }

  /**
   * Obtiene una función por su identificador UUID.
   */
  async obtenerFuncionPorId(id: string): Promise<FuncionConDetalle | null> {
    const cliente = this.servicioSupabase.cliente;

    const { data, error } = await cliente
      .from('funciones')
      .select(`
        id,
        pelicula_id,
        sala_id,
        fecha_hora_inicio,
        fecha_hora_fin,
        formato,
        estado,
        pelicula:peliculas (
          id,
          nombre,
          duracion_minutos,
          imagen_url,
          clasificacion_edad,
          fecha_estreno,
          permite_preventa,
          porcentaje_descuento_preventa,
          dias_anticipacion_preventa
        ),
        sala:salas (
          id,
          numero,
          nombre,
          formato
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return this.mapearFilaFuncion(data);
  }

  /**
   * Obtiene exclusivamente las funciones programadas y futuras de una película específica
   * para la visualización pública en el detalle de la película (/pelicula/:id).
   *
   * Filtros aplicados en la consulta a Supabase:
   * - pelicula_id = peliculaId
   * - estado = 'programada' (descarta canceladas)
   * - fecha_hora_inicio >= momento actual (descarta pasadas)
   *
   * Orden: fecha_hora_inicio ASC.
   * Incluye datos de la sala asignada (número, nombre, formato).
   */
  async obtenerFuncionesDisponiblesPorPelicula(
    peliculaId: string
  ): Promise<FuncionConDetalle[]> {
    const cliente = this.servicioSupabase.cliente;
    const ahoraIso = new Date().toISOString();

    const { data, error } = await cliente
      .from('funciones')
      .select(`
        id,
        pelicula_id,
        sala_id,
        fecha_hora_inicio,
        fecha_hora_fin,
        formato,
        estado,
        sala:salas (
          id,
          numero,
          nombre,
          formato
        )
      `)
      .eq('pelicula_id', peliculaId)
      .eq('estado', 'programada')
      .gte('fecha_hora_inicio', ahoraIso)
      .order('fecha_hora_inicio', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(fila => this.mapearFilaFuncion(fila));
  }

  /**
   * Verifica si una sala está disponible para programar una nueva función.
   * Considera:
   * - Solo funciones en estado 'programada' de esa sala (las canceladas no bloquean).
   * - El margen de 30 minutos de limpieza posterior a cada proyección.
   * - Detección simétrica de solapamientos con intervalos semiabiertos [inicio, limite).
   */
  async verificarDisponibilidadSala(
    salaId: string,
    fechaHoraInicio: string,
    duracionMinutos: number,
    funcionIdExcluir?: string
  ): Promise<boolean> {
    const cliente = this.servicioSupabase.cliente;

    const inicioB = new Date(fechaHoraInicio);
    const finB = new Date(inicioB.getTime() + duracionMinutos * 60 * 1000);
    const limiteB = this.calcularLimiteOcupacion(finB);

    // Umbral inferior para filtrar funciones en Supabase:
    // Cualquier función A conflictiva debe tener finA + 30 min > inicioB,
    // lo que equivale a finA > (inicioB - 30 min).
    const umbralInferior = new Date(
      inicioB.getTime() - MINUTOS_LIMPIEZA_SALA * 60 * 1000
    ).toISOString();

    let consulta = cliente
      .from('funciones')
      .select('id, fecha_hora_inicio, fecha_hora_fin, estado')
      .eq('sala_id', salaId)
      .eq('estado', 'programada')
      // Solo funciones cuyo inicio sea anterior al límite con limpieza de la nueva función
      .lt('fecha_hora_inicio', limiteB.toISOString())
      // Solo funciones cuyo fin sea posterior a inicioB - 30 minutos
      .gt('fecha_hora_fin', umbralInferior);

    if (funcionIdExcluir) {
      consulta = consulta.neq('id', funcionIdExcluir);
    }

    const { data, error } = await consulta;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return true;
    }

    // Verificación exacta simétrica con cada función potencialmente conflictiva
    for (const f of data) {
      const inicioA = new Date(f.fecha_hora_inicio);
      const finA = new Date(f.fecha_hora_fin);

      if (this.existeConflictoHorario(inicioA, finA, inicioB, finB)) {
        return false; // Conflicto detectado -> sala no disponible
      }
    }

    return true; // Sin conflictos -> sala disponible
  }

  /**
   * Evalúa matemáticamente si dos funciones entran en conflicto considerando el margen de limpieza.
   *
   * Sean los intervalos semiabiertos de sala ocupada:
   *   A = [inicioA, finA + 30m)
   *   B = [inicioB, finB + 30m)
   *
   * Existe conflicto si y solo si:
   *   inicioB < limiteA  AND  inicioA < limiteB
   *
   * Esta regla es 100% simétrica y contempla tanto si B se programa después como antes de A.
   */
  existeConflictoHorario(
    inicioA: Date,
    finA: Date,
    inicioB: Date,
    finB: Date,
    minutosLimpieza: number = MINUTOS_LIMPIEZA_SALA
  ): boolean {
    const msLimpieza = minutosLimpieza * 60 * 1000;
    const limiteA = finA.getTime() + msLimpieza;
    const limiteB = finB.getTime() + msLimpieza;

    const tInicioA = inicioA.getTime();
    const tInicioB = inicioB.getTime();

    return tInicioB < limiteA && tInicioA < limiteB;
  }

  /**
   * Calcula el instante en que la sala queda desocupada y disponible tras la limpieza.
   * NO modifica la fechaHoraFin de la película; es un cálculo operativo.
   */
  calcularLimiteOcupacion(
    fechaFin: Date | string,
    minutosLimpieza: number = MINUTOS_LIMPIEZA_SALA
  ): Date {
    const f = typeof fechaFin === 'string' ? new Date(fechaFin) : fechaFin;
    return new Date(f.getTime() + minutosLimpieza * 60 * 1000);
  }

  /**
   * Helper para calcular la fechaHoraFin sumando la duración en minutos a la fecha de inicio.
   * La limpieza (30 min) NO se incluye en este cálculo; representa el fin real de la película.
   */
  calcularFechaFin(fechaInicioIso: string, duracionMinutos: number): string {
    const inicio = new Date(fechaInicioIso);
    const fin = new Date(inicio.getTime() + duracionMinutos * 60 * 1000);
    return fin.toISOString();
  }

  /**
   * Registra una nueva función en la base de datos tras validar la disponibilidad de la sala.
   * La fechaHoraFin se deriva siempre de fechaHoraInicio + duracionMinutos.
   */
  async guardarFuncion(datos: DatosNuevaFuncion): Promise<Funcion> {
    const disponible = await this.verificarDisponibilidadSala(
      datos.salaId,
      datos.fechaHoraInicio,
      datos.duracionMinutos
    );

    if (!disponible) {
      throw new Error(
        'La sala no está disponible en el horario solicitado (se superpone con otra función programada o su período obligatorio de 30 minutos de limpieza).'
      );
    }

    const cliente = this.servicioSupabase.cliente;

    const fechaHoraFin = this.calcularFechaFin(
      datos.fechaHoraInicio,
      datos.duracionMinutos
    );

    const { data, error } = await cliente
      .from('funciones')
      .insert({
        pelicula_id: datos.peliculaId,
        sala_id: datos.salaId,
        fecha_hora_inicio: datos.fechaHoraInicio,
        fecha_hora_fin: fechaHoraFin,
        formato: datos.formato,
        estado: 'programada'
      })
      .select('id, pelicula_id, sala_id, fecha_hora_inicio, fecha_hora_fin, formato, estado')
      .single();

    if (error) {
      throw error;
    }

    return {
      id: data.id,
      peliculaId: data.pelicula_id,
      salaId: data.sala_id,
      fechaHoraInicio: data.fecha_hora_inicio,
      fechaHoraFin: data.fecha_hora_fin,
      formato: data.formato as FormatoProyeccion,
      estado: data.estado as EstadoFuncion
    };
  }

  /**
   * Busca y selecciona automáticamente la primera sala activa y disponible
   * compatible con el formato requerido, ordenada por número ascendente.
   * Si ninguna sala está disponible, retorna null.
   */
  async buscarSalaDisponible(
    formato: FormatoProyeccion,
    fechaHoraInicio: string,
    duracionMinutos: number
  ): Promise<Sala | null> {
    const salasActivas = await this.servicioSalas.obtenerSalasActivas();

    // Conservar solamente salas cuyo formato coincida y ordenarlas por número ASC
    const salasCompatibles = salasActivas
      .filter(s => s.formato === formato)
      .sort((a, b) => a.numero - b.numero);

    if (salasCompatibles.length === 0) {
      return null;
    }

    // Iterar en orden por número y verificar disponibilidad
    for (const sala of salasCompatibles) {
      const disponible = await this.verificarDisponibilidadSala(
        sala.id,
        fechaHoraInicio,
        duracionMinutos
      );

      if (disponible) {
        return sala; // Seleccionar la PRIMERA disponible
      }
    }

    return null;
  }

  /**
   * Programa una nueva función con asignación automática de sala:
   * 1. Resuelve la película y su duración.
   * 2. Busca la primera sala activa y disponible del formato (por número ASC).
   * 3. Si no hay salas disponibles, arroja un error descriptivo (no crea la función).
   * 4. Guarda la función y retorna los datos creados y la sala asignada.
   */
  async programarFuncion(
    datos: DatosProgramarFuncion
  ): Promise<ResultadoProgramacion> {
    const pelicula = await this.servicioPeliculas.obtenerPeliculaPorId(
      datos.peliculaId
    );

    if (!pelicula) {
      throw new Error(
        'La película seleccionada no existe o no se encuentra disponible.'
      );
    }

    if (!pelicula.estaActiva) {
      throw new Error(
        'No se pueden programar funciones para una película inactiva.'
      );
    }

    const salaDisponible = await this.buscarSalaDisponible(
      datos.formato,
      datos.fechaHoraInicio,
      pelicula.duracionMinutos
    );

    if (!salaDisponible) {
      throw new Error(
        `No hay salas disponibles en formato ${datos.formato} para el horario seleccionado (considerando los ${pelicula.duracionMinutos} min de duración y los 30 min obligatorios de limpieza posterior).`
      );
    }

    const funcion = await this.guardarFuncion({
      peliculaId: datos.peliculaId,
      salaId: salaDisponible.id,
      fechaHoraInicio: datos.fechaHoraInicio,
      duracionMinutos: pelicula.duracionMinutos,
      formato: datos.formato
    });

    return {
      funcion,
      salaAsignada: salaDisponible
    };
  }

  /**
   * Alias descriptivo para listar todas las funciones ordenadas cronológicamente
   */
  async listarFunciones(): Promise<FuncionConDetalle[]> {
    return this.obtenerFunciones();
  }

  /**
   * Modifica el estado de una función a 'cancelada'.
   * La función se conserva en la base de datos pero se desocupa el slot de la sala.
   */
  async cancelarFuncion(id: string): Promise<void> {
    const cliente = this.servicioSupabase.cliente;

    const { error } = await cliente
      .from('funciones')
      .update({
        estado: 'cancelada'
      })
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  /**
   * Mapeador interno para normalizar registros de Supabase
   */
  private mapearFilaFuncion(fila: Record<string, any>): FuncionConDetalle {
    const peliculaFila = Array.isArray(fila['pelicula'])
      ? fila['pelicula'][0]
      : fila['pelicula'];
    const salaFila = Array.isArray(fila['sala'])
      ? fila['sala'][0]
      : fila['sala'];

    return {
      id: fila['id'],
      peliculaId: fila['pelicula_id'],
      salaId: fila['sala_id'],
      fechaHoraInicio: fila['fecha_hora_inicio'],
      fechaHoraFin: fila['fecha_hora_fin'],
      formato: fila['formato'] as FormatoProyeccion,
      estado: fila['estado'] as EstadoFuncion,
      pelicula: peliculaFila
        ? {
            id: peliculaFila.id,
            nombre: peliculaFila.nombre,
            duracionMinutos: peliculaFila.duracion_minutos,
            imagenUrl: peliculaFila.imagen_url,
            clasificacionEdad: peliculaFila.clasificacion_edad,
            fechaEstreno: peliculaFila.fecha_estreno,
            permitePreventa: peliculaFila.permite_preventa,
            porcentajeDescuentoPreventa: peliculaFila.porcentaje_descuento_preventa != null
              ? Number(peliculaFila.porcentaje_descuento_preventa)
              : undefined,
            diasAnticipacionPreventa: peliculaFila.dias_anticipacion_preventa != null
              ? Number(peliculaFila.dias_anticipacion_preventa)
              : undefined
          }
        : undefined,
      sala: salaFila
        ? {
            id: salaFila.id,
            numero: salaFila.numero,
            nombre: salaFila.nombre,
            formato: salaFila.formato as FormatoProyeccion
          }
        : undefined
    };
  }
}
