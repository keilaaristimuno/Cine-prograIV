import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import * as QRCode from 'qrcode';
import { ResultadoCompra } from '../modelos/compra';

/**
 * Servicio para generación local del código QR y emisión del comprobante
 * de entrada digital en formato PDF con jsPDF.
 *
 * Características:
 * - Genera el código QR 100% en el navegador (offline/local, sin APIs externas).
 * - Codifica exclusivamente el token alfanumérico de acceso (TK-XXXX-XXXX).
 * - Genera un documento PDF vectorial limpio, con tipografía institucional,
 *   detalle de función, butacas, total abonado y código de acceso para validación manual.
 */
@Injectable({
  providedIn: 'root'
})
export class ServicioPdfEntrada {
  /**
   * Genera el DataURL (PNG base64) del código QR a partir del token de acceso al cine.
   */
  async generarQrDataUrl(codigoAcceso: string): Promise<string> {
    return QRCode.toDataURL(codigoAcceso, {
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
   * Construye programáticamente el documento jsPDF de la entrada digital.
   */
  async construirDocumentoPdf(compra: ResultadoCompra): Promise<jsPDF> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const codigo = compra.codigo_alfanumerico || 'TK-PENDIENTE';
    const qrDataUrl = await this.generarQrDataUrl(codigo);

    const cantButacas = compra.butacas?.length ?? 1;
    const esGrupal = cantButacas > 1;

    // --- Geometría y márgenes del ticket en página A4 ---
    const margenX = 20;
    const anchoContenido = 170;
    let y = 20;

    // 1. Marco exterior tipo ticket
    doc.setDrawColor(55, 47, 78);
    doc.setLineWidth(0.6);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margenX, y, anchoContenido, 250, 4, 4, 'FD');

    // 2. Cabecera institucional
    const altoCabecera = 28;
    doc.setFillColor(20, 16, 30); // #14101e
    doc.roundedRect(margenX, y, anchoContenido, altoCabecera, 4, 4, 'F');
    // Cubrir esquinas inferiores para que sean rectas
    doc.rect(margenX, y + altoCabecera - 4, anchoContenido, 4, 'F');

    // Título de la marca
    doc.setTextColor(245, 196, 81); // #f5c451 dorado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('PANTALLA MÁGICA', margenX + 10, y + 12);

    // Subtítulo cabecera
    doc.setTextColor(221, 214, 254); // #ddd6fe
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('ENTRADA DIGITAL • PASE DE SALA', margenX + 10, y + 20);

    // Identificador de orden a la derecha
    doc.setTextColor(185, 179, 204);
    doc.setFontSize(8);
    doc.text(`ID: ${compra.compra_id.substring(0, 18)}...`, margenX + anchoContenido - 10, y + 16, {
      align: 'right'
    });

    y += altoCabecera + 10;

    // 3. Bloque de la película
    doc.setTextColor(17, 24, 39); // #111827
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);

    const tituloPelicula = compra.funcion.pelicula_nombre || 'Película';
    const lineasTitulo = doc.splitTextToSize(tituloPelicula, anchoContenido - 20);
    doc.text(lineasTitulo, margenX + 10, y);
    y += lineasTitulo.length * 7;

    // Badges de formato y clasificación
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');

    // Badge Formato
    doc.setFillColor(139, 92, 246); // #8b5cf6 violeta
    doc.roundedRect(margenX + 10, y, 18, 6, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(compra.funcion.formato || '2D', margenX + 19, y + 4.3, { align: 'center' });

    // Badge Clasificación
    doc.setFillColor(245, 158, 11); // #f59e0b ámbar
    doc.roundedRect(margenX + 31, y, 16, 6, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(compra.funcion.clasificacion_edad || 'ATP', margenX + 39, y + 4.3, { align: 'center' });

    y += 12;

    // 4. Grilla de datos de la función
    doc.setFillColor(248, 247, 252);
    doc.setDrawColor(229, 226, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margenX + 10, y, anchoContenido - 20, 22, 2, 2, 'FD');

    // Columna 1: Sala
    doc.setTextColor(107, 99, 128);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('SALA ASIGNADA', margenX + 15, y + 7);

    doc.setTextColor(20, 16, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(`Sala ${compra.funcion.sala_numero} (${compra.funcion.sala_nombre})`, margenX + 15, y + 14);

    // Columna 2: Fecha y Hora
    doc.setTextColor(107, 99, 128);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('FECHA Y HORARIO', margenX + 90, y + 7);

    doc.setTextColor(20, 16, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(this.formatearFechaHora(compra.funcion.fecha_hora_inicio), margenX + 90, y + 14);

    y += 28;

    // 5. Butacas adquiridas
    doc.setTextColor(107, 99, 128);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const tipoEntradaTexto = esGrupal
      ? `ENTRADA GRUPAL — ${cantButacas} PERSONAS`
      : 'ENTRADA INDIVIDUAL — 1 PERSONA';
    doc.text(tipoEntradaTexto, margenX + 10, y);
    y += 5;

    // Listado de butacas
    const textoButacas = compra.butacas
      .map(b => `${b.fila}${b.numero} (${b.tipo === 'vip' ? 'VIP' : b.tipo === 'accesible' ? 'Accesible' : 'Normal'})`)
      .join(', ');

    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const lineasButacas = doc.splitTextToSize(`Ubicaciones: ${textoButacas}`, anchoContenido - 20);
    doc.text(lineasButacas, margenX + 10, y);
    y += lineasButacas.length * 5 + 4;

    // Línea de puntos divisoria (perforación de ticket)
    doc.setDrawColor(180, 175, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(margenX + 5, y, margenX + anchoContenido - 5, y);
    doc.setLineDashPattern([], 0); // Restaurar sólido

    y += 8;

    // 6. Caja destacada del código QR
    const anchoQr = 52;
    const altoQr = 52;
    const qrX = margenX + (anchoContenido - anchoQr) / 2;

    doc.addImage(qrDataUrl, 'PNG', qrX, y, anchoQr, altoQr);
    y += altoQr + 4;

    // 7. Código alfanumérico debajo del QR para validación manual
    doc.setTextColor(107, 99, 128);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('CÓDIGO DE ACCESO MANUAL:', margenX + anchoContenido / 2, y, { align: 'center' });
    y += 6;

    doc.setTextColor(20, 16, 30);
    doc.setFont('courier', 'bold');
    doc.setFontSize(16);
    doc.text(codigo, margenX + anchoContenido / 2, y, { align: 'center' });
    y += 7;

    // Badge de estado
    if (compra.acceso_sala_validado) {
      doc.setFillColor(239, 68, 68); // Rojo
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.roundedRect(margenX + anchoContenido / 2 - 25, y, 50, 5.5, 1.5, 1.5, 'F');
      doc.text('INGRESO YA UTILIZADO', margenX + anchoContenido / 2, y + 4, { align: 'center' });
    } else {
      doc.setFillColor(16, 185, 129); // Verde
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.roundedRect(margenX + anchoContenido / 2 - 25, y, 50, 5.5, 1.5, 1.5, 'F');
      doc.text('● VÁLIDO PARA INGRESO', margenX + anchoContenido / 2, y + 4, { align: 'center' });
    }
    y += 12;

    // 8. Mensaje explicativo sobre la entrada grupal
    doc.setFillColor(245, 243, 255); // #f5f3ff violeta claro
    doc.setDrawColor(221, 214, 254);
    doc.setLineWidth(0.3);
    doc.roundedRect(margenX + 10, y, anchoContenido - 20, 18, 2, 2, 'FD');

    doc.setTextColor(76, 29, 149);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('AVISO DE ACCESO GRUPAL AL CINE:', margenX + 14, y + 5.5);

    doc.setTextColor(91, 33, 182);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    const avisoGrupalTexto = esGrupal
      ? `Presentá este único QR al ingresar a la sala. El acceso será validado para todo el grupo (${cantButacas} butacas) en un solo acto.`
      : 'Presentá este único QR al ingresar a la sala. El acceso será validado para tu butaca asignada.';
    const lineasAviso = doc.splitTextToSize(avisoGrupalTexto, anchoContenido - 28);
    doc.text(lineasAviso, margenX + 14, y + 10.5);

    y += 24;

    // 9. Resumen financiero y total
    doc.setTextColor(107, 99, 128);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Email de contacto: ${compra.email_contacto}`, margenX + 10, y);

    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const totalTexto = `Total abonado: $${Number(compra.total || 0).toLocaleString('es-AR')}`;
    doc.text(totalTexto, margenX + anchoContenido - 10, y, { align: 'right' });

    // 10. Pie de página de cortesía
    doc.setTextColor(156, 163, 175);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      'Pantalla Mágica • Por favor presentá este comprobante digital o impreso ante el personal de sala.',
      105,
      285,
      { align: 'center' }
    );

    return doc;
  }

  /**
   * Genera y descarga el archivo PDF de la entrada digital de Pantalla Mágica.
   */
  async descargarEntradaPdf(compra: ResultadoCompra): Promise<void> {
    const doc = await this.construirDocumentoPdf(compra);
    const codigo = compra.codigo_alfanumerico || 'TK-PENDIENTE';
    const nombreArchivo = `Entrada-PantallaMagica-${codigo}.pdf`;
    doc.save(nombreArchivo);
  }

  /**
   * Helper para formatear fecha completa en español
   */
  private formatearFechaHora(fechaIso: string): string {
    if (!fechaIso) return '';
    const fecha = new Date(fechaIso);
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    };
    const fechaTexto = fecha.toLocaleDateString('es-AR', opciones);
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    return `${fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1)} • ${horas}:${minutos} hs`;
  }
}
