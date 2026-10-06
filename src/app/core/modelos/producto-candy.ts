export type CategoriaCandy = 'combos' | 'pochoclos' | 'bebidas' | 'snacks';

export interface ProductoCandy {
  id: string;
  nombre: string;
  descripcion?: string | null;
  categoria: CategoriaCandy;
  precio: number;
  stock: number;
  imagenUrl?: string | null;
  esDestacado: boolean;
  estaActivo: boolean;
  creadoEn: string;
  actualizadoEn?: string;
}

export interface ProductoCandyFormDTO {
  nombre: string;
  descripcion?: string | null;
  categoria: CategoriaCandy;
  precio: number;
  stock: number;
  esDestacado: boolean;
  estaActivo: boolean;
}

export const CATEGORIAS_CANDY: { valor: CategoriaCandy; etiqueta: string; icono: string }[] = [
  { valor: 'combos', etiqueta: 'Combos', icono: '🍿🥤' },
  { valor: 'pochoclos', etiqueta: 'Pochoclos', icono: '🍿' },
  { valor: 'bebidas', etiqueta: 'Bebidas', icono: '🥤' },
  { valor: 'snacks', etiqueta: 'Snacks y Dulces', icono: '🍫' }
];
