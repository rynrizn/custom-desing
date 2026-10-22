/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Mesa de Trabajo Interactiva y Viewport
 * ============================================================================
 * Administra el viewport 2D en centímetros reales, zoom centrado, desplazamiento (pan),
 * reglas graduadas arquitectónicas, cuadrícula dinámica, cotas y guías magnéticas inteligentes.
 */

import { estado } from './estado.js';
import { UNIDADES } from './unidades.js';
import { motorPoleraSVG } from './polera-svg.js';

export class MesaDeTrabajo {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    // Escala base: 1 cm real = N píxeles en pantalla a zoom 1.0
    // En pantallas de escritorio típicas (~96 DPI), 1 cm ≈ 37.8 px.
    // Usamos 28 px/cm como base calibrada para que una polera de 71 cm quepa holgadamente.
    this.pxPorCmBase = 28.0;

    // Viewport interactivo
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;

    // Estado de gestos
    this.isPanning = false;
    this.lastPointerPos = { x: 0, y: 0 };
    this.touchPointers = new Map();
    this.touchStartDistance = 0;

    // Guías magnéticas activas durante la manipulación
    this.guiasActivas = [];

    this.inicializarEventos();
  }

  // --- Transformaciones de Coordenadas ---

  /**
   * Convierte coordenadas en centímetros reales (Mundo) a píxeles de Canvas.
   */
  mundoACanvas(xCm, yCm) {
    const escala = this.pxPorCmBase * this.zoom;
    const centroX = this.canvas.width / 2.0 + this.panX;
    // Anclamos y=0 ligeramente arriba del centro para que la prenda se vea balanceada
    const centroY = this.canvas.height / 2.0 - (35.0 * escala / 2.0) + this.panY;

    return {
      cx: centroX + xCm * escala,
      cy: centroY + yCm * escala
    };
  }

  /**
   * Convierte píxeles de Canvas a centímetros reales (Mundo).
   */
  canvasAMundo(cx, cy) {
    const escala = this.pxPorCmBase * this.zoom;
    const centroX = this.canvas.width / 2.0 + this.panX;
    const centroY = this.canvas.height / 2.0 - (35.0 * escala / 2.0) + this.panY;

    return {
      xCm: (cx - centroX) / escala,
      yCm: (cy - centroY) / escala
    };
  }

  /**
   * Ajusta la vista para que la prenda activa quepa completamente en la pantalla con margen.
   */
  ajustarAPantalla() {
    const { anchoCm, largoCm, altoCm } = motorPoleraSVG.obtenerEscalasTalla();
    const altoPrenda = altoCm || largoCm || 71.0;
    const anchoPrenda = (anchoCm || 53.0) + 30.0; // margen lateral para mangas

    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || this.canvas.width;
    const h = rect.height || this.canvas.height;

    const zoomX = (w * 0.85) / (anchoPrenda * this.pxPorCmBase);
    const zoomY = (h * 0.85) / (altoPrenda * this.pxPorCmBase);

    this.zoom = Math.max(0.35, Math.min(2.5, Math.min(zoomX, zoomY)));
    this.panX = 0;
    this.panY = 0;

    estado.datos.zoom = this.zoom;
    estado.datos.panX = 0;
    estado.datos.panY = 0;
  }

  // --- Dibujo de Reglas, Cuadrícula y Guías ---

  dibujarFondoYCuadricula() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const fondo = estado.datos.fondoMesa;

    if (fondo === 'oscuro') {
      this.ctx.fillStyle = '#141518';
      this.ctx.fillRect(0, 0, w, h);
    } else if (fondo === 'claro') {
      this.ctx.fillStyle = '#FAF9F6';
      this.ctx.fillRect(0, 0, w, h);
    } else {
      // Damero formal técnico (cuadros)
      this.ctx.fillStyle = '#F4F4F6';
      this.ctx.fillRect(0, 0, w, h);

      const tamCuadro = 24;
      this.ctx.fillStyle = '#EAEAEF';
      for (let y = 0; y < h; y += tamCuadro * 2) {
        for (let x = 0; x < w; x += tamCuadro * 2) {
          this.ctx.fillRect(x, y, tamCuadro, tamCuadro);
          this.ctx.fillRect(x + tamCuadro, y + tamCuadro, tamCuadro, tamCuadro);
        }
      }
    }

    if (estado.datos.mostrarCuadricula) {
      this.dibujarCuadriculaCm();
    }
  }

  dibujarCuadriculaCm() {
    const escala = this.pxPorCmBase * this.zoom;
    const pMin = this.canvasAMundo(0, 0);
    const pMax = this.canvasAMundo(this.canvas.width, this.canvas.height);

    const xInicio = Math.floor(pMin.xCm / 5) * 5;
    const xFin = Math.ceil(pMax.xCm / 5) * 5;
    const yInicio = Math.floor(pMin.yCm / 5) * 5;
    const yFin = Math.ceil(pMax.yCm / 5) * 5;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    this.ctx.lineWidth = 1;

    // Líneas secundarias cada 1 cm
    for (let x = Math.floor(pMin.xCm); x <= Math.ceil(pMax.xCm); x++) {
      const { cx } = this.mundoACanvas(x, 0);
      this.ctx.beginPath();
      this.ctx.moveTo(cx, 0);
      this.ctx.lineTo(cx, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = Math.floor(pMin.yCm); y <= Math.ceil(pMax.yCm); y++) {
      const { cy } = this.mundoACanvas(0, y);
      this.ctx.beginPath();
      this.ctx.moveTo(0, cy);
      this.ctx.lineTo(this.canvas.width, cy);
      this.ctx.stroke();
    }

    // Líneas principales cada 5 cm
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
    for (let x = xInicio; x <= xFin; x += 5) {
      const { cx } = this.mundoACanvas(x, 0);
      this.ctx.beginPath();
      this.ctx.moveTo(cx, 0);
      this.ctx.lineTo(cx, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = yInicio; y <= yFin; y += 5) {
      const { cy } = this.mundoACanvas(0, y);
      this.ctx.beginPath();
      this.ctx.moveTo(0, cy);
      this.ctx.lineTo(this.canvas.width, cy);
      this.ctx.stroke();
    }

    // Eje central formal (x=0)
    const centro = this.mundoACanvas(0, 0);
    this.ctx.strokeStyle = 'rgba(186, 0, 44, 0.35)'; // Carmesí sutil
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(centro.cx, 0);
    this.ctx.lineTo(centro.cx, this.canvas.height);
    this.ctx.stroke();

    this.ctx.restore();
  }

  dibujarReglas() {
    const altoRegla = 22;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const unidad = estado.datos.unidades;

    this.ctx.save();
    // Barra de regla horizontal superior
    this.ctx.fillStyle = 'rgba(250, 249, 246, 0.92)';
    this.ctx.fillRect(altoRegla, 0, w - altoRegla, altoRegla);
    // Barra de regla vertical izquierda
    this.ctx.fillRect(0, altoRegla, altoRegla, h - altoRegla);

    // Esquina superior izquierda
    this.ctx.fillStyle = '#0A0A0A';
    this.ctx.fillRect(0, 0, altoRegla, altoRegla);
    this.ctx.fillStyle = '#FAF9F6';
    this.ctx.font = '10px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(unidad.toUpperCase(), altoRegla / 2, altoRegla / 2);

    // Trazos de división y números en la regla
    this.ctx.fillStyle = '#4A4A4A';
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    this.ctx.lineWidth = 1;
    this.ctx.font = '9px monospace';

    const pMin = this.canvasAMundo(altoRegla, altoRegla);
    const pMax = this.canvasAMundo(w, h);

    // Graduación horizontal
    const pasoCm = this.zoom < 0.6 ? 5 : (this.zoom > 1.8 ? 1 : 2);
    for (let x = Math.floor(pMin.xCm / pasoCm) * pasoCm; x <= Math.ceil(pMax.xCm); x += pasoCm) {
      const { cx } = this.mundoACanvas(x, 0);
      if (cx < altoRegla) continue;

      this.ctx.beginPath();
      this.ctx.moveTo(cx, altoRegla - 6);
      this.ctx.lineTo(cx, altoRegla);
      this.ctx.stroke();

      const val = UNIDADES.deCmAActiva(x, unidad);
      this.ctx.textAlign = 'center';
      this.ctx.fillText(Math.round(val).toString(), cx, 10);
    }

    // Graduación vertical
    for (let y = Math.floor(pMin.yCm / pasoCm) * pasoCm; y <= Math.ceil(pMax.yCm); y += pasoCm) {
      const { cy } = this.mundoACanvas(0, y);
      if (cy < altoRegla) continue;

      this.ctx.beginPath();
      this.ctx.moveTo(altoRegla - 6, cy);
      this.ctx.lineTo(altoRegla, cy);
      this.ctx.stroke();

      const val = UNIDADES.deCmAActiva(y, unidad);
      this.ctx.textAlign = 'right';
      this.ctx.fillText(Math.round(val).toString(), altoRegla - 8, cy + 3);
    }

    this.ctx.restore();
  }

  dibujarGuiasMagneticas() {
    if (!this.guiasActivas.length) return;

    this.ctx.save();
    this.ctx.strokeStyle = '#BA002C'; // Carmesí Zairen
    this.ctx.lineWidth = 1.2;
    this.ctx.setLineDash([4, 3]);

    for (const g of this.guiasActivas) {
      if (g.tipo === 'vertical') {
        const { cx } = this.mundoACanvas(g.xCm, 0);
        this.ctx.beginPath();
        this.ctx.moveTo(cx, 0);
        this.ctx.lineTo(cx, this.canvas.height);
        this.ctx.stroke();
      } else if (g.tipo === 'horizontal') {
        const { cy } = this.mundoACanvas(0, g.yCm);
        this.ctx.beginPath();
        this.ctx.moveTo(0, cy);
        this.ctx.lineTo(this.canvas.width, cy);
        this.ctx.stroke();
      }
    }

    this.ctx.restore();
  }

  dibujarZonaMaximaEstampado() {
    const zona = motorPoleraSVG.obtenerZonaMaximaImpresionCm();
    const { cx: x1, cy: y1 } = this.mundoACanvas(-zona.ancho / 2, 8.0);
    const { cx: x2, cy: y2 } = this.mundoACanvas(zona.ancho / 2, 8.0 + zona.alto);

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(58, 74, 92, 0.45)'; // Azul grafito sutil
    this.ctx.lineWidth = 1.0;
    this.ctx.setLineDash([5, 4]);
    this.ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

    // Etiqueta formal
    this.ctx.fillStyle = 'rgba(58, 74, 92, 0.65)';
    this.ctx.font = '10px monospace';
    this.ctx.fillText(`ÁREA IMPRESIÓN MÁX: ${zona.label}`, x1 + 6, y1 + 14);
    this.ctx.restore();
  }

  dibujarCotasPrenda() {
    if (!estado.datos.mostrarCotas) return;
    const { anchoCm, largoCm, altoCm } = motorPoleraSVG.obtenerEscalasTalla();
    const unidad = estado.datos.unidades;

    this.ctx.save();
    this.ctx.strokeStyle = '#4A4A4A';
    this.ctx.fillStyle = '#0A0A0A';
    this.ctx.lineWidth = 1;
    this.ctx.font = '11px monospace';

    if (altoCm) {
      // Manga plana
      const { cx: xA, cy: yA } = this.mundoACanvas(0, 0);
      const { cx: xB, cy: yB } = this.mundoACanvas(0, altoCm);
      this.dibujarLineaCota(xA + 60, yA, xA + 60, yB, `ALTO: ${UNIDADES.formatear(altoCm, unidad)}`);
    } else {
      // Cuerpo Ancho
      const { cx: xIzq, cy: yPecho } = this.mundoACanvas(-anchoCm / 2, 38.0);
      const { cx: xDer } = this.mundoACanvas(anchoCm / 2, 38.0);
      this.dibujarLineaCota(xIzq, yPecho, xDer, yPecho, `ANCHO: ${UNIDADES.formatear(anchoCm, unidad)}`);

      // Cuerpo Largo
      const { cx: xEje, cy: yHombro } = this.mundoACanvas(anchoCm / 2 + 6, 0);
      const { cy: yRuedo } = this.mundoACanvas(anchoCm / 2 + 6, largoCm);
      this.dibujarLineaCota(xEje, yHombro, xEje, yRuedo, `LARGO: ${UNIDADES.formatear(largoCm, unidad)}`);
    }

    this.ctx.restore();
  }

  dibujarLineaCota(x1, y1, x2, y2, texto) {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const padding = 4;

    this.ctx.save();
    this.ctx.fillStyle = '#FAF9F6';
    const textW = this.ctx.measureText(texto).width;
    this.ctx.fillRect(midX - textW / 2 - padding, midY - 7, textW + padding * 2, 14);
    this.ctx.strokeRect(midX - textW / 2 - padding, midY - 7, textW + padding * 2, 14);

    this.ctx.fillStyle = '#0A0A0A';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(texto, midX, midY);
    this.ctx.restore();
  }

  // --- Evaluación de Imanes y Guías Magnéticas Inteligentes ---

  /**
   * Evalúa la proximidad del elemento a las líneas guía de la prenda.
   * Aplica imán si la distancia es menor a un umbral de 0.8 cm.
   */
  evaluarImanes(xCm, yCm, anchoCm = 0, altoCm = 0) {
    this.guiasActivas = [];
    if (!estado.datos.imanesGuias) {
      return { xCm, yCm };
    }

    const umbral = 0.8; // Tolerancia de atracción magnética en cm
    let nuevoX = xCm;
    let nuevoY = yCm;

    const { anchoCm: anchoCuerpo, largoCm, altoCm: altoManga } = motorPoleraSVG.obtenerEscalasTalla();
    const superficie = estado.datos.superficieActiva;
    const esManga = superficie === 'manga_izquierda' || superficie === 'manga_derecha';

    // 1. Imanes Verticales (Eje X)
    // Eje central de la prenda (x = 0)
    if (Math.abs(xCm) < umbral) {
      nuevoX = 0;
      this.guiasActivas.push({ tipo: 'vertical', xCm: 0, label: 'Centro' });
    }

    if (!esManga) {
      // Costados del torso
      const semiAncho = anchoCuerpo / 2;
      const bordeIzq = xCm - anchoCm / 2;
      const bordeDer = xCm + anchoCm / 2;

      if (Math.abs(bordeIzq - (-semiAncho)) < umbral) {
        nuevoX = -semiAncho + anchoCm / 2;
        this.guiasActivas.push({ tipo: 'vertical', xCm: -semiAncho, label: 'Costado Izq' });
      } else if (Math.abs(bordeDer - semiAncho) < umbral) {
        nuevoX = semiAncho - anchoCm / 2;
        this.guiasActivas.push({ tipo: 'vertical', xCm: semiAncho, label: 'Costado Der' });
      }
    }

    // 2. Imanes Horizontales (Eje Y)
    if (esManga) {
      const altoTotal = altoManga || 19.0;
      // Mitad de la manga
      if (Math.abs(yCm - altoTotal / 2) < umbral) {
        nuevoY = altoTotal / 2;
        this.guiasActivas.push({ tipo: 'horizontal', yCm: altoTotal / 2, label: 'Centro Manga' });
      }
    } else {
      const largoTotal = largoCm || 71.0;
      const esAnverso = superficie === 'anverso';
      const cuelloY = esAnverso ? 8.0 : 2.0;

      // Base del cuello
      const bordeSuperior = yCm - altoCm / 2;
      if (Math.abs(bordeSuperior - cuelloY) < umbral) {
        nuevoY = cuelloY + altoCm / 2;
        this.guiasActivas.push({ tipo: 'horizontal', yCm: cuelloY, label: 'Base Cuello' });
      }

      // Centro vertical del torso (pecho/espalda útil entre sisa y ombligo ~ 32 cm)
      if (Math.abs(yCm - 32.0) < umbral) {
        nuevoY = 32.0;
        this.guiasActivas.push({ tipo: 'horizontal', yCm: 32.0, label: 'Centro Pecho' });
      }

      // Ruedo inferior
      const bordeInferior = yCm + altoCm / 2;
      if (Math.abs(bordeInferior - largoTotal) < umbral) {
        nuevoY = largoTotal - altoCm / 2;
        this.guiasActivas.push({ tipo: 'horizontal', yCm: largoTotal, label: 'Ruedo' });
      }
    }

    return { xCm: nuevoX, yCm: nuevoY };
  }

  limpiarGuias() {
    this.guiasActivas = [];
  }

  // --- Manejo de Eventos Pointer y Gestos ---

  inicializarEventos() {
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
  }

  onWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const puntoAntes = this.canvasAMundo(mouseX, mouseY);
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const nuevoZoom = Math.max(0.2, Math.min(6.0, this.zoom * factor));

    this.zoom = nuevoZoom;
    const puntoDespues = this.mundoACanvas(puntoAntes.xCm, puntoAntes.yCm);
    this.panX += (mouseX - puntoDespues.cx);
    this.panY += (mouseY - puntoDespues.cy);

    estado.datos.zoom = this.zoom;
    estado.notificar('zoom', this.zoom);
  }

  iniciarPan(clientX, clientY) {
    this.isPanning = true;
    this.lastPointerPos = { x: clientX, y: clientY };
  }

  moverPan(clientX, clientY) {
    if (!this.isPanning) return;
    const dx = clientX - this.lastPointerPos.x;
    const dy = clientY - this.lastPointerPos.y;
    this.panX += dx;
    this.panY += dy;
    this.lastPointerPos = { x: clientX, y: clientY };
    estado.datos.panX = this.panX;
    estado.datos.panY = this.panY;
    estado.notificar('pan');
  }

  finalizarPan() {
    this.isPanning = false;
  }
}
