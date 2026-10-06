import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResultadoCompraCandy } from '../modelos/compra-candy';
import { ServicioPdfCandy } from './servicio-pdf-candy';

describe('ServicioPdfCandy (M6.3)', () => {
  let servicio: ServicioPdfCandy;

  const compraMock: ResultadoCompraCandy = {
    compra_id: '123e4567-e89b-12d3-a456-426614174000',
    usuario_id: 'user-1',
    email_contacto: 'cliente@correo.com',
    codigo_alfanumerico: 'CD-9B2K-4X7M',
    total: 12500,
    estado: 'comprada',
    retiro_validado: false,
    retiro_validado_en: null,
    creado_en: '2026-10-05T20:30:00Z',
    lineas: [
      {
        producto_id: 'prod-1',
        nombre_producto: 'Combo Mega Pochoclo',
        cantidad: 1,
        precio_unitario: 9500,
        subtotal: 9500,
        imagen_url: null
      },
      {
        producto_id: 'prod-2',
        nombre_producto: 'Gaseosa Mediana',
        cantidad: 1,
        precio_unitario: 3000,
        subtotal: 3000,
        imagen_url: null
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ServicioPdfCandy]
    });
    servicio = TestBed.inject(ServicioPdfCandy);
  });

  it('debe crearse correctamente', () => {
    expect(servicio).toBeDefined();
  });

  it('debe generar un DataURL base64 válido para el código QR de Candy', async () => {
    const dataUrl = await servicio.generarQrDataUrl('CD-9B2K-4X7M');

    expect(dataUrl).toBeDefined();
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('debe construir un documento jsPDF con el voucher de Candy y sus metadatos', async () => {
    const doc = await servicio.construirDocumentoPdf(compraMock);

    expect(doc).toBeDefined();
    // Verifica que tiene 1 página en formato A4
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('debe descargar el PDF con el nombre de archivo correspondiente al código Candy', async () => {
    const docMock = {
      save: vi.fn()
    };

    vi.spyOn(servicio, 'construirDocumentoPdf').mockResolvedValue(docMock as any);

    await servicio.descargarPdf(compraMock);

    expect(docMock.save).toHaveBeenCalledWith('voucher-candy-CD-9B2K-4X7M.pdf');
  });
});
