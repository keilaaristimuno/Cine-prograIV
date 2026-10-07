import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '@supabase/supabase-js';
import {
  DatosRegistroUsuario,
  PerfilUsuario,
  RolUsuario,
  TipoSangre
} from '../modelos/usuario';
import { ServicioSupabase } from './servicio-supabase';

@Injectable({
  providedIn: 'root'
})
export class ServicioAuth {
  private readonly servicioSupabase = inject(ServicioSupabase);
  private readonly enrutador = inject(Router);

  readonly usuarioActual = signal<User | null>(null);
  readonly perfilActual = signal<PerfilUsuario | null>(null);
  readonly cargandoSesion = signal(true);

  readonly rolActual = computed<RolUsuario | null>(
    () => this.perfilActual()?.rol ?? null
  );

  readonly estaAutenticado = computed<boolean>(
    () => this.usuarioActual() !== null
  );

  readonly esAdmin = computed<boolean>(
    () => this.rolActual() === 'administrador'
  );

  readonly esEmpleado = computed<boolean>(
    () => this.rolActual() === 'empleado'
  );

  readonly esCliente = computed<boolean>(
    () => this.rolActual() === 'cliente'
  );

  private sesionInicializadaPromise: Promise<void>;

  constructor() {
    this.sesionInicializadaPromise = this.inicializarSesion();
  }

  /**
   * Garantiza que la sesión inicial y el perfil estén cargados
   * antes de que los Guards tomen una decisión.
   */
  async asegurarSesionLista(): Promise<void> {
    await this.sesionInicializadaPromise;
  }

  private async inicializarSesion(): Promise<void> {
    try {
      const cliente = this.servicioSupabase.cliente;
      const { data } = await cliente.auth.getSession();

      if (data.session?.user) {
        this.usuarioActual.set(data.session.user);
        await this.cargarPerfil(
          data.session.user.id,
          data.session.user.email
        );
      } else {
        this.usuarioActual.set(null);
        this.perfilActual.set(null);
      }

      // Escuchar cambios reactivos en la autenticación (login, logout, refresh de token)
      cliente.auth.onAuthStateChange(async (_evento, session) => {
        if (session?.user) {
          this.usuarioActual.set(session.user);
          await this.cargarPerfil(
            session.user.id,
            session.user.email
          );
        } else {
          this.usuarioActual.set(null);
          this.perfilActual.set(null);
        }
      });
    } catch (error) {
      console.error('Error al inicializar la sesión en Supabase:', error);
      this.usuarioActual.set(null);
      this.perfilActual.set(null);
    } finally {
      this.cargandoSesion.set(false);
    }
  }

  /**
   * Consulta el perfil del usuario en la tabla public.perfiles
   */
  async cargarPerfil(
    usuarioId: string,
    email?: string
  ): Promise<PerfilUsuario | null> {
    try {
      const cliente = this.servicioSupabase.cliente;
      const { data, error } = await cliente
        .from('perfiles')
        .select('*')
        .eq('usuario_id', usuarioId)
        .maybeSingle();

      if (error) {
        console.error('Error al consultar perfil en Supabase:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      const perfil: PerfilUsuario = {
        usuarioId: data.usuario_id,
        email: email ?? data.email,
        nombre: data.nombre ?? '',
        apellido: data.apellido ?? '',
        fechaNacimiento: data.fecha_nacimiento ?? '',
        tipoSangre: (data.tipo_sangre ?? 'O+') as TipoSangre,
        colorOjos: data.color_ojos ?? '',
        diasVacaciones: Number(data.dias_vacaciones ?? 0),
        rol: (data.rol ?? 'cliente') as RolUsuario,
        credito: Number(data.credito ?? 0),
        saldoPuntos: Number(data.saldo_puntos ?? 0),
        creadoEn: data.creado_en
      };

      this.perfilActual.set(perfil);
      return perfil;
    } catch (error) {
      console.error('Error inesperado al cargar perfil:', error);
      return null;
    }
  }

  /**
   * Inicia sesión con correo y contraseña, cargando inmediatamente su rol
   */
  async iniciarSesion(
    correo: string,
    contrasenia: string
  ): Promise<PerfilUsuario | null> {
    const cliente = this.servicioSupabase.cliente;
    const { data, error } = await cliente.auth.signInWithPassword({
      email: correo,
      password: contrasenia
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('No se obtuvo información del usuario.');
    }

    this.usuarioActual.set(data.user);
    const perfil = await this.cargarPerfil(data.user.id, data.user.email);
    return perfil;
  }

  /**
   * Registra un nuevo usuario en Supabase Auth y guarda sus datos en public.perfiles
   */
  async registrarse(
    datos: DatosRegistroUsuario
  ): Promise<{ sesionIniciada: boolean }> {
    const cliente = this.servicioSupabase.cliente;

    const { data, error } = await cliente.auth.signUp({
      email: datos.correo,
      password: datos.contrasenia,
      options: {
        data: {
          nombre: datos.nombre,
          apellido: datos.apellido,
          fecha_nacimiento: datos.fechaNacimiento,
          tipo_sangre: datos.tipoSangre,
          color_ojos: datos.colorOjos,
          dias_vacaciones: datos.diasVacaciones
        }
      }
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('No se pudo crear la cuenta de usuario.');
    }

    if (data.session?.user) {
      this.usuarioActual.set(data.session.user);
      await this.cargarPerfil(data.session.user.id, data.session.user.email);
      return { sesionIniciada: true };
    }

    return { sesionIniciada: false };
  }

  /**
   * Actualiza los datos editables del perfil del usuario en sesión.
   * Campos inmutables/protegidos (usuarioId, rol, saldoPuntos, credito) nunca se modifican.
   */
  async actualizarPerfil(datos: {
    nombre: string;
    apellido: string;
    fechaNacimiento: string;
    tipoSangre: TipoSangre;
    colorOjos: string;
    diasVacaciones: number;
  }): Promise<PerfilUsuario> {
    const usuario = this.usuarioActual();
    if (!usuario) {
      throw new Error('No hay una sesión de usuario activa.');
    }

    const cliente = this.servicioSupabase.cliente;

    // Actualización segura y atómica exclusivamente a través de la función RPC
    const { error } = await cliente.rpc('actualizar_mi_perfil', {
      p_nombre: datos.nombre.trim(),
      p_apellido: datos.apellido.trim(),
      p_fecha_nacimiento: datos.fechaNacimiento,
      p_tipo_sangre: datos.tipoSangre,
      p_color_ojos: datos.colorOjos.trim(),
      p_dias_vacaciones: Number(datos.diasVacaciones)
    });

    if (error) {
      console.error('Error al actualizar perfil mediante RPC:', error);
      throw new Error(error.message || 'No se pudo actualizar el perfil.');
    }

    const perfilActualizado = await this.cargarPerfil(usuario.id, usuario.email);
    if (!perfilActualizado) {
      throw new Error('El perfil se guardó pero no se pudo recargar el estado local.');
    }
    return perfilActualizado;
  }

  /**
   * Cierra la sesión activa en Supabase y limpia el estado local
   */
  async cerrarSesion(): Promise<void> {
    try {
      await this.servicioSupabase.cliente.auth.signOut();
    } finally {
      this.usuarioActual.set(null);
      this.perfilActual.set(null);
      await this.enrutador.navigate(['/iniciar-sesion']);
    }
  }
}
