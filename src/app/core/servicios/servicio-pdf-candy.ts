import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import * as QRCode from 'qrcode';
import { ResultadoCompraCandy } from '../modelos/compra-candy';

/**
 * Servicio para generación local del código QR y emisión del voucher
 * de retiro de Candy Bar en formato PDF con jsPDF.
 *
 * Características:
 * - Genera el código QR 100% en el navegador (local/offline, sin APIs externas).
 * - Codifica EXCLUSIVAMENTE el código alfanumérico CD-XXXX-XXXX (sin PII, emails, productos ni JSON).
 * - Genera un comprobante vectorial tipo voucher con detalle de productos, cantidades, precios congelados y total.
 */
@Injectable({
  providedIn: 'root'
})
export class ServicioPdfCandy {
  /**
   * Genera el DataURL (PNG base64) del código QR a partir del código Candy (CD-XXXX-XXXX).
   * El QR codifica únicamente el código alfanumérico.
   */
  async generarQrDataUrl(codigoCandy: string): Promise<string> {
    return QRCode.toDataURL(codigoCandy, {
      margin: 1,
      width: 400,
      color: {
        dark: '#14101e',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
  }

  /**
   * Construye programáticamente el documento jsPDF del voucher de Candy.
   */
  async construirDocumentoPdf(compra: ResultadoCompraCandy): Promise<jsPDF> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const codigo = compra.codigo_alfanumerico || 'CD-PENDIENTE';
    const qrDataUrl = await this.generarQrDataUrl(codigo);

    // Márgenes y dimensiones en mm
    const margenX = 20;
    const anchoContenido = 170;
    let y = 18;

    // 1. Marco exterior estilo voucher de cine
    doc.setDrawColor(76, 56, 120);
    doc.setLineWidth(0.6);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margenX, y, anchoContenido, 255, 4, 4, 'FD');

    // 2. Cabecera institucional
    const altoCabecera = 28;
    doc.setFillColor(20, 16, 30); // #14101e
    doc.roundedRect(margenX, y, anchoContenido, altoCabecera, 4, 4, 'F');
    doc.rect(margenX, y + altoCabecera - 4, anchoContenido, 4, 'F'); // nivelar esquinas

    // Título institucional
    doc.setTextColor(245, 196, 81); // Dorado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('PANTALLA MÁGICA', margenX + 10, y + 12);

    // Subtítulo cabecera
    doc.setTextColor(221, 214, 254);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('CANDY BAR • VOUCHER DE RETIRO', margenX + 10, y + 20);

    // ID de compra
    doc.setTextColor(185, 179, 204);
    doc.setFontSize(8);
    doc.text(`ORDEN: ${compra.compra_id.substring(0, 18)}...`, margenX + anchoContenido - 10, y + 16, {
      align: 'right'
    });

    y += altoCabecera + 8;

    // 3. Título del Comprobante
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Comprobante de Retiro de Productos', margenX + 10, y);
    y += 7;

    // Badge de estado operativo: PENDIENTE DE RETIRO
    doc.setFillColor(245, 158, 11); // Ámbar #f59e0b
    doc.roundedRect(margenX + 10, y, 46, 6.5, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('PENDIENTE DE RETIRO', margenX + 33, y + 4.5, { align: 'center' });

    // Fecha de compra
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const fechaTexto = new Date(compra.creado_en).toLocaleString('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    doc.text(`Emitido: ${fechaTexto}`, margenX + anchoContenido - 10, y + 4.5, { align: 'right' });

    y += 12;

    // 4. Bloque central del Código y Código QR
    const anchoCajaCodigo = anchoContenido - 20;
    const altoCajaCodigo = 64;
    doc.setFillColor(248, 246, 252);
    doc.setDrawColor(216, 208, 235);
    doc.roundedRect(margenX + 10, y, anchoCajaCodigo, altoCajaCodigo, 3, 3, 'FD');

    // Imagen del QR centrado
    const tamanoQr = 40;
    const posXQr = margenX + 10 + (anchoCajaCodigo / 2) - (tamanoQr / 2);
    doc.addImage(qrDataUrl, 'PNG', posXQr, y + 4, tamanoQr, tamanoQr);

    // Código legible grande debajo del QR
    doc.setTextColor(20, 16, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(codigo, margenX + (anchoContenido / 2), y + 50, { align: 'center' });

    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Código exclusivo para retiro en mostrador', margenX + (anchoContenido / 2), y + 56, { align: 'center' });

    y += altoCajaCodigo + 10;

    // 5. Tabla de productos adquiridos (snapshots inmutables)
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Detalle de Productos', margenX + 10, y);
    y += 5;

    // Encabezado de la tabla
    doc.setFillColor(243, 244, 246);
    doc.rect(margenX + 10, y, anchoContenido - 20, 7, 'F');
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('PRODUCTO', margenX + 14, y + 4.8);
    doc.text('CANT.', margenX + 90, y + 4.8, { align: 'center' });
    doc.text('UNITARIO', margenX + 120, y + 4.8, { align: 'right' });
    doc.text('SUBTOTAL', margenX + anchoContenido - 14, y + 4.8, { align: 'right' });
    y += 7;

    // Filas de productos
    doc.setFont('helvetica', 'normal');
    for (const linea of compra.lineas) {
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(8.5);
      doc.text(linea.nombre_producto, margenX + 14, y + 5);
      doc.text(String(linea.cantidad), margenX + 90, y + 5, { align: 'center' });
      doc.text(`$${Math.round(linea.precio_unitario).toLocaleString('es-AR')}`, margenX + 120, y + 5, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(`$${Math.round(linea.subtotal).toLocaleString('es-AR')}`, margenX + anchoContenido - 14, y + 5, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      // Línea divisoria
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      doc.line(margenX + 10, y + 7.5, margenX + anchoContenido - 10, y + 7.5);
      y += 8;
    }

    y += 4;

    // 6. Total Abonado
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margenX + 10, y, anchoContenido - 20, 12, 2, 2, 'F');

    doc.setTextColor(75, 85, 99);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL ABONADO', margenX + 16, y + 7.5);

    doc.setTextColor(180, 83, 9); // Ámbar oscuro
    doc.setFontSize(13);
    doc.text(`$${Math.round(compra.total).toLocaleString('es-AR')}`, margenX + anchoContenido - 16, y + 8, {
      align: 'right'
    });

    y += 18;

    // 7. Pie de instrucciones de retiro
    doc.setDrawColor(229, 231, 235);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(margenX + 10, y, margenX + anchoContenido - 10, y);
    doc.setLineDashPattern([], 0);
    y += 7;

    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.text(
      '• Presentá este código en el mostrador del Candy Bar antes o durante el ingreso a tu función.',
      margenX + 10,
      y
    );
    y += 4.5;
    doc.text(
      `• Correo de contacto registrado: ${compra.email_contacto}`,
      margenX + 10,
      y
    );
    y += 4.5;
    doc.text(
      '• Este voucher es intransferible una vez retirado. El código pierde validez tras su entrega.',
      margenX + 10,
      y
    );

    return doc;
  }

  /**
   * Genera y descarga el archivo PDF directamente en el navegador del usuario.
   */
  async descargarPdf(compra: ResultadoCompraCandy): Promise<void> {
    const doc = await this.construirDocumentoPdf(compra);
    const nombreArchivo = `voucher-candy-${compra.codigo_alfanumerico || 'pedido'}.pdf`;
    doc.save(nombreArchivo);
  }
}
