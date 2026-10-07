import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Perfil } from './perfil';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';
import { PerfilUsuario } from '../../../../core/modelos/usuario';

describe('Perfil Component', () => {
  let component: Perfil;
  let fixture: ComponentFixture<Perfil>;

  const mockPerfil: PerfilUsuario = {
    usuarioId: 'user-uuid-123',
    email: 'cliente@ejemplo.com',
    nombre: 'Ana',
    apellido: 'García',
    fechaNacimiento: '1995-05-12',
    tipoSangre: 'A+',
    colorOjos: 'Marrones',
    diasVacaciones: 15,
    rol: 'cliente',
    credito: 250.5,
    saldoPuntos: 1200,
    creadoEn: '2026-01-10T14:00:00Z'
  };

  const perfilSignal = signal<PerfilUsuario | null>(mockPerfil);
  const usuarioSignal = signal<any>({ id: 'user-uuid-123', email: 'cliente@ejemplo.com' });

  let mockServicioAuth: {
    perfilActual: typeof perfilSignal;
    usuarioActual: typeof usuarioSignal;
    esAdmin: () => boolean;
    esEmpleado: () => boolean;
    actualizarPerfil: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    perfilSignal.set(mockPerfil);
    usuarioSignal.set({ id: 'user-uuid-123', email: 'cliente@ejemplo.com' });

    mockServicioAuth = {
      perfilActual: perfilSignal,
      usuarioActual: usuarioSignal,
      esAdmin: () => false,
      esEmpleado: () => false,
      actualizarPerfil: vi.fn().mockResolvedValue(mockPerfil)
    };

    await TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [
        provideRouter([]),
        { provide: ServicioAuth, useValue: mockServicioAuth }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Perfil);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe inicializar el formulario con los datos actuales del perfil', () => {
    expect(component.perfilForm).toBeDefined();
    expect(component.perfilForm.value.nombre).toBe('Ana');
    expect(component.perfilForm.value.apellido).toBe('García');
    expect(component.perfilForm.value.fechaNacimiento).toBe('1995-05-12');
    expect(component.perfilForm.value.tipoSangre).toBe('A+');
    expect(component.perfilForm.value.colorOjos).toBe('Marrones');
    expect(component.perfilForm.value.diasVacaciones).toBe(15);
  });

  it('debe validar que los campos obligatorios no queden vacíos', () => {
    component.perfilForm.patchValue({ nombre: '', apellido: '' });
    expect(component.perfilForm.invalid).toBe(true);
  });

  it('debe llamar a actualizarPerfil al enviar formulario válido', async () => {
    component.perfilForm.patchValue({
      nombre: 'Ana María',
      apellido: 'García',
      fechaNacimiento: '1995-05-12',
      tipoSangre: 'O+',
      colorOjos: 'Verdes',
      diasVacaciones: 20
    });
    component.perfilForm.markAsDirty();

    await component.guardarPerfil();

    expect(mockServicioAuth.actualizarPerfil).toHaveBeenCalledWith({
      nombre: 'Ana María',
      apellido: 'García',
      fechaNacimiento: '1995-05-12',
      tipoSangre: 'O+',
      colorOjos: 'Verdes',
      diasVacaciones: 20
    });
    expect(component.mensajeExito()).toContain('éxito');
  });

  it('debe mostrar mensaje de error si el servicio falla al actualizar', async () => {
    mockServicioAuth.actualizarPerfil.mockRejectedValue(new Error('Fallo de red'));
    component.perfilForm.patchValue({ nombre: 'Nuevo Nombre' });
    component.perfilForm.markAsDirty();

    await component.guardarPerfil();

    expect(component.mensajeError()).toBe('Fallo de red');
    expect(component.mensajeExito()).toBeNull();
  });

  it('debe restablecer los valores originales al llamar a restablecer()', () => {
    component.perfilForm.patchValue({ nombre: 'Modificado' });
    component.perfilForm.markAsDirty();

    component.restablecer();

    expect(component.perfilForm.value.nombre).toBe('Ana');
    expect(component.perfilForm.pristine).toBe(true);
  });

  it('no debe mostrar botón falso de instalación si el navegador no emitió el evento prompt', () => {
    const boton = fixture.nativeElement.querySelector('.boton-instalar-pwa');
    expect(boton).toBeNull();
  });

  it('debe mostrar botón de instalación cuando el navegador permite instalar la PWA', () => {
    (component.servicioPwa.puedeInstalar as any).set(true);
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('.boton-instalar-pwa');
    expect(boton).not.toBeNull();
    expect(boton.textContent).toContain('Instalar Pantalla Mágica');
  });

  it('debe mostrar badge de instalada cuando la app ya corre como PWA', () => {
    (component.servicioPwa.puedeInstalar as any).set(false);
    (component.servicioPwa.estaInstalada as any).set(true);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.pwa-estado--instalada');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain('Aplicación instalada');
  });
});
