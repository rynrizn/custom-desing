/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Motor y Gestor de Capas de Texto
 * ============================================================================
 * Soporta fuentes OFL locales, familias tipográficas ZAIREN, estilos avanzados
 * (negrita, cursiva, tracking, interlineado, contorno y sombra) y renderizado
 * nítido multi-línea tanto en pantalla como al rasterizar para exportación.
 */

import { CONFIG } from './config.js';
import { estado } from './estado.js';

export class GestorTexto {
  constructor() {
    if (typeof document !== 'undefined') {
      this.canvasMedicion = document.createElement('canvas');
      this.ctxMedicion = this.canvasMedicion?.getContext('2d');
    }
  }

  /**
   * Crea una nueva capa de texto predeterminada.
   */
  crearCapaTexto(textoInicial = 'TU TEXTO AQUÍ', fuente = 'Poppins') {
    const supActiva = estado.datos?.superficieActiva;
    const esManga = supActiva === 'manga_izquierda' || supActiva === 'manga_derecha';

    const capa = {
      id: `txt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      nombre: textoInicial.split('\n')[0].substr(0, 16) || 'Texto',
      tipo: 'texto',

      texto: textoInicial,
      fuente: fuente,
      tamanoPt: 42, // Tamaño en puntos tipográficos (~1.5 cm de altura de letra)
      color: '#0A0A0A',
      bold: true,
      italic: false,
      align: 'center', // 'left' | 'center' | 'right'
      letterSpacing: 0, // px adicionales de tracking
      lineHeight: 1.25,

      // Efectos de contorno y sombra
      strokeColor: '#FAF9F6',
      strokeWidth: 0, // 0 = sin contorno
      shadowColor: 'rgba(0, 0, 0, 0.35)',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,

      // Geometría en centímetros adaptada a la superficie activa (manga centrada a 9.5 cm, torso a 28 cm)
      xCm: 0,
      yCm: esManga ? 9.5 : 28.0,
      widthCm: esManga ? 10.0 : 18.0,
      heightCm: esManga ? 4.0 : 6.0,
      scaleX: 1.0,
      scaleY: 1.0,
      angleDeg: 0,
      flipH: false,
      flipV: false,
      opacity: 1.0,
      locked: false,
      visible: true
    };

    this.recalcularDimensionesCm(capa);
    return capa;
  }

  /**
   * Recalcula `widthCm` y `heightCm` de la capa de texto en función de su contenido,
   * tipografía y tamaño de fuente en puntos.
   */
  recalcularDimensionesCm(capa, pxPorCm = 28.0) {
    if (!capa || capa.tipo !== 'texto') return;

    const fontStyle = capa.italic ? 'italic' : 'normal';
    const fontWeight = capa.bold ? 'bold' : 'normal';
    const fontSizePx = (capa.tamanoPt / 72.0) * 2.54 * pxPorCm * (capa.scaleY || 1.0);

    const lineas = (capa.texto || '').split('\n');
    let maxAnchoPx = 0;
    const altoLineaPx = fontSizePx * (capa.lineHeight || 1.25);

    if (this.ctxMedicion) {
      this.ctxMedicion.save();
      this.ctxMedicion.font = `${fontStyle} ${fontWeight} ${fontSizePx}px "${capa.fuente}", sans-serif`;
      for (const l of lineas) {
        const metricas = this.ctxMedicion.measureText(l);
        let anchoL = metricas.width;
        if (capa.letterSpacing) {
          anchoL += (l.length - 1) * capa.letterSpacing;
        }
        if (anchoL > maxAnchoPx) maxAnchoPx = anchoL;
      }
      this.ctxMedicion.restore();
    } else {
      for (const l of lineas) {
        let anchoL = l.length * fontSizePx * 0.6;
        if (anchoL > maxAnchoPx) maxAnchoPx = anchoL;
      }
    }

    const altoTotalPx = Math.max(fontSizePx, lineas.length * altoLineaPx);
    // Margen adicional de seguridad para trazos acentuados o sombras
    const paddingCm = 0.6;
    capa.widthCm = parseFloat(((maxAnchoPx / pxPorCm) * (capa.scaleX || 1.0) + paddingCm).toFixed(2));
    capa.heightCm = parseFloat(((altoTotalPx / pxPorCm) + paddingCm).toFixed(2));
  }

  /**
   * Renderiza el texto en un contexto Canvas 2D dado.
   */
  dibujarCapa(ctx, capa, mesa, { omitirTransformacion = false } = {}) {
    if (!capa.visible || !capa.texto) return;

    const { cx, cy } = mesa.mundoACanvas ? mesa.mundoACanvas(capa.xCm, capa.yCm) : { cx: 0, cy: 0 };
    const escala = mesa.pxPorCmBase * mesa.zoom;
    const fontSizePx = (capa.tamanoPt / 72.0) * 2.54 * escala * (capa.scaleY || 1.0);
    const fontStyle = capa.italic ? 'italic' : 'normal';
    const fontWeight = capa.bold ? 'bold' : 'normal';

    ctx.save();
    ctx.globalAlpha = capa.opacity;
    if (!omitirTransformacion) {
      ctx.translate(cx, cy);
    ctx.rotate((capa.angleDeg * Math.PI) / 180);
      ctx.scale((capa.flipH ? -1 : 1) * (capa.scaleX || 1.0), capa.flipV ? -1 : 1);
    }

    ctx.font = `${fontStyle} ${fontWeight} ${fontSizePx}px "${capa.fuente}", sans-serif`;
    ctx.textAlign = capa.align || 'center';
    ctx.textBaseline = 'middle';

    const lineas = capa.texto.split('\n');
    const altoLineaPx = fontSizePx * (capa.lineHeight || 1.25);
    const inicioY = -((lineas.length - 1) * altoLineaPx) / 2;

    // Configuración de sombra
    if (capa.shadowBlur > 0 && capa.shadowColor) {
      ctx.shadowColor = capa.shadowColor;
      ctx.shadowBlur = capa.shadowBlur * mesa.zoom;
      ctx.shadowOffsetX = capa.shadowOffsetX * mesa.zoom;
      ctx.shadowOffsetY = capa.shadowOffsetY * mesa.zoom;
    }

    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i];
      const yPos = inicioY + i * altoLineaPx;

      // 1. Contorno (si está habilitado)
      if (capa.strokeWidth > 0 && capa.strokeColor) {
        ctx.strokeStyle = capa.strokeColor;
        ctx.lineWidth = capa.strokeWidth * (escala / 28.0);
        ctx.lineJoin = 'round';
        ctx.strokeText(linea, 0, yPos);
      }

      // 2. Relleno principal del texto
      ctx.fillStyle = capa.color || '#0A0A0A';
      ctx.fillText(linea, 0, yPos);
    }

    ctx.restore();
  }
}

export const gestorTexto = new GestorTexto();
