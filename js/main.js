/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Punto de Entrada Principal (Main)
 * ============================================================================
 * Orquesta todos los módulos ES6 nativos, ciclo de renderizado a 60 fps,
 * eventos de puntero (transformación interactiva 8-puntos + rotación) y atajos de teclado.
 */

import { estado } from './estado.js';
import { MesaDeTrabajo } from './mesa.js';
import { motorPoleraSVG } from './polera-svg.js';
import { gestorImagenes } from './imagenes.js';
import { gestorTexto } from './texto.js';
import { gestorCapas } from './capas.js';
import { gestorMangas } from './mangas.js';
import { motorEnvolvente } from './envolvente.js';
import { ControladorUI } from './ui.js';
import { tourGuiado } from './tour.js';

class AplicacionCADTextil {
  constructor() {
    this.canvas = document.getElementById('workbenchCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.mesa = new MesaDeTrabajo(this.canvas);
    this.ui = null;

    // Estado de interacción interactiva sobre capas
    this.operacionActiva = null; // null | 'mover' | 'rotar' | 'manija' | 'pan'
    this.capaInteraccion = null;
    this.manijaInteraccion = null;
    this.inicioPuntero = { x: 0, y: 0 };
    this.estadoInicialCapa = null;

    this.renderPendiente = false;
  }

  iniciar() {
    this.ajustarResolucionCanvas();
    this.ui = new ControladorUI(this.mesa);

    window.addEventListener('resize', () => {
      this.ajustarResolucionCanvas();
      this.solicitarRender();
    });

    this.enlazarEventosLienzo();
    this.enlazarAtajosTeclado();

    // Suscribir render a cambios de estado
    estado.suscribir(() => this.solicitarRender());

    // Ajustar prenda inicial al centro de la pantalla
    setTimeout(() => {
      this.mesa.ajustarAPantalla();
      this.solicitarRender();
      // Iniciar tour si es la primera visita
      tourGuiado.iniciar(false);
    }, 120);

    this.solicitarRender();
  }

  ajustarResolucionCanvas() {
    const contenedor = this.canvas.parentElement;
    if (!contenedor) return;

    const dpr = window.devicePixelRatio || 1;
    const w = contenedor.clientWidth;
    const h = contenedor.clientHeight;

    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  solicitarRender() {
    if (!this.renderPendiente) {
      this.renderPendiente = true;
      requestAnimationFrame(() => {
        this.renderPendiente = false;
        this.renderizar();
      });
    }
  }

  renderizar() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    // 1. Fondo de mesa y cuadrícula
    this.mesa.dibujarFondoYCuadricula();

    const superficie = estado.datos.superficieActiva;
    const polera = estado.poleraActiva;

    // 2. Dibujar prenda vectorial SVG en centímetros reales
    const modoManga = this.mesa.modoManga || 'prenda';
    motorPoleraSVG.dibujarPrendaEnCanvas(
      this.ctx,
      superficie,
      polera.color,
      polera.tallaVista,
      this.mesa,
      modoManga
    );

    // 3. Zona máxima de estampado recomendada
    this.mesa.dibujarZonaMaximaEstampado();

    // 4. Continuación lateral envolvente (si está activada)
    motorEnvolvente.dibujarContinuacionEnvolvente(this.ctx, superficie, this.mesa);

    // 5. Proyección visual de mangas sobre anverso/reverso
    gestorMangas.dibujarProyeccionEnTorso(this.ctx, superficie, this.mesa);

    // 6. Recorte o referencia a la silueta para los estampados de esta superficie
    this.ctx.save();
    const centroMundo = this.mesa.mundoACanvas(0, 0);
    const escala = this.mesa.pxPorCmBase * this.mesa.zoom;
    this.ctx.translate(centroMundo.cx, centroMundo.cy);
    this.ctx.scale(escala, escala);
    motorPoleraSVG.trazarContornoRecorte(this.ctx, superficie, polera.tallaVista, modoManga);
    this.ctx.restore();

    // Dibujar cada capa de esta superficie
    const capas = estado.capasSuperficieActiva;
    for (const c of capas) {
      if (!c.visible) continue;
      if (c.tipo === 'imagen') {
        gestorImagenes.dibujarCapa(this.ctx, c, this.mesa);
      } else if (c.tipo === 'texto') {
        gestorTexto.dibujarCapa(this.ctx, c, this.mesa);
      }
    }

    // 7. Manijas de selección sobre la capa activa
    const sel = estado.capaSeleccionada;
    if (sel && sel.visible) {
      gestorImagenes.dibujarManijasTransformacion(this.ctx, sel, this.mesa);
    }

    // 8. Guías magnéticas activas en rojo carmesí
    this.mesa.dibujarGuiasMagneticas();

    // 9. Cotas dimensionales de la prenda
    this.mesa.dibujarCotasPrenda();

    // 10. Reglas graduadas perimetrales
    this.mesa.dibujarReglas();

    // Actualizar posición de la barra flotante contextual
    const floatingEl = document.getElementById('floatingContextBar');
    gestorCapas.actualizarBarraFlotante(floatingEl, this.mesa);
  }

  // --- Manejo de Puntero (Mouse y Touch) ---

  enlazarEventosLienzo() {
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));

    // Doble toque / doble clic para editar texto directamente
    this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
  }

  obtenerCoordenadasCanvas(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  onPointerDown(e) {
    this.canvas.setPointerCapture(e.pointerId);
    const { x, y } = this.obtenerCoordenadasCanvas(e);

    // Si se pulsa botón secundario o central, o la barra espaciadora, iniciar desplazamiento (Pan)
    if (e.button === 1 || e.button === 2 || e.spaceKey) {
      this.operacionActiva = 'pan';
      this.mesa.iniciarPan(e.clientX, e.clientY);
      return;
    }

    const capas = estado.capasSuperficieActiva;
    let hit = null;

    // Primero comprobar la capa actualmente seleccionada (sus manijas tienen prioridad)
    const sel = estado.capaSeleccionada;
    if (sel) {
      hit = gestorImagenes.obtenerHitTest(x, y, sel, this.mesa);
    }

    // Si no hubo impacto en manijas de la seleccionada, evaluar todas las capas de arriba a abajo
    if (!hit) {
      for (let i = capas.length - 1; i >= 0; i--) {
        const c = capas[i];
        hit = gestorImagenes.obtenerHitTest(x, y, c, this.mesa);
        if (hit) {
          estado.seleccionarCapa(c.id);
          break;
        }
      }
    }

    if (hit) {
      const capa = hit.capa;
      this.capaInteraccion = capa;
      this.inicioPuntero = { x, y };
      this.estadoInicialCapa = {
        xCm: capa.xCm,
        yCm: capa.yCm,
        widthCm: capa.widthCm,
        heightCm: capa.heightCm,
        angleDeg: capa.angleDeg || 0
      };

      if (hit.tipo === 'rotar') {
        this.operacionActiva = 'rotar';
      } else if (hit.tipo === 'manija') {
        this.operacionActiva = 'manija';
        this.manijaInteraccion = hit.manijaId;
      } else if (hit.tipo === 'cuerpo' && !capa.locked) {
        this.operacionActiva = 'mover';
      }
    } else {
      // Clic en vacío: deseleccionar capa e iniciar arrastre de la mesa
      estado.seleccionarCapa(null);
      this.operacionActiva = 'pan';
      this.mesa.iniciarPan(e.clientX, e.clientY);
    }

    this.solicitarRender();
  }

  onPointerMove(e) {
    const { x, y } = this.obtenerCoordenadasCanvas(e);

    if (this.operacionActiva === 'pan') {
      this.mesa.moverPan(e.clientX, e.clientY);
      this.solicitarRender();
      return;
    }

    if (!this.operacionActiva || !this.capaInteraccion) {
      // Actualizar cursor según manijas bajo el cursor
      const sel = estado.capaSeleccionada;
      if (sel) {
        const hit = gestorImagenes.obtenerHitTest(x, y, sel, this.mesa);
        this.canvas.style.cursor = hit ? (hit.cursor || (hit.tipo === 'rotar' ? 'crosshair' : 'move')) : 'default';
      }
      return;
    }

    const capa = this.capaInteraccion;
    const inicial = this.estadoInicialCapa;
    const escala = this.mesa.pxPorCmBase * this.mesa.zoom;

    const dxPx = x - this.inicioPuntero.x;
    const dyPx = y - this.inicioPuntero.y;

    if (this.operacionActiva === 'mover') {
      const dxCm = dxPx / escala;
      const dyCm = dyPx / escala;

      const posXCm = inicial.xCm + dxCm;
      const posYCm = inicial.yCm + dyCm;

      // Evaluar atracción magnética
      const snap = this.mesa.evaluarImanes(posXCm, posYCm, capa.widthCm, capa.heightCm);
      capa.xCm = parseFloat(snap.xCm.toFixed(2));
      capa.yCm = parseFloat(snap.yCm.toFixed(2));

      estado.notificar('capa-movida', capa);
    } else if (this.operacionActiva === 'rotar') {
      const centro = this.mesa.mundoACanvas(inicial.xCm, inicial.yCm);
      const rad = Math.atan2(y - centro.cy, x - centro.cx) + Math.PI / 2;
      let deg = Math.round((rad * 180) / Math.PI);

      // Imán angular a múltiplos de 45°
      if (e.shiftKey || Math.abs(deg % 45) < 3.5) {
        deg = Math.round(deg / 45) * 45;
      }
      capa.angleDeg = deg;
      estado.notificar('capa-rotada', capa);
    } else if (this.operacionActiva === 'manija') {
      this.aplicarTransformacionManija(dxPx, dyPx, e.shiftKey);
    }

    this.solicitarRender();
  }

  aplicarTransformacionManija(dxPx, dyPx, shiftKey) {
    const capa = this.capaInteraccion;
    const inicial = this.estadoInicialCapa;
    const escala = this.mesa.pxPorCmBase * this.mesa.zoom;
    const id = this.manijaInteraccion;

    // Proyectar el desplazamiento según la rotación de la capa
    const rad = (-inicial.angleDeg * Math.PI) / 180;
    const localDxCm = (dxPx * Math.cos(rad) - dyPx * Math.sin(rad)) / escala;
    const localDyCm = (dxPx * Math.sin(rad) + dyPx * Math.cos(rad)) / escala;

    let deltaW = 0;
    let deltaH = 0;

    switch (id) {
      case 'mr': deltaW = localDxCm; break;
      case 'ml': deltaW = -localDxCm; break;
      case 'bm': deltaH = localDyCm; break;
      case 'tm': deltaH = -localDyCm; break;
      case 'br': deltaW = localDxCm; deltaH = localDyCm; break;
      case 'bl': deltaW = -localDxCm; deltaH = localDyCm; break;
      case 'tr': deltaW = localDxCm; deltaH = -localDyCm; break;
      case 'tl': deltaW = -localDxCm; deltaH = -localDyCm; break;
    }

    const aspectoOriginal = inicial.widthCm / (inicial.heightCm || 1);
    const bloquearAspecto = shiftKey ? !capa.lockAspect : capa.lockAspect;

    let nuevoW = Math.max(1.5, inicial.widthCm + deltaW);
    let nuevoH = Math.max(1.5, inicial.heightCm + deltaH);

    // En manijas de esquina, mantener proporción si está bloqueada
    if (['tl', 'tr', 'bl', 'br'].includes(id) && bloquearAspecto) {
      if (Math.abs(deltaW) > Math.abs(deltaH)) {
        nuevoH = nuevoW / aspectoOriginal;
      } else {
        nuevoW = nuevoH * aspectoOriginal;
      }
    }

    capa.widthCm = parseFloat(nuevoW.toFixed(2));
    capa.heightCm = parseFloat(nuevoH.toFixed(2));

    if (capa.tipo === 'texto') {
      // Ajustar tamaño tipográfico proporcional
      capa.tamanoPt = Math.round((nuevoH / inicial.heightCm) * (capa.tamanoPt || 36));
    }

    estado.notificar('capa-escalada', capa);
  }

  onPointerUp(e) {
    if (this.operacionActiva && this.operacionActiva !== 'pan') {
      estado.guardarSnapshotHistorial(`Modificar ${this.capaInteraccion?.nombre || 'elemento'}`);
    }

    this.operacionActiva = null;
    this.capaInteraccion = null;
    this.manijaInteraccion = null;
    this.mesa.finalizarPan();
    this.mesa.limpiarGuias();
    this.solicitarRender();
  }

  onDoubleClick(e) {
    const { x, y } = this.obtenerCoordenadasCanvas(e);
    const sel = estado.capaSeleccionada;

    if (sel && sel.tipo === 'texto') {
      const hit = gestorImagenes.obtenerHitTest(x, y, sel, this.mesa);
      if (hit) {
        // Enfocar el campo de texto en el panel
        if (this.ui) this.ui.abrirHoja('diseno');
        const input = document.getElementById('textInputContent');
        if (input) {
          input.focus();
          input.select();
        }
      }
    }
  }

  enlazarAtajosTeclado() {
    window.addEventListener('keydown', (e) => {
      // Si el foco está en un campo de texto o formulario, no interferir
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }

      // Deshacer / Rehacer
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) estado.rehacer();
        else estado.deshacer();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        estado.rehacer();
        return;
      }

      // Eliminar capa (Supr / Backspace)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (estado.datos.capaSeleccionadaId) {
          e.preventDefault();
          estado.eliminarCapa(estado.datos.capaSeleccionadaId);
        }
        return;
      }

      // Nudge con flechas del teclado
      const paso = e.shiftKey ? 1.0 : 0.1; // 1 cm con Shift, 1 mm sin Shift
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        gestorCapas.moverConTeclado(-paso, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        gestorCapas.moverConTeclado(paso, 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        gestorCapas.moverConTeclado(0, -paso);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        gestorCapas.moverConTeclado(0, paso);
      }
    });
  }
}

// Arranque al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  const app = new AplicacionCADTextil();
  app.iniciar();
});
