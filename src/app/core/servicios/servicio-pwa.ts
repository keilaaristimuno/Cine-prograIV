import { Injectable, signal } from '@angular/core';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Servicio para la gestión del ciclo de vida de la PWA (Progressive Web App).
 * Captura y gestiona el evento estándar nativo 'beforeinstallprompt'
 * permitiendo disparar la instalación exclusivamente cuando el navegador lo soporte
 * y no esté previamente instalada.
 */
@Injectable({
  providedIn: 'root'
})
export class ServicioPwa {
  /** Evento diferido capturado de beforeinstallprompt */
  private promptDiferido: BeforeInstallPromptEvent | null = null;

  /** Signal que indica si el navegador emitió el evento para disparar la instalación */
  readonly puedeInstalar = signal<boolean>(false);

  /** Signal que indica si la app ya se ejecuta en modo standalone o fue instalada */
  readonly estaInstalada = signal<boolean>(false);

  /** Signal para indicar proceso de instalación interactivo */
  readonly instalando = signal<boolean>(false);

  constructor() {
    this.inicializarListeners();
  }

  private inicializarListeners(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // 1. Detectar si la ventana ya corre como PWA instalada (standalone)
    const enModoStandalone =
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator as any).standalone === true;

    if (enModoStandalone) {
      this.estaInstalada.set(true);
      this.puedeInstalar.set(false);
    }

    // 2. Escuchar el evento oficial beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (evento: Event) => {
      // Prevenir el banner automático del navegador para dispararlo desde la UI
      evento.preventDefault();
      this.promptDiferido = evento as BeforeInstallPromptEvent;
      this.puedeInstalar.set(true);
    });

    // 3. Escuchar cuando la instalación se concreta exitosamente
    window.addEventListener('appinstalled', () => {
      this.estaInstalada.set(true);
      this.puedeInstalar.set(false);
      this.promptDiferido = null;
    });
  }

  /**
   * Invoca el diálogo nativo de instalación del navegador guardado en beforeinstallprompt.
   * Retorna true si el usuario aceptó la instalación, false si canceló o no está disponible.
   */
  async instalarApp(): Promise<boolean> {
    if (!this.promptDiferido) {
      return false;
    }

    try {
      this.instalando.set(true);
      await this.promptDiferido.prompt();
      const eleccion = await this.promptDiferido.userChoice;

      if (eleccion.outcome === 'accepted') {
        this.estaInstalada.set(true);
        this.puedeInstalar.set(false);
        this.promptDiferido = null;
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error al solicitar instalación de PWA:', err);
      return false;
    } finally {
      this.instalando.set(false);
    }
  }
}
