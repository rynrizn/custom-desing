/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Módulo de Renderizado y Exportación de Archivos
 * ============================================================================
 * Genera:
 * A) Vista Previa para Cliente: ZIP con PNGs de mockups acotados y marca de agua
 *    diagonal repetida "ZAIRENLAB" semitransparente.
 * B) Paquete Técnico Completo: ZIP con mockups limpios a 2240px, archivos originales,
 *    estampados transparentes a tamaño real a 300 DPI (hasta 6000px), especificaciones
 *    y proyecto.json.
 */

import { CONFIG } from './config.js';
import { estado } from './estado.js';
import { motorPoleraSVG } from './polera-svg.js';
import { gestorImagenes } from './imagenes.js';
import { gestorTexto } from './texto.js';
import { gestorPedido } from './pedido.js';
import { UNIDADES } from './unidades.js';

export class ExportadorArchivos {
  constructor() {}

  /**
   * Genera el paquete ZIP de VISTA PREVIA (para el cliente) con marca de agua "ZAIRENLAB".
   */
  async generarZipVistaPreviaCliente() {
    if (typeof JSZip === 'undefined') {
      throw new Error('La librería JSZip no está disponible en la página.');
    }

    const zip = new JSZip();
    let totalImagenesAgregadas = 0;

    for (let pIdx = 0; pIdx < estado.datos.poleras.length; pIdx++) {
      const polera = estado.datos.poleras[pIdx];
      const carpetaPolera = estado.datos.poleras.length > 1
        ? zip.folder(`polera-${pIdx + 1}-${polera.tallaVista}`)
        : zip;

      const superficies = ['anverso', 'reverso', 'manga_izquierda', 'manga_derecha'];

      for (const sup of superficies) {
        const capas = polera.superficies[sup]?.capas || [];
        if (!capas.length) continue; // Solo superficies con contenido

        // Generar mockup con marca de agua y cotas
        const blob = await this.renderizarMockupExportacion(polera, sup, {
          conMarcaAgua: true,
          conCotas: true,
          anchoPx: 1800
        });

        if (blob) {
          carpetaPolera.file(`vista_${sup}_marca_agua.png`, blob);
          totalImagenesAgregadas++;
        }
      }
    }

    if (totalImagenesAgregadas === 0) {
      throw new Error('No hay ninguna polera con estampados para exportar');
    }

    // Agregar resumen de pedido en el ZIP de vista previa
    zip.file('resumen_pedido.txt', this.generarResumenCliente());

    const blobZip = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const fecha = new Date().toISOString().split('T')[0];
    const nombreDescarga = `ZAIREN-VistaPrevia-${fecha}.zip`;

    this.descargarBlobEnNavegador(blobZip, nombreDescarga);
    return blobZip;
  }

  /**
   * Empaqueta el ZIP técnico interno para el pedido (que luego será cifrado en .zrn).
   */
  async empaquetarZipTecnicoPedido() {
    if (typeof JSZip === 'undefined') {
      throw new Error('La librería JSZip no está disponible.');
    }

    const zip = new JSZip();

    // 1. LEEME.txt en raíz
    zip.file('LEEME.txt', this.generarLeemeTaller());

    // 2. pedido.json y proyecto.json en raíz
    zip.file('pedido.json', JSON.stringify(gestorPedido.generarObjetoPedidoJSON(), null, 2));
    zip.file('proyecto.json', JSON.stringify(estado.datos, null, 2));

    // 3. Carpetas por polera: polera-N-[talla]-[HEX]/
    for (let pIdx = 0; pIdx < estado.datos.poleras.length; pIdx++) {
      const polera = estado.datos.poleras[pIdx];
      const colorLimpio = (polera.color || '#FFFFFF').replace('#', '').toUpperCase();
      const nombreCarpeta = `polera-${pIdx + 1}-${polera.tallaVista}-${colorLimpio}`;
      const fPolera = zip.folder(nombreCarpeta);

      // Ficha técnica específica de esta polera
      fPolera.file('especificaciones.txt', gestorPedido.generarTextoEspecificaciones(polera, pIdx + 1));

      const fOriginales = fPolera.folder('originales');
      const superficies = ['anverso', 'reverso', 'manga_izquierda', 'manga_derecha'];

      for (const sup of superficies) {
        const capas = polera.superficies[sup]?.capas || [];
        if (!capas.length) continue;

        // a) Mockup SIN marca de agua con cotas y reglas (resolución hasta 2240 px)
        const blobMockup = await this.renderizarMockupExportacion(polera, sup, {
          conMarcaAgua: false,
          conCotas: true,
          anchoPx: CONFIG.RESOLUCION_MOCKUP_PX
        });
        if (blobMockup) {
          fPolera.file(`mockup_${sup}.png`, blobMockup);
        }

        // b) Estampado listo transparente a tamaño real 1:1, 300 DPI
        const blobEstampado = await this.renderizarEstampadoTransparente300DPI(polera, sup);
        if (blobEstampado) {
          fPolera.file(`estampado_${sup}_300dpi.png`, blobEstampado);
        }

        // c) Guardar los archivos originales subidos sin modificar
        for (const capa of capas) {
          if (capa.tipo === 'imagen' && capa.originalFile) {
            fOriginales.file(`${capa.nombre}.${capa.fileExt || 'png'}`, capa.originalFile);
          }
        }
      }
    }

    const zipArrayBuffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
    return zipArrayBuffer;
  }

  /**
   * Renderiza el mockup completo de la prenda acotada con o sin marca de agua diagonal.
   */
  async renderizarMockupExportacion(polera, superficie, opciones = {}) {
    const { conMarcaAgua = false, conCotas = true, anchoPx = 2000 } = opciones;
    const canvas = document.createElement('canvas');
    canvas.width = anchoPx;
    canvas.height = anchoPx;
    const ctx = canvas.getContext('2d');

    // Fondo neutro blanco formal de ficha
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Configurar viewport calibrado
    const pxPorCm = (anchoPx * 0.72) / 60.0; // Polera de 60 cm centrada
    const centroX = canvas.width / 2.0;
    const centroY = canvas.height * 0.12;

    const mockMesa = {
      pxPorCmBase: pxPorCm,
      zoom: 1.0,
      mundoACanvas: (xCm, yCm) => ({
        cx: centroX + xCm * pxPorCm,
        cy: centroY + yCm * pxPorCm
      })
    };

    // 1. Dibujar la prenda vectorial con su color exacto
    motorPoleraSVG.dibujarPrendaEnCanvas(ctx, superficie, polera.color, polera.tallaVista);

    // 2. Dibujar estampados de esa superficie
    const capas = polera.superficies[superficie]?.capas || [];
    for (const capa of capas) {
      if (!capa.visible) continue;
      if (capa.tipo === 'imagen') {
        gestorImagenes.dibujarCapa(ctx, capa, mockMesa);
      } else if (capa.tipo === 'texto') {
        gestorTexto.dibujarCapa(ctx, capa, mockMesa);
      }
    }

    // 3. Dibujar cotas de taller (si está activado)
    if (conCotas) {
      this.dibujarCotasEnMockupExportacion(ctx, polera, superficie, mockMesa);
    }

    // 4. Marca de agua diagonal repetida "ZAIRENLAB" (si está activado)
    if (conMarcaAgua) {
      this.aplicarMarcaDeAguaDiagonal(ctx, canvas.width, canvas.height);
    }

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }

  /**
   * Dibuja la marca de agua diagonal repetida en semitransparente sobre todo el lienzo.
   */
  aplicarMarcaDeAguaDiagonal(ctx, w, h) {
    ctx.save();
    ctx.rotate((-32 * Math.PI) / 180);
    ctx.font = 'bold 38px "Poppins", sans-serif';
    ctx.fillStyle = 'rgba(10, 10, 10, 0.11)'; // Semitransparente visible pero no destructiva
    ctx.textAlign = 'center';

    const texto = 'ZAIRENLAB';
    const pasoX = 280;
    const pasoY = 160;

    // Rango amplio para cubrir todo el canvas rotado
    for (let y = -h * 1.5; y < h * 2.0; y += pasoY) {
      for (let x = -w * 1.5; x < w * 2.0; x += pasoX) {
        ctx.fillText(texto, x, y);
      }
    }
    ctx.restore();
  }

  /**
   * Genera el PNG transparente a tamaño real 1:1 a 300 DPI (hasta 6000 px de lado).
   */
  async renderizarEstampadoTransparente300DPI(polera, superficie) {
    const capas = polera.superficies[superficie]?.capas || [];
    if (!capas.length) return null;

    // Determinar la caja envolvente total de todos los diseños en centímetros
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (const c of capas) {
      if (!c.visible) continue;
      const semiW = (c.widthCm || 10) / 2;
      const semiH = (c.heightCm || 10) / 2;
      minX = Math.min(minX, c.xCm - semiW);
      maxX = Math.max(maxX, c.xCm + semiW);
      minY = Math.min(minY, c.yCm - semiH);
      maxY = Math.max(maxY, c.yCm + semiH);
    }

    const anchoTotalCm = Math.max(1, maxX - minX);
    const altoTotalCm = Math.max(1, maxY - minY);

    // 300 DPI = (300 / 2.54) píxeles por centímetro ≈ 118.11 px/cm
    const pxPorCm300DPI = 300.0 / 2.54;
    let targetWPx = Math.round(anchoTotalCm * pxPorCm300DPI);
    let targetHPx = Math.round(altoTotalCm * pxPorCm300DPI);

    // Respetar el límite de 6000 px por lado
    const maxLado = CONFIG.PIXELES_MAX_LADO_ESTAMPADO;
    if (targetWPx > maxLado || targetHPx > maxLado) {
      const escalaReduccion = Math.min(maxLado / targetWPx, maxLado / targetHPx);
      targetWPx = Math.round(targetWPx * escalaReduccion);
      targetHPx = Math.round(targetHPx * escalaReduccion);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWPx;
    canvas.height = targetHPx;
    const ctx = canvas.getContext('2d');

    // Fondo transparente nítido
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centroXCm = (minX + maxX) / 2.0;
    const centroYCm = (minY + maxY) / 2.0;
    const escalaEfectiva = targetWPx / anchoTotalCm;

    const mockMesa300 = {
      pxPorCmBase: escalaEfectiva,
      zoom: 1.0,
      mundoACanvas: (xCm, yCm) => ({
        cx: canvas.width / 2.0 + (xCm - centroXCm) * escalaEfectiva,
        cy: canvas.height / 2.0 + (yCm - centroYCm) * escalaEfectiva
      })
    };

    // Dibujar cada capa con fuentes vectoriales incrustadas
    for (const c of capas) {
      if (!c.visible) continue;
      if (c.tipo === 'imagen') {
        gestorImagenes.dibujarCapa(ctx, c, mockMesa300);
      } else if (c.tipo === 'texto') {
        gestorTexto.dibujarCapa(ctx, c, mockMesa300);
      }
    }

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }

  dibujarCotasEnMockupExportacion(ctx, polera, superficie, mesa) {
    const { anchoCm, largoCm } = motorPoleraSVG.obtenerEscalasTalla(polera.tallaVista, superficie);
    ctx.save();
    ctx.strokeStyle = '#4A4A4A';
    ctx.fillStyle = '#0A0A0A';
    ctx.lineWidth = 1.5;
    ctx.font = 'bold 16px monospace';

    // Rótulo de cabecera formal
    ctx.fillText(`POLERA: ${polera.nombre.toUpperCase()} — TALLA: ${polera.tallaVista} — COLOR: ${polera.color}`, 40, 50);
    ctx.fillText(`VISTA: ${superficie.toUpperCase().replace('_', ' ')}`, 40, 75);
    ctx.restore();
  }

  generarResumenCliente() {
    const pedido = gestorPedido.generarObjetoPedidoJSON();
    return `ZAIREN CAD TEXTIL v2 — VISTA PREVIA DE PEDIDO
Fecha: ${new Date().toLocaleDateString('es-ES')}
WhatsApp: ${pedido.cliente.whatsapp}
Total prendas: ${pedido.resumen.totalUnidadesPrenda}
Indicaciones: ${pedido.cliente.indicaciones}

¡Gracias por personalizar tu prenda con ZAIRENLAB!
`;
  }

  generarLeemeTaller() {
    return `======================================================================
ZAIRENLAB — ARCHIVO TÉCNICO DE PRODUCCIÓN Y ESTAMPADO
======================================================================
Este paquete contiene todas las piezas para corte, confección y serigrafía/DTF:

1. mockups/ : Previsualizaciones acotadas a 2240 px sin marcas de agua.
2. estampado_X_300dpi.png : Artes a tamaño real 1:1, fondo transparente, 300 DPI.
3. originales/ : Archivos originales subidos por el cliente sin compresión.
4. especificaciones.txt : Cotas exactas de colocación, distancias y tallas.
5. pedido.json : Datos estructurados de la orden y cantidades por talla.
6. proyecto.json : Archivo de sesión para reabrir y modificar en el editor ZAIREN.

ZAIREN — Corte silencioso.
`;
  }

  descargarBlobEnNavegador(blob, nombreArchivo) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

export const exportadorArchivos = new ExportadorArchivos();
