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
import { gestorAlmacenamiento } from './almacenamiento.js';

class AplicacionCADTextil {
  constructor() {
    this.canvas = document.getElementById('workbenchCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.mesa = new MesaDeTrabajo(this.canvas);
    this.ui = null;

    // Estado de interacción interactiva sobre capas
    this.operacionActiva = null; // null | 'mover' | 'rotar' | 'manija' | 'pan' | 'vacio' | 'gesto-elemento' | 'gesto-mesa'
    this.capaInteraccion = null;
    this.manijaInteraccion = null;
    this.inicioPuntero = { x: 0, y: 0 };
    this.estadoInicialCapa = null;
    this.arrastreIniciado = false;

    // Gestor multitáctil con mapa de punteros activos
    this.punterosActivos = new Map();
    this.gestoElementoInicial = null;
    this.gestoMesaInicial = null;

    // Herramienta mano y detección de doble toque
    this.modoMano = false;
    this.espacioPresionado = false;
    this.ultimoTap = { tiempo: 0, x: 0, y: 0 };

    this.renderPendiente = false;
  }

  iniciar() {
    this.ajustarResolucionCanvas();
    this.ui = new ControladorUI(this.mesa, this);

    window.addEventListener('resize', () => {
      this.ajustarResolucionCanvas();
      this.solicitarRender();
    });

    this.enlazarEventosLienzo();
    this.enlazarAtajosTeclado();

    // Suscribir render y autoguardado a cambios de estado
    estado.suscribir((evento, payload) => {
      if (evento === 'cambio-superficie') {
        const esManga = payload === 'manga_izquierda' || payload === 'manga_derecha';
        if (esManga) {
          this.mesa.modoManga = 'plana';
          const mangaBtn = document.getElementById('mangaModeBtn');
          const span = mangaBtn?.querySelector('span');
          if (span) span.textContent = 'PATRÓN PLANO';
        }
        this.mesa.ajustarAPantalla();
      }
      this.solicitarRender();

      // Programar autoguardado con debounce de 800 ms (omitir eventos meramente de vista/navegación)
      if (!['zoom', 'pan', 'sesion-restaurada', 'cambio-superficie'].includes(evento)) {
        gestorAlmacenamiento.programarAutoguardado(estado, this.ui);
      }
    });

    // Verificar si se transfirió un proyecto desde el Lector de Taller (/lector)
    if (typeof window !== 'undefined' && window.location.search?.includes('importar')) {
      const exito = gestorAlmacenamiento.cargarProyectoImportadoTaller(estado, this.ui);
      if (exito) {
        this.ui.mostrarNotificacion('Proyecto transferido desde el Lector de Taller con éxito.');
        window.history?.replaceState({}, document.title, window.location.pathname);
      }
    }

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

    // 3. Zona máxima de estampado recomendada (solo en patrón plano o torso)
    const esManga = superficie === 'manga_izquierda' || superficie === 'manga_derecha';
    if (!esManga || modoManga === 'plana') {
      this.mesa.dibujarZonaMaximaEstampado();
    }

    // 4. Continuación lateral envolvente (si está activada en torso)
    if (!esManga) {
      motorEnvolvente.dibujarContinuacionEnvolvente(this.ctx, superficie, this.mesa);
    }

    // 5. Proyección visual de mangas sobre anverso/reverso o sobre vista polera
    if (!esManga) {
      gestorMangas.dibujarProyeccionEnTorso(this.ctx, superficie, this.mesa);
    } else if (modoManga === 'prenda') {
      // En modo 'prenda' para mangas, proyectar los diseños de ESTA manga sobre la polera
      const ladoVista = (superficie === 'manga_izquierda') ? 'der' : 'izq'; // en vista anverso
      const capasManga = estado.capasSuperficieActiva;
      gestorMangas.proyectarDisenosEnMangaPerspectiva(this.ctx, capasManga, ladoVista, true, this.mesa);
    }

    // 6. Recorte o referencia a la silueta para los estampados de esta superficie
    if (!esManga || modoManga === 'plana') {
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
    } else {
      // En vista polera de manga (solo lectura): NO se dibujan capas planas sobre el pecho ni manijas
      this.dibujarAvisoModoPrendaManga();
    }

    // 8. Guías magnéticas activas en rojo carmesí (solo en edición)
    if (!esManga || modoManga === 'plana') {
      this.mesa.dibujarGuiasMagneticas();
    }

    // 9. Cotas dimensionales de la prenda
    this.mesa.dibujarCotasPrenda();

    // 10. Reglas graduadas perimetrales
    this.mesa.dibujarReglas();

    // 11. Previsualización PiP en tiempo real de la polera para mangas
    gestorMangas.dibujarMiniaturaPolera(this.ctx, superficie, this.mesa);

    // Actualizar posición de la barra flotante contextual
    const floatingEl = document.getElementById('floatingContextBar');
    if (esManga && modoManga === 'prenda') {
      if (floatingEl) floatingEl.style.display = 'none';
      const fineTuneEl = document.getElementById('fineTuneBar');
      if (fineTuneEl) fineTuneEl.style.display = 'none';
    } else {
      gestorCapas.actualizarBarraFlotante(floatingEl, this.mesa);
    }
  }

  dibujarAvisoModoPrendaManga() {
    const w = this.mesa.anchoLogico;
    const badgeW = Math.min(420, w - 32);
    const badgeH = 34;
    const badgeX = (w - badgeW) / 2;
    const badgeY = 56;

    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowOffsetY = 2;

    this.ctx.fillStyle = 'rgba(20, 21, 24, 0.90)';
    this.ctx.beginPath();
    this.ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    this.ctx.fill();

    this.ctx.shadowColor = 'transparent';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.fillStyle = '#FAF9F6';
    this.ctx.font = '500 12px Inter, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Vista polera (solo lectura) — Toca para volver al patrón plano', badgeX + badgeW / 2, badgeY + badgeH / 2);
    this.ctx.restore();
  }

  // --- Manejo de Puntero (Mouse y Touch) ---

  enlazarEventosLienzo() {
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));

    // Bloquear gestos nativos de página en Safari iOS (pinch zoom de viewport web)
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((ev) => {
      window.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
    });

    // Bloquear zoom nativo del navegador con Ctrl+rueda o touchpad pinch
    window.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    }, { passive: false });

    // Doble toque / doble clic para editar texto directamente o ajustar pantalla
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
    const superficie = estado.datos.superficieActiva;
    const esManga = superficie === 'manga_izquierda' || superficie === 'manga_derecha';

    // Si está en vista polera de manga (solo lectura), al tocar vuelve inmediatamente al patrón plano
    if (esManga && this.mesa.modoManga === 'prenda') {
      this.mesa.modoManga = 'plana';
      const mangaBtn = document.getElementById('mangaModeBtn');
      const span = mangaBtn?.querySelector('span');
      if (span) span.textContent = 'PATRÓN PLANO';
      this.mesa.ajustarAPantalla();
      this.solicitarRender();
      return;
    }

    this.canvas.setPointerCapture(e.pointerId);
    const { x, y } = this.obtenerCoordenadasCanvas(e);

    this.punterosActivos.set(e.pointerId, {
      id: e.pointerId,
      x,
      y,
      startX: x,
      startY: y,
      clientX: e.clientX,
      clientY: e.clientY,
      startClientX: e.clientX,
      startClientY: e.clientY,
      tiempo: performance.now()
    });

    // 1. Caso Multitáctil (2 dedos): Gesto de zoom/pan de mesa o escalar/girar elemento
    if (this.punterosActivos.size === 2) {
      const punteros = Array.from(this.punterosActivos.values());
      const p1 = punteros[0];
      const p2 = punteros[1];

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

      const sel = estado.capaSeleccionada;
      // Comprobar si los dedos interactúan directamente sobre el elemento seleccionado
      const hit1 = sel ? gestorImagenes.obtenerHitTest(p1.startX, p1.startY, sel, this.mesa) : null;
      const hit2 = sel ? gestorImagenes.obtenerHitTest(p2.startX, p2.startY, sel, this.mesa) : null;

      if (sel && !sel.locked && (hit1 || hit2)) {
        this.operacionActiva = 'gesto-elemento';
        this.gestoElementoInicial = {
          dist,
          angle,
          capa: sel,
          widthCm: sel.widthCm,
          heightCm: sel.heightCm,
          angleDeg: sel.angleDeg || 0,
          tamanoPt: sel.tamanoPt || 36
        };
      } else {
        this.operacionActiva = 'gesto-mesa';
        this.gestoMesaInicial = {
          dist,
          midX,
          midY,
          zoomInicial: this.mesa.zoom,
          panXInicial: this.mesa.panX,
          panYInicial: this.mesa.panY,
          puntoMundo: this.mesa.canvasAMundo(midX, midY)
        };
      }
      this.solicitarRender();
      return;
    }

    if (this.punterosActivos.size > 2) {
      return;
    }

    // 2. Caso de 1 Dedo o Puntero Único

    // 0. Interacción con miniatura PiP de manga (alternar vista polera / patrón plano)
    if (gestorMangas.esHitEnMiniaturaPiP(x, y, this.mesa)) {
      this.mesa.modoManga = this.mesa.modoManga === 'plana' ? 'prenda' : 'plana';
      const mangaBtn = document.getElementById('mangaModeBtn');
      if (mangaBtn) {
        const span = mangaBtn.querySelector('span');
        if (span) span.textContent = this.mesa.modoManga === 'plana' ? 'PATRÓN PLANO' : 'VISTA POLERA';
      }
      this.mesa.ajustarAPantalla();
      this.solicitarRender();
      return;
    }

    // Modo Mano, botón central (1), botón derecho (2) o barra espaciadora -> Iniciar desplazamiento (Pan)
    if (this.modoMano || e.button === 1 || e.button === 2 || this.espacioPresionado) {
      this.operacionActiva = 'pan';
      this.mesa.iniciarPan(e.clientX, e.clientY);
      return;
    }

    const capas = estado.capasSuperficieActiva;
    let hit = null;

    // Primero comprobar la capa actualmente seleccionada (sus manijas tienen prioridad con 44 px hit target)
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

    // Si no se tocó ninguna capa, verificar clic directo sobre mangas en torso para saltar a editarlas
    const sup = estado.datos.superficieActiva;
    if (!hit && (sup === 'anverso' || sup === 'reverso')) {
      const pMundo = this.mesa.canvasAMundo(x, y);
      if (pMundo.yCm >= 4.0 && pMundo.yCm <= 42.0) {
        if (pMundo.xCm <= -26.0 && pMundo.xCm >= -48.0) {
          estado.setSuperficieActiva('manga_izquierda');
          return;
        } else if (pMundo.xCm >= 26.0 && pMundo.xCm <= 48.0) {
          estado.setSuperficieActiva('manga_derecha');
          return;
        }
      }
    }

    if (hit) {
      const capa = hit.capa;
      this.capaInteraccion = capa;
      this.inicioPuntero = { x, y };
      this.arrastreIniciado = false;
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
      // Toque en vacío: preparar deselección al soltar si no se arrastra, o iniciar pan si se mueve > 3 px
      this.operacionActiva = 'vacio';
      this.mesa.iniciarPan(e.clientX, e.clientY);
    }

    this.solicitarRender();
  }

  onPointerMove(e) {
    const { x, y } = this.obtenerCoordenadasCanvas(e);
    const p = this.punterosActivos.get(e.pointerId);
    if (p) {
      p.x = x;
      p.y = y;
      p.clientX = e.clientX;
      p.clientY = e.clientY;
    }

    // --- Caso 2 Dedos: Zoom y desplazamiento simultáneo o transformar elemento ---
    if (this.punterosActivos.size === 2) {
      const punteros = Array.from(this.punterosActivos.values());
      const p1 = punteros[0];
      const p2 = punteros[1];

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

      if (this.operacionActiva === 'gesto-elemento' && this.gestoElementoInicial) {
        const init = this.gestoElementoInicial;
        const factor = Math.max(0.1, dist / (init.dist || 1));
        const deltaRad = angle - init.angle;
        let deltaDeg = Math.round((deltaRad * 180) / Math.PI);

        const capa = init.capa;
        if (capa.tipo === 'texto') {
          // El texto solo rota y se mueve, no se escala ni estira
          capa.angleDeg = (init.angleDeg + deltaDeg) % 360;
        } else {
          const nuevoW = Math.max(1.5, Math.min(70.0, init.widthCm * factor));
          const nuevoH = Math.max(1.5, Math.min(70.0, init.heightCm * factor));
          capa.widthCm = parseFloat(nuevoW.toFixed(2));
          capa.heightCm = parseFloat(nuevoH.toFixed(2));
          capa.angleDeg = (init.angleDeg + deltaDeg) % 360;
        }
        estado.notificar('capa-escalada', capa);
      } else if (this.operacionActiva === 'gesto-mesa' && this.gestoMesaInicial) {
        const init = this.gestoMesaInicial;
        const factor = dist / (init.dist || 1);
        const nuevoZoom = Math.max(0.30, Math.min(8.00, init.zoomInicial * factor));

        this.mesa.zoom = nuevoZoom;
        const puntoCanvasDespues = this.mesa.mundoACanvas(init.puntoMundo.xCm, init.puntoMundo.yCm);
        this.mesa.panX += (midX - puntoCanvasDespues.cx);
        this.mesa.panY += (midY - puntoCanvasDespues.cy);

        estado.datos.zoom = this.mesa.zoom;
        estado.datos.panX = this.mesa.panX;
        estado.datos.panY = this.mesa.panY;
        estado.notificar('zoom', this.mesa.zoom);
        estado.notificar('pan');
      }

      this.solicitarRender();
      return;
    }

    // --- Caso 1 Dedo o Ratón ---
    if (this.operacionActiva === 'vacio') {
      const dist = p ? Math.hypot(x - p.startX, y - p.startY) : 0;
      if (dist >= 3.0) {
        // Superó el umbral de 3 px: pasar a pan de mesa
        this.operacionActiva = 'pan';
        this.mesa.moverPan(e.clientX, e.clientY);
        this.solicitarRender();
      }
      return;
    }

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
      // Umbral de 3 px para evitar micro-temblores en dispositivos táctiles
      if (!this.arrastreIniciado && Math.hypot(dxPx, dyPx) < 3.0) {
        return;
      }
      this.arrastreIniciado = true;

      const dxCm = dxPx / escala;
      const dyCm = dyPx / escala;

      const posXCm = inicial.xCm + dxCm;
      const posYCm = inicial.yCm + dyCm;

      // Evaluar atracción magnética con distancias en vivo
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
    if (!capa || capa.tipo === 'texto') return; // El texto no se transforma con manijas
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
    const esEsquina = ['tl', 'tr', 'bl', 'br'].includes(id);

    // En esquinas la escala es proporcional por defecto; Shift (o interruptor móvil) la alterna
    const mantenerProporcion = shiftKey ? !capa.lockAspect : (capa.lockAspect !== false);

    let nuevoW = Math.max(1.5, inicial.widthCm + deltaW);
    let nuevoH = Math.max(1.5, inicial.heightCm + deltaH);

    if (esEsquina && mantenerProporcion) {
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
      capa.tamanoPt = Math.max(8, Math.round((nuevoH / inicial.heightCm) * (capa.tamanoPt || 36)));
    }

    estado.notificar('capa-escalada', capa);
  }

  onPointerUp(e) {
    const { x, y } = this.obtenerCoordenadasCanvas(e);
    const p = this.punterosActivos.get(e.pointerId);
    const ahora = performance.now();

    if (this.canvas.hasPointerCapture && this.canvas.hasPointerCapture(e.pointerId)) {
      this.canvas.releasePointerCapture(e.pointerId);
    }

    // Si fue toque en vacío (< 3 px): deseleccionar y verificar doble toque
    if (this.operacionActiva === 'vacio' && p) {
      const dist = Math.hypot(x - p.startX, y - p.startY);
      if (dist < 3.0) {
        estado.seleccionarCapa(null);

        // Doble toque en vacío: ajustar a pantalla
        if (ahora - this.ultimoTap.tiempo < 350 && Math.hypot(x - this.ultimoTap.x, y - this.ultimoTap.y) < 20) {
          this.mesa.ajustarAPantalla();
          this.ultimoTap = { tiempo: 0, x: 0, y: 0 };
        } else {
          this.ultimoTap = { tiempo: ahora, x, y };
        }
      }
    } else if (this.operacionActiva === 'mover' && !this.arrastreIniciado && p) {
      // Toque sin arrastrar sobre elemento: registrar para posible doble toque
      const sel = estado.capaSeleccionada;
      if (sel && sel.tipo === 'texto') {
        if (ahora - this.ultimoTap.tiempo < 350 && Math.hypot(x - this.ultimoTap.x, y - this.ultimoTap.y) < 20) {
          this.abrirEditorTextoDirecto();
          this.ultimoTap = { tiempo: 0, x: 0, y: 0 };
        } else {
          this.ultimoTap = { tiempo: ahora, x, y };
        }
      }
    }

    if (this.operacionActiva && !['pan', 'vacio', 'gesto-mesa'].includes(this.operacionActiva)) {
      estado.guardarSnapshotHistorial(`Modificar ${this.capaInteraccion?.nombre || 'elemento'}`);
    }

    this.punterosActivos.delete(e.pointerId);

    if (this.punterosActivos.size === 0) {
      this.operacionActiva = null;
      this.capaInteraccion = null;
      this.manijaInteraccion = null;
      this.gestoElementoInicial = null;
      this.gestoMesaInicial = null;
      this.arrastreIniciado = false;
      this.mesa.finalizarPan();
      this.mesa.limpiarGuias();
    } else if (this.punterosActivos.size === 1) {
      this.operacionActiva = null;
      this.gestoElementoInicial = null;
      this.gestoMesaInicial = null;
    }

    this.solicitarRender();
  }

  onDoubleClick(e) {
    const { x, y } = this.obtenerCoordenadasCanvas(e);
    const sel = estado.capaSeleccionada;

    if (sel && sel.tipo === 'texto') {
      const hit = gestorImagenes.obtenerHitTest(x, y, sel, this.mesa);
      if (hit) {
        this.abrirEditorTextoDirecto();
        return;
      }
    }

    // Doble clic en vacío: ajustar a pantalla
    this.mesa.ajustarAPantalla();
    this.solicitarRender();
  }

  abrirEditorTextoDirecto() {
    if (this.ui) this.ui.abrirHoja('diseno');
    const input = document.getElementById('textInputContent');
    if (input) {
      input.focus();
      input.select();
    }
  }

  enlazarAtajosTeclado() {
    window.addEventListener('keydown', (e) => {
      // Si el foco está en un campo de texto o formulario, no interferir
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }

      // Deshacer / Rehacer (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
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

      // Copiar elemento (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (estado.datos.capaSeleccionadaId) {
          e.preventDefault();
          estado.copiarCapa(estado.datos.capaSeleccionadaId);
          this.ui?.mostrarNotificacion?.('Elemento copiado al portapapeles');
        }
        return;
      }

      // Cortar elemento (Ctrl+X / Cmd+X)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        if (estado.datos.capaSeleccionadaId) {
          e.preventDefault();
          estado.cortarCapa(estado.datos.capaSeleccionadaId);
          this.ui?.mostrarNotificacion?.('Elemento cortado al portapapeles');
        }
        return;
      }

      // Pegar elemento (Ctrl+V / Cmd+V)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (estado.portapapeles && estado.portapapeles.capa) {
          e.preventDefault();
          const pegada = estado.pegarCapa();
          if (pegada) {
            const nomSup = estado.datos.superficieActiva.replace('_', ' ');
            this.ui?.mostrarNotificacion?.(`Elemento pegado en ${nomSup}`);
          }
        }
        return;
      }

      // Duplicar elemento (Ctrl+D / Cmd+D)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (estado.datos.capaSeleccionadaId) {
          gestorCapas.duplicarCapa(estado.datos.capaSeleccionadaId);
        }
        return;
      }

      // Deseleccionar (Esc)
      if (e.key === 'Escape') {
        e.preventDefault();
        estado.seleccionarCapa(null);
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

      // Nudge con flechas del teclado: 1 mm (0.1 cm); Shift = 10 mm (1.0 cm)
      const paso = e.shiftKey ? 1.0 : 0.1;
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

    // Barra espaciadora para mover la mesa temporalmente
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        this.espacioPresionado = true;
        const viewport = document.getElementById('canvasViewport');
        if (viewport) viewport.classList.add('panning');
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.espacioPresionado = false;
        const viewport = document.getElementById('canvasViewport');
        if (viewport) viewport.classList.remove('panning');
      }
    });
  }
}

// Arranque al cargar el DOM
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new AplicacionCADTextil();
    app.iniciar();
  });
}
