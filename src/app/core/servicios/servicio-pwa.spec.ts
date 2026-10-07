import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServicioPwa } from './servicio-pwa';

describe('ServicioPwa', () => {
  let servicio: ServicioPwa;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ServicioPwa]
    });
    servicio = TestBed.inject(ServicioPwa);
  });

  it('debe crearse correctamente con estado inicial no instalable', () => {
    expect(servicio).toBeDefined();
    // En entorno de tests Vitest sin interacción no debe poder instalar de inmediato
    expect(servicio.puedeInstalar()).toBe(false);
  });

  it('debe reaccionar al evento beforeinstallprompt y permitir instalación', () => {
    const mockEvento = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' })
    };

    window.dispatchEvent(
      Object.assign(new Event('beforeinstallprompt'), mockEvento)
    );

    expect(mockEvento.preventDefault).toHaveBeenCalled();
    expect(servicio.puedeInstalar()).toBe(true);
  });

  it('debe ejecutar prompt y actualizar estado al llamar a instalarApp()', async () => {
    const mockEvento = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' })
    };

    window.dispatchEvent(
      Object.assign(new Event('beforeinstallprompt'), mockEvento)
    );

    const resultado = await servicio.instalarApp();

    expect(mockEvento.prompt).toHaveBeenCalled();
    expect(resultado).toBe(true);
    expect(servicio.puedeInstalar()).toBe(false);
    expect(servicio.estaInstalada()).toBe(true);
  });

  it('debe manejar rechazo de instalación por parte del usuario', async () => {
    const mockEvento = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' })
    };

    window.dispatchEvent(
      Object.assign(new Event('beforeinstallprompt'), mockEvento)
    );

    const resultado = await servicio.instalarApp();

    expect(resultado).toBe(false);
    expect(servicio.estaInstalada()).toBe(false);
  });

  it('debe actualizar estado cuando se dispara el evento appinstalled', () => {
    servicio.puedeInstalar.set(true);

    window.dispatchEvent(new Event('appinstalled'));

    expect(servicio.estaInstalada()).toBe(true);
    expect(servicio.puedeInstalar()).toBe(false);
  });
});
