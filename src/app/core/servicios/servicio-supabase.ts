import { Injectable } from '@angular/core';
import {
  createClient,
  SupabaseClient
} from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ServicioSupabase {
    readonly cliente: SupabaseClient = createClient(
        environment.supabaseUrl,
        environment.supabasePublishableKey
    );

    /* Inicia sesión con correo y contraseña */
    async iniciarSesion(
        correo: string,
        contrasenia: string
        ): Promise<void> {
        const { error } =
            await this.cliente.auth.signInWithPassword({
            email: correo,
            password: contrasenia
            });

        if (error) {
            throw error;
        }
    }
    
    /* Cierra la sesión del usuario */
    async cerrarSesion(): Promise<void> {
    const { error } = await this.cliente.auth.signOut();

    if (error) {
      throw error;
    }
  }
    /* Registro  */
  async registrarUsuario(
      correo: string,
      contrasenia: string
    ): Promise<boolean> {
      const {
        data,
        error
      } = await this.cliente.auth.signUp({
        email: correo,
        password: contrasenia
      });

      if (error) {
        throw error;
      }

      return data.session !== null;
}


/* Verifica si hay una sesión activa */
  async haySesionActiva(): Promise<boolean> {
    const { data } = await this.cliente.auth.getSession();

    return data.session !== null;
  }
}

