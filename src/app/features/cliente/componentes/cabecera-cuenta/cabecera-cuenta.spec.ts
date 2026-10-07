import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { CabeceraCuenta } from './cabecera-cuenta';
import { ServicioAuth } from '../../../../core/servicios/servicio-auth';
import { PerfilUsuario } from '../../../../core/modelos/usuario';

describe('CabeceraCuenta Component', () => {
  let component: CabeceraCuenta;
  let fixture: ComponentFixture<CabeceraCuenta>;

  const perfilSignal = signal<PerfilUsuario | null>({
    usuarioId: 'user-id-456',
    email: 'cliente@pantallamagica.com',
    nombre: 'Elena',
    apellido: 'Rostova',
    fechaNacimiento: '1992-04-18',
    tipoSangre: 'B+',
    colorOjos: 'Azules',
    diasVacaciones: 21,
    rol: 'cliente',
    credito: 1500,
    saldoPuntos: 850
  });

  const usuarioSignal = signal<any>({
    id: 'user-id-456',
    email: 'cliente@pantallamagica.com'
  });

  const mockServicioAuth = {
    perfilActual: perfilSignal,
    usuarioActual: usuarioSignal,
    esAdmin: () => false,
    esEmpleado: () => false
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CabeceraCuenta],
      providers: [
        provideRouter([]),
        { provide: ServicioAuth, useValue: mockServicioAuth }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CabeceraCuenta);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe mostrar el nombre completo y los balances de puntos y crédito', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Elena Rostova');
    expect(el.textContent).toContain('850');
    expect(el.textContent).toContain('1,500.00');
  });

  it('debe contener los 5 enlaces a las secciones del Área Cliente', () => {
    const el: HTMLElement = fixture.nativeElement;
    const links = el.querySelectorAll('.tab');
    expect(links.length).toBe(5);

    const hrefs = Array.from(links).map(l => l.getAttribute('href') || l.getAttribute('ng-reflect-router-link'));
    const textContent = el.querySelector('.cabecera-cuenta__nav')?.textContent || '';

    expect(textContent).toContain('Mi Perfil');
    expect(textContent).toContain('Mis Entradas');
    expect(textContent).toContain('Mis Películas');
    expect(textContent).toContain('Mis Puntos');
    expect(textContent).toContain('Mis Cupones');
  });
});
