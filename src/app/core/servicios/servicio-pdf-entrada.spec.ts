import { describe, expect, it } from 'vitest';
import { ResultadoCompra } from '../modelos/compra';
import { ServicioPdfEntrada } from './servicio-pdf-entrada';

describe('ServicioPdfEntrada (M5.3)', () => {
  const servicio = new ServicioPdfEntrada();

  const compraPruebaIndividual: ResultadoCompra = {
    compra_id: 'compra-test-1234',
    usuario_id: 'user-test-uuid',
    email_contacto: 'cliente@test.com',
    estado: 'completada',
    creado_en: '2026-10-04T20:00:00Z',
    subtotal: 10000,
    porcentaje_descuento_aplicado: 0,
    monto_descuento: 0,
    tipo_descuento_aplicado: 'ninguno',
    es_primera_compra: false,
    total: 10000,
    codigo_alfanumerico: 'TK-Y4BW-ACG2',
    acceso_sala_validado: false,
    acceso_sala_validado_en: null,
    funcion: {
      id: 'func-1',
      pelicula_nombre: 'El Viaje de Chihiro',
      clasificacion_edad: 'ATP',
      fecha_hora_inicio: '2026-10-15T20:30:00Z',
      formato: '2D',
      sala_numero: 1,
      sala_nombre: 'Sala Principal',
      pelicula_imagen_url: null
    },
    butacas: [
      {
        id: 'b-1',
        fila: 'A',
        numero: 5,
        bloque: 'centro',
        tipo: 'normal',
        precioUnitario: 10000
      }
    ]
  };

  const compraPruebaGrupal: ResultadoCompra = {
    ...compraPruebaIndividual,
    compra_id: 'compra-grupal-5678',
    codigo_alfanumerico: 'TK-GRP4-7777',
    total: 40000,
    butacas: [
      { id: 'b-1', fila: 'A', numero: 5, bloque: 'centro', tipo: 'normal', precioUnitario: 10000 },
      { id: 'b-2', fila: 'A', numero: 6, bloque: 'centro', tipo: 'normal', precioUnitario: 10000 },
      { id: 'b-3', fila: 'A', numero: 7, bloque: 'centro', tipo: 'vip', precioUnitario: 15000 },
      { id: 'b-4', fila: 'A', numero: 8, bloque: 'centro', tipo: 'vip', precioUnitario: 15000 }
    ]
  };

  it('debe generar un DataURL en formato PNG base64 para el código de acceso al cine', async () => {
    const dataUrl = await servicio.generarQrDataUrl('TK-Y4BW-ACG2');
    expect(dataUrl).toBeDefined();
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(dataUrl.length).toBeGreaterThan(100);
  });

  it('debe construir el documento PDF de una entrada individual con 1 página', async () => {
    const doc = await servicio.construirDocumentoPdf(compraPruebaIndividual);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('debe construir el documento PDF de una entrada grupal de 4 butacas con 1 página', async () => {
    const doc = await servicio.construirDocumentoPdf(compraPruebaGrupal);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
  });
});
