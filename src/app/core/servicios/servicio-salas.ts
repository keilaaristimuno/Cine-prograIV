import { inject, Injectable } from '@angular/core';
import { DatosNuevaSala, FormatoProyeccion, Sala } from '../modelos/sala';
import { ServicioSupabase } from './servicio-supabase';

@Injectable({
  providedIn: 'root'
})
export class ServicioSalas {
  private readonly servicioSupabase = inject(ServicioSupabase);

  /**
   * Obtiene todas las salas ordenadas por número ascendente.
   * Utilizado en el panel administrativo.
   */
  async obtenerSalas(): Promise<Sala[]> {
    const cliente = this.servicioSupabase.cliente;

    const { data, error } = await cliente
      .from('salas')
      .select('id, numero, nombre, formato, esta_activa')
      .order('numero', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(fila => ({
      id: fila.id,
      numero: fila.numero,
      nombre: fila.nombre,
      formato: fila.formato as FormatoProyeccion,
      estaActiva: fila.esta_activa
    }));
  }

  /**
   * Obtiene únicamente las salas activas operativamente, ordenadas por número ascendente.
   * Utilizado para la programación y asignación de funciones.
   */
  async obtenerSalasActivas(): Promise<Sala[]> {
    const cliente = this.servicioSupabase.cliente;

    const { data, error } = await cliente
      .from('salas')
      .select('id, numero, nombre, formato, esta_activa')
      .eq('esta_activa', true)
      .order('numero', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(fila => ({
      id: fila.id,
      numero: fila.numero,
      nombre: fila.nombre,
      formato: fila.formato as FormatoProyeccion,
      estaActiva: fila.esta_activa
    }));
  }

  /**
   * Obtiene una sala específica por su identificador UUID.
   */
  async obtenerSalaPorId(id: string): Promise<Sala | null> {
    const cliente = this.servicioSupabase.cliente;

    const { data, error } = await cliente
      .from('salas')
      .select('id, numero, nombre, formato, esta_activa')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      numero: data.numero,
      nombre: data.nombre,
      formato: data.formato as FormatoProyeccion,
      estaActiva: data.esta_activa
    };
  }

  /**
   * Registra una nueva sala en la base de datos.
   */
  async guardarSala(datos: DatosNuevaSala): Promise<void> {
    const cliente = this.servicioSupabase.cliente;

    const { error } = await cliente
      .from('salas')
      .insert({
        numero: datos.numero,
        nombre: datos.nombre.trim(),
        formato: datos.formato,
        esta_activa: datos.estaActiva
      });

    if (error) {
      // Manejo amigable del código PostgreSQL 23505 (violación de clave única)
      if (error.code === '23505') {
        throw new Error(
          `Ya existe una sala registrada con el número ${datos.numero}.`
        );
      }
      throw error;
    }
  }

  /**
   * Actualiza los datos de una sala existente.
   */
  async actualizarSala(id: string, datos: DatosNuevaSala): Promise<void> {
    const cliente = this.servicioSupabase.cliente;

    const { error } = await cliente
      .from('salas')
      .update({
        numero: datos.numero,
        nombre: datos.nombre.trim(),
        formato: datos.formato,
        esta_activa: datos.estaActiva
      })
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        throw new Error(
          `Ya existe otra sala registrada con el número ${datos.numero}.`
        );
      }
      throw error;
    }
  }

  /**
   * Modifica el estado de habilitación operativa de una sala.
   */
  async cambiarEstadoSala(id: string, estaActiva: boolean): Promise<void> {
    const cliente = this.servicioSupabase.cliente;

    const { error } = await cliente
      .from('salas')
      .update({
        esta_activa: estaActiva
      })
      .eq('id', id);

    if (error) {
      throw error;
    }
  }
}
