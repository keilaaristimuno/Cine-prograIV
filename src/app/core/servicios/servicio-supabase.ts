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
}
