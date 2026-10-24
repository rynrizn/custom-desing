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

export class GestorCapas {
  constructor() {}

  /**
   * Alinea la capa seleccionada respecto a la prenda activa.
   * tipo: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom'
   */
  alinearCapa(tipo, id = estado.datos.capaSeleccionadaId) {
    const capa = estado.capaSeleccionada;
    if (!capa || capa.locked) return;

    const superficie = estado.datos.superficieActiva;
    const esManga = superficie === 'manga_izquierda' || superficie === 'manga_derecha';
    const { anchoCm, largoCm, altoCm } = motorPoleraSVG.obtenerEscalasTalla();

    const w = capa.widthCm || 10;
    const h = capa.heightCm || 10;

    if (esManga) {
      const altoTotal = altoCm || 19.0;
      switch (tipo) {
        case 'left':
          capa.xCm = -w / 2;
          break;
        case 'center-h':
          capa.xCm = 0;
          break;
        case 'right':
          capa.xCm = w / 2;
          break;
        case 'top':
          capa.yCm = 2.0 + h / 2;
          break;
        case 'center-v':
          capa.yCm = altoTotal / 2;
          break;
        case 'bottom':
          capa.yCm = altoTotal - h / 2 - 2.0;
          break;
      }
    } else {
      const semiAncho = (anchoCm || 53.0) / 2;
      const largoTotal = largoCm || 71.0;
      const esAnverso = superficie === 'anverso';
      const cuelloY = esAnverso ? 8.0 : 2.0;

      switch (tipo) {
        case 'left':
          capa.xCm = -semiAncho + w / 2 + 3.0; // 3 cm de margen de costura
          break;
        case 'center-h':
          capa.xCm = 0;
          break;
        case 'right':
          capa.xCm = semiAncho - w / 2 - 3.0;
          break;
        case 'top':
          capa.yCm = cuelloY + h / 2 + 2.0; // 2 cm bajo el cuello
          break;
        case 'center-v':
          capa.yCm = 32.0; // Altura anatómica ideal del pecho/espalda
          break;
        case 'bottom':
          capa.yCm = largoTotal - h / 2 - 4.0; // 4 cm sobre el ruedo
          break;
      }
    }

    estado.actualizarCapa(capa.id, { xCm: capa.xCm, yCm: capa.yCm });
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
      const aspectBtn = document.getElementById('toggleAspectBtn');
      if (aspectBtn) {
        aspectBtn.textContent = (capa.lockAspect !== false) ? '🔒' : '🔓';
      }
    }
  }
}

export const gestorCapas = new GestorCapas();
