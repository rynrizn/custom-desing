/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Módulo de Gestión de Capas y Barra Flotante
 * ============================================================================
 * Provee la lista de capas por superficie con visibilidad, bloqueo, duplicación,
 * reordenamiento y eliminación (esencial en móvil), más la barra flotante contextual
 * y operaciones geométricas de alineación respecto a la silueta de la prenda.
 */

import { estado } from './estado.js';
import { motorPoleraSVG } from './polera-svg.js';
import { gestorTexto } from './texto.js';
import { gestorMangas } from './mangas.js';

export class GestorCapas {
  constructor() {}

  /**
   * Obtiene la zona de referencia paramétrica para alineación y centrado según la superficie activa.
   * - Anverso / Reverso: Zona de 30 x 40 cm (centro x=0, y=28.0 cm).
   * - Manga plana: Zona de 10 x 12 cm (centro x=0, y=9.5 cm).
   */
  obtenerZonaReferenciaCm(superficie) {
    const esManga = superficie === 'manga_izquierda' || superficie === 'manga_derecha';
    if (esManga) {
      return {
        centerX: 0,
        centerY: 9.5,
        minX: -5.0,
        maxX: 5.0,
        minY: 3.5,
        maxY: 15.5,
        ancho: 10.0,
        alto: 12.0
      };
    } else {
      return {
        centerX: 0,
        centerY: 28.0,
        minX: -15.0,
        maxX: 15.0,
        minY: 8.0,
        maxY: 48.0,
        ancho: 30.0,
        alto: 40.0
      };
    }
  }

  /**
   * Calcula la caja visual real (AABB) de la capa en centímetros reales considerando:
   * - Escala independiente por eje (scaleX, scaleY).
   * - Rotación libre (angleDeg).
   * - Tinta renderizada para texto de 1 o múltiples líneas.
   */
  obtenerCajaVisualRealCm(capa, pxPorCm = 28.0) {
    if (!capa) return null;

    let xMinLocal = 0;
    let xMaxLocal = 0;
    let yMinLocal = 0;
    let yMaxLocal = 0;

    if (capa.tipo === 'texto') {
      const lineas = (capa.texto || '').split('\n');
      const fontSizeCm = ((capa.tamanoPt || 42) / 72.0) * 2.54 * (capa.scaleY || 1.0);
      const altoLineaCm = fontSizeCm * (capa.lineHeight || 1.25);
      const totalLineas = lineas.length || 1;

      // Medir anchos de línea reales
      let maxAnchoCm = 0;
      if (typeof gestorTexto !== 'undefined' && gestorTexto.ctxMedicion) {
        const fontStyle = capa.italic ? 'italic' : 'normal';
        const fontWeight = capa.bold ? 'bold' : 'normal';
        const fontSizePx = fontSizeCm * pxPorCm;
        gestorTexto.ctxMedicion.font = `${fontStyle} ${fontWeight} ${fontSizePx}px "${capa.fuente || 'Poppins'}", sans-serif`;

        for (const l of lineas) {
          let wPx = gestorTexto.ctxMedicion.measureText(l).width;
          if (capa.letterSpacing) {
            wPx += (l.length - 1) * capa.letterSpacing;
          }
          const wCm = (wPx / pxPorCm) * (capa.scaleX || 1.0);
          if (wCm > maxAnchoCm) maxAnchoCm = wCm;
        }
      }

      if (maxAnchoCm <= 0) {
        maxAnchoCm = Math.max(1.0, (capa.widthCm || 10.0) - 0.6);
      }

      const align = capa.align || 'center';
      if (align === 'center') {
        xMinLocal = -maxAnchoCm / 2;
        xMaxLocal = maxAnchoCm / 2;
      } else if (align === 'left') {
        xMinLocal = 0;
        xMaxLocal = maxAnchoCm;
      } else if (align === 'right') {
        xMinLocal = -maxAnchoCm;
        xMaxLocal = 0;
      }

      const altoTotalCm = Math.max(fontSizeCm, (totalLineas - 1) * altoLineaCm + fontSizeCm);
      yMinLocal = -altoTotalCm / 2;
      yMaxLocal = altoTotalCm / 2;
    } else {
      // Imagen o figura rectangular
      const w = (capa.widthCm || 10.0) * Math.abs(capa.scaleX || 1.0);
      const h = (capa.heightCm || 10.0) * Math.abs(capa.scaleY || 1.0);
      xMinLocal = -w / 2;
      xMaxLocal = w / 2;
      yMinLocal = -h / 2;
      yMaxLocal = h / 2;
    }

    // 4 esquinas del rectángulo local
    const corners = [
      { x: xMinLocal, y: yMinLocal },
      { x: xMaxLocal, y: yMinLocal },
      { x: xMaxLocal, y: yMaxLocal },
      { x: xMinLocal, y: yMaxLocal }
    ];

    // Rotar esquinas según ángulo en grados
    const rad = ((capa.angleDeg || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    let minXRot = Infinity;
    let maxXRot = -Infinity;
    let minYRot = Infinity;
    let maxYRot = -Infinity;

    for (const pt of corners) {
      const rx = pt.x * cos - pt.y * sin;
      const ry = pt.x * sin + pt.y * cos;
      if (rx < minXRot) minXRot = rx;
      if (rx > maxXRot) maxXRot = rx;
      if (ry < minYRot) minYRot = ry;
      if (ry > maxYRot) maxYRot = ry;
    }

    const visualWidthCm = maxXRot - minXRot;
    const visualHeightCm = maxYRot - minYRot;
    const deltaXCm = (minXRot + maxXRot) / 2;
    const deltaYCm = (minYRot + maxYRot) / 2;

    const currentCenterX = capa.xCm + deltaXCm;
    const currentCenterY = capa.yCm + deltaYCm;

    return {
      minX: capa.xCm + minXRot,
      maxX: capa.xCm + maxXRot,
      minY: capa.yCm + minYRot,
      maxY: capa.yCm + maxYRot,
      visualWidthCm,
      visualHeightCm,
      deltaXCm,
      deltaYCm,
      currentCenterX,
      currentCenterY
    };
  }

  /**
   * Alinea o centra la capa seleccionada con precisión matemática (< 0.5 mm de error).
   * tipo: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom' | 'center-zone'
   */
  alinearCapa(tipo, id = estado.datos.capaSeleccionadaId) {
    const capa = estado.capaSeleccionada;
    if (!capa || capa.locked) return;

    const superficie = estado.datos.superficieActiva;
    const ref = this.obtenerZonaReferenciaCm(superficie);
    const box = this.obtenerCajaVisualRealCm(capa);
    if (!box) return;

    let targetX = capa.xCm;
    let targetY = capa.yCm;

    switch (tipo) {
      case 'center-h':
        // Centrar horizontalmente respecto al eje del cuerpo o patrón (x = 0)
        targetX = ref.centerX - box.deltaXCm;
        break;
      case 'center-v':
        // Centrar verticalmente en la zona de estampado
        targetY = ref.centerY - box.deltaYCm;
        break;
      case 'center-zone':
        // Centrar en zona (eje central horizontal + centro vertical de la zona de impresión)
        targetX = ref.centerX - box.deltaXCm;
        targetY = ref.centerY - box.deltaYCm;
        break;
      case 'left':
        // Alinear borde izquierdo visual al límite izquierdo de la zona
        targetX = (ref.minX + box.visualWidthCm / 2) - box.deltaXCm;
        break;
      case 'right':
        // Alinear borde derecho visual al límite derecho de la zona
        targetX = (ref.maxX - box.visualWidthCm / 2) - box.deltaXCm;
        break;
      case 'top':
        // Alinear borde superior visual al límite superior de la zona
        targetY = (ref.minY + box.visualHeightCm / 2) - box.deltaYCm;
        break;
      case 'bottom':
        // Alinear borde inferior visual al límite inferior de la zona
        targetY = (ref.maxY - box.visualHeightCm / 2) - box.deltaYCm;
        break;
    }

    capa.xCm = parseFloat(targetX.toFixed(3));
    capa.yCm = parseFloat(targetY.toFixed(3));

    estado.actualizarCapa(capa.id, { xCm: capa.xCm, yCm: capa.yCm });

    // Con Espejo activo en mangas, actualizar automáticamente la otra manga
    const esManga = superficie === 'manga_izquierda' || superficie === 'manga_derecha';
    if (esManga && estado.poleraActiva.mangasEspejo) {
      gestorMangas.sincronizarEspejo(superficie);
    }

    estado.guardarSnapshotHistorial(`Alinear ${tipo} elemento`);
    estado.notificar('capa-alineada', capa);
  }

  /**
   * Mueve una capa usando las teclas de flecha del teclado (Nudge).
   */
  moverConTeclado(dxCm, dyCm) {
    const capa = estado.capaSeleccionada;
    if (!capa || capa.locked) return;

    capa.xCm = parseFloat((capa.xCm + dxCm).toFixed(2));
    capa.yCm = parseFloat((capa.yCm + dyCm).toFixed(2));

    estado.actualizarCapa(capa.id, { xCm: capa.xCm, yCm: capa.yCm }, false);
  }

  /**
   * Posiciona la barra flotante contextual y la barra de ajuste fino según la capa seleccionada.
   */
  actualizarBarraFlotante(floatingEl, mesa) {
    const fineTuneEl = document.getElementById('fineTuneBar');
    const capa = estado.capaSeleccionada;

    if (!capa || !capa.visible) {
      if (floatingEl) floatingEl.style.display = 'none';
      if (fineTuneEl) fineTuneEl.style.display = 'none';
      return;
    }

    if (floatingEl) {
      const { cx, cy } = mesa.mundoACanvas(capa.xCm, capa.yCm);
      const escala = mesa.pxPorCmBase * mesa.zoom;
      const hPx = capa.heightCm * escala;

      // Posicionar 45 px arriba de la manija de rotación
      const topPx = cy - hPx / 2 - 48;
      const leftPx = cx;

      floatingEl.style.display = 'flex';
      floatingEl.style.left = `${leftPx}px`;
      floatingEl.style.top = `${Math.max(56, topPx)}px`;
    }

    if (fineTuneEl) {
      fineTuneEl.style.display = 'flex';
      const sizeGroup = document.getElementById('fineTuneSizeGroup');
      const sizeDivider = document.getElementById('fineTuneSizeDivider');
      if (sizeGroup) sizeGroup.style.display = (capa.tipo === 'texto') ? 'none' : 'flex';
      if (sizeDivider) sizeDivider.style.display = (capa.tipo === 'texto') ? 'none' : 'block';
      const aspectBtn = document.getElementById('toggleAspectBtn');
      if (aspectBtn) {
        aspectBtn.textContent = (capa.lockAspect !== false) ? '🔒' : '🔓';
      }
    }
  }
}

export const gestorCapas = new GestorCapas();
