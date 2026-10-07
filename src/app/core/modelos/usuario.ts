export type RolUsuario = 'administrador' | 'empleado' | 'cliente';

export type TipoSangre =
  | 'A+'
  | 'A-'
  | 'B+'
  | 'B-'
  | 'AB+'
  | 'AB-'
  | 'O+'
  | 'O-';

export interface PerfilUsuario {
  usuarioId: string;
  email?: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  tipoSangre: TipoSangre;
  colorOjos: string;
  diasVacaciones: number;
  rol: RolUsuario;
  credito: number;
  saldoPuntos?: number;
  creadoEn?: string;
}

export interface DatosRegistroUsuario {
  correo: string;
  contrasenia: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  tipoSangre: TipoSangre;
  colorOjos: string;
  diasVacaciones: number;
}
