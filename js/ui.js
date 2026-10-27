/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Controlador de Interfaz de Usuario (UI)
 * ============================================================================
 * Conecta los eventos del DOM, hojas deslizables en móvil, pestañas de escritorio,
 * paleta de colores, barra flotante, modal de ajustes y modal de exportación.
 */

import { CONFIG } from './config.js';
import { estado } from './estado.js';
import { UNIDADES } from './unidades.js';
import { motorPoleraSVG } from './polera-svg.js';
import { gestorImagenes } from './imagenes.js';
import { gestorTexto } from './texto.js';
import { gestorCapas } from './capas.js';
import { gestorMangas } from './mangas.js';
import { gestorPedido } from './pedido.js';
import { exportadorArchivos } from './exportar.js';
import { motorCifradoZRN } from './cifrado.js';
import { tourGuiado } from './tour.js';
import { gestorAlmacenamiento } from './almacenamiento.js';

export class ControladorUI {
  constructor(mesa, app = null) {
    this.mesa = mesa;
    this.app = app;
    this.hojaActiva = null; // 'prenda' | 'diseno' | 'capas' | 'pedido' | null
    this.sheetPosition = 'cerrada'; // 'cerrada' | 'media' | 'completa'
    this.inicializar();
  }

  inicializar() {
    this.renderizarSwatchesColores();
    this.actualizarSelectorPrendas();
    this.renderizarSelectFuentes();
    this.actualizarSelectPoleras();
    this.actualizarMatrizCantidades();
    this.actualizarListaCapas();
    this.actualizarHUDMedidas();
    this.sincronizarTema();

    this.enlazarEventosSuperficie();
    this.enlazarEventosPestanas();
    this.enlazarEventosPrenda();
    this.enlazarEventosDiseno();
    this.enlazarEventosPedido();
    this.enlazarEventosMesa();
    this.enlazarEventosModales();

    // Suscribir a cambios del estado
    estado.suscribir((tipo, detalle) => this.alCambiarEstado(tipo, detalle));

    // Exponer globalmente para Driver.js en móvil
    window.appUI = this;

    // Comprobar sesión previa guardada en IndexedDB
    setTimeout(async () => {
      try {
        const tienePrevia = await gestorAlmacenamiento.comprobarSesionPrevia();
        if (tienePrevia) {
          document.getElementById('restoreSessionModalBackdrop')?.classList.add('open');
        }
      } catch (err) {
        console.warn('Comprobación de sesión previa omitida:', err);
      }
    }, 150);
  }

  // --- Hojas Deslizables (Móvil) y Pestañas (Escritorio) ---

  setSheetPosition(posicion) {
    const panel = document.getElementById('controlsPanel');
    const grid = document.querySelector('.workspace-grid');
    if (!panel) return;

    this.sheetPosition = posicion;

    panel.classList.remove('sheet-pos-media', 'sheet-pos-completa', 'sheet-open');
    if (grid) grid.classList.remove('sheet-media-active');

    const expandBtn = document.getElementById('sheetExpandBtn');
    const expandIcon = document.getElementById('sheetExpandIcon');

    if (posicion === 'media') {
      panel.classList.add('sheet-open', 'sheet-pos-media');
      if (grid) grid.classList.add('sheet-media-active');
      if (expandBtn) expandBtn.title = 'Expandir a pantalla completa';
      if (expandIcon) expandIcon.textContent = '⤢';
    } else if (posicion === 'completa') {
      panel.classList.add('sheet-open', 'sheet-pos-completa');
      if (expandBtn) expandBtn.title = 'Reducir a vista media';
      if (expandIcon) expandIcon.textContent = '⤡';
    } else {
      // cerrada
      this.hojaActiva = null;
      document.querySelectorAll('.mobile-nav-item').forEach(b => b.classList.remove('active'));
    }

    // Al cambiar la altura del lienzo en móvil, reajustar resolución y centrado para que el elemento siga visible
    setTimeout(() => {
      if (this.app) {
        this.app.ajustarResolucionCanvas?.();
        this.mesa?.ajustarAPantalla?.();
        this.app.solicitarRender?.();
      }
    }, 60);
  }

  abrirHoja(nombreHoja, posForzada = null) {
    const panel = document.getElementById('controlsPanel');
    if (!panel) return;

    const esMovil = typeof window !== 'undefined' && window.innerWidth < 768;

    // Si ya está abierta la misma hoja en móvil: alternar de media a completa o cerrar
    if (esMovil && this.hojaActiva === nombreHoja && panel.classList.contains('sheet-open')) {
      if (this.sheetPosition === 'media') {
        this.setSheetPosition('completa');
        return;
      } else {
        this.cerrarTodasLasHojas();
        return;
      }
    }

    this.hojaActiva = nombreHoja;

    // Activar sección
    document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
    const targetSection = document.getElementById(`panelSection${this.capitalizar(nombreHoja)}`);
    if (targetSection) targetSection.classList.add('active');

    // Sincronizar botones de barra inferior móvil
    document.querySelectorAll('.mobile-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sheet === nombreHoja);
    });

    // Sincronizar pestañas escritorio
    document.querySelectorAll('.desktop-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === nombreHoja);
    });

    if (esMovil) {
      this.setSheetPosition(posForzada || 'media');
    } else {
      panel.classList.add('sheet-open');
    }
  }

  cerrarTodasLasHojas() {
    this.setSheetPosition('cerrada');
  }

  capitalizar(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // --- Renderizado de Componentes Iniciales ---

  renderizarSwatchesColores() {
    const container = document.getElementById('colorSwatchesContainer');
    if (!container) return;
    container.innerHTML = '';

    CONFIG.PALETA_COLORES.forEach((col, idx) => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = `color-swatch-item ${idx === 0 ? 'active' : ''}`;
      swatch.style.backgroundColor = col.hex;
      swatch.title = `${col.nombre} (${col.hex})`;
      swatch.setAttribute('aria-label', col.nombre);

      swatch.addEventListener('click', () => {
        estado.poleraActiva.color = col.hex;
        document.querySelectorAll('.color-swatch-item').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        document.getElementById('currentColorHexLabel').textContent = col.hex;
        document.getElementById('customColorPicker').value = col.hex;
        document.getElementById('sleeveColorPreview').style.backgroundColor = col.hex;
        document.getElementById('collarColorPreview').style.backgroundColor = col.hex;
        estado.guardarSnapshotHistorial(`Cambio de color a ${col.nombre}`);
        estado.notificar('cambio-color', col.hex);
      });

      container.appendChild(swatch);
    });
  }

  renderizarSelectFuentes() {
    const select = document.getElementById('textFontSelect');
    if (!select) return;
    select.innerHTML = '';

    CONFIG.TIPOGRAFIAS.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.nombre;
      opt.style.fontFamily = `"${f.id}", ${f.fallback}`;
      select.appendChild(opt);
    });
  }

  actualizarSelectPoleras() {
    const select = document.getElementById('poleraSelect');
    if (!select) return;
    select.innerHTML = '';

    estado.datos.poleras.forEach((p, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${idx + 1}. ${p.nombre} (${p.tallaVista})`;
      if (idx === estado.datos.poleraActivaIndex) opt.selected = true;
      select.appendChild(opt);
    });
  }

  actualizarSelectorPrendas() {
    const select = document.getElementById('garmentSelect');
    const staticBadge = document.getElementById('garmentStaticLabel');
    if (!select) return;
    const count = select.options.length;
    if (count <= 1) {
      select.style.display = 'none';
      if (staticBadge) {
        staticBadge.style.display = 'block';
        staticBadge.textContent = select.options[0]?.text || 'Polera';
      }
    } else {
      select.style.display = '';
      if (staticBadge) staticBadge.style.display = 'none';
    }
  }

  // --- Enlace de Eventos ---

  enlazarEventosSuperficie() {
    const pills = document.querySelectorAll('.surface-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        const sup = pill.dataset.surface;
        estado.setSuperficieActiva(sup);

        pills.forEach(p => {
          const act = p.dataset.surface === sup;
          p.classList.toggle('active', act);
          p.setAttribute('aria-selected', act ? 'true' : 'false');
        });

        document.getElementById('activeSurfaceLabelChip').textContent = sup.toUpperCase().replace('_', ' ');

        const esManga = sup === 'manga_izquierda' || sup === 'manga_derecha';
        const mangaBtn = document.getElementById('mangaModeBtn');
        if (mangaBtn) {
          mangaBtn.style.display = esManga ? 'inline-flex' : 'none';
        }
        if (esManga) {
          this.mesa.modoManga = 'plana';
          const span = mangaBtn?.querySelector('span');
          if (span) span.textContent = 'PATRÓN PLANO';
        }

        // Al cambiar de superficie, ajustar la mesa a la nueva pieza (zoom al ~75% para mangas)
        this.mesa.ajustarAPantalla();
        this.actualizarListaCapas();
        this.actualizarHUDMedidas();
      });
    });
  }

  enlazarEventosPestanas() {
    // Pestañas de escritorio
    document.querySelectorAll('.desktop-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.abrirHoja(btn.dataset.tab);
      });
    });

    // Pestañas móviles de barra inferior
    document.querySelectorAll('.mobile-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.abrirHoja(btn.dataset.sheet);
      });
    });

    // Controles de posición de la hoja deslizable (3 posiciones)
    document.getElementById('sheetExpandBtn')?.addEventListener('click', () => {
      if (this.sheetPosition === 'media') {
        this.setSheetPosition('completa');
      } else {
        this.setSheetPosition('media');
      }
    });

    document.getElementById('sheetCloseBtn')?.addEventListener('click', () => {
      this.cerrarTodasLasHojas();
    });

    // Gestos táctiles de arrastre sobre la barra de la hoja (#sheetHandleBar)
    const handleBar = document.getElementById('sheetHandleBar');
    if (handleBar) {
      let touchStartY = 0;
      let touchDistY = 0;

      handleBar.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length === 1) {
          touchStartY = e.touches[0].clientY;
          touchDistY = 0;
        }
      }, { passive: true });

      handleBar.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches.length === 1) {
          touchDistY = e.touches[0].clientY - touchStartY;
        }
      }, { passive: true });

      handleBar.addEventListener('touchend', () => {
        if (touchDistY > 35) {
          // Deslizar abajo
          if (this.sheetPosition === 'completa') {
            this.setSheetPosition('media');
          } else if (this.sheetPosition === 'media') {
            this.setSheetPosition('cerrada');
          }
        } else if (touchDistY < -35) {
          // Deslizar arriba
          if (this.sheetPosition === 'media') {
            this.setSheetPosition('completa');
          }
        }
      });
    }
  }

  enlazarEventosPrenda() {
    // Cambio de talla de maqueta
    const sizeSelect = document.getElementById('sizeSelect');
    if (sizeSelect) {
      sizeSelect.addEventListener('change', (e) => {
        estado.poleraActiva.tallaVista = e.target.value;
        const info = CONFIG.TALLAS_CUERPO[e.target.value];
        const infoManga = CONFIG.TALLAS_MANGAS[e.target.value];

        document.getElementById('specAncho').textContent = `${info.ancho.toFixed(1)} cm`;
        document.getElementById('specLargo').textContent = `${info.largo.toFixed(1)} cm`;
        document.getElementById('specBoca').textContent = `${infoManga.boca.toFixed(1)} cm`;

        const estBadge = document.getElementById('sizeEstBadge');
        estBadge.textContent = info.estimada ? '(ESTIMADA)' : '';

        estado.guardarSnapshotHistorial(`Cambio de talla a ${e.target.value}`);
        estado.notificar('cambio-talla');
      });
    }

    // Selector de polera
    const poleraSelect = document.getElementById('poleraSelect');
    if (poleraSelect) {
      poleraSelect.addEventListener('change', (e) => {
        estado.setPoleraActiva(parseInt(e.target.value, 10));
      });
    }

    // Botones Añadir y Duplicar Polera
    document.getElementById('addPoleraBtn')?.addEventListener('click', () => {
      estado.agregarPolera();
      this.mostrarNotificacion('¡Nueva polera agregada al pedido!');
    });

    document.getElementById('dupPoleraBtn')?.addEventListener('click', () => {
      estado.duplicarPolera(estado.datos.poleraActivaIndex);
      this.mostrarNotificacion('Polera duplicada.');
    });

    // Color libre
    document.getElementById('customColorPicker')?.addEventListener('input', (e) => {
      const hex = e.target.value;
      estado.poleraActiva.color = hex;
      document.getElementById('currentColorHexLabel').textContent = hex;
      document.getElementById('sleeveColorPreview').style.backgroundColor = hex;
      document.getElementById('collarColorPreview').style.backgroundColor = hex;
      estado.notificar('cambio-color', hex);
    });

    // Envolvente y Espejo
    document.getElementById('wrapAroundToggle')?.addEventListener('change', (e) => {
      estado.poleraActiva.envolvente = e.target.checked;
      estado.guardarSnapshotHistorial(`Envolvente ${e.target.checked ? 'activado' : 'desactivado'}`);
      estado.notificar('cambio-envolvente');
    });

    document.getElementById('mirrorSleevesToggle')?.addEventListener('change', (e) => {
      estado.poleraActiva.mangasEspejo = e.target.checked;
      gestorMangas.sincronizarEspejo(estado.datos.superficieActiva);
      estado.guardarSnapshotHistorial(`Espejo mangas ${e.target.checked ? 'activado' : 'desactivado'}`);
      estado.notificar('cambio-espejo');
    });

    document.getElementById('flipSleevesToggle')?.addEventListener('change', (e) => {
      estado.poleraActiva.mangasVoltear = e.target.checked;
      gestorMangas.sincronizarEspejo(estado.datos.superficieActiva);
      estado.guardarSnapshotHistorial(`Voltear en espejo ${e.target.checked ? 'activado' : 'desactivado'}`);
      estado.notificar('cambio-espejo');
    });
  }

  enlazarEventosDiseno() {
    const fileInput = document.getElementById('fileInput');
    const dropzone = document.getElementById('uploadDropzone');

    dropzone?.addEventListener('click', () => fileInput.click());

    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

    dropzone?.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files?.length) {
        await this.manejarSubidaArchivos(e.dataTransfer.files);
      }
    });

    fileInput?.addEventListener('change', async (e) => {
      if (e.target.files?.length) {
        await this.manejarSubidaArchivos(e.target.files);
        fileInput.value = '';
      }
    });

    // Añadir texto
    document.getElementById('addTextLayerBtn')?.addEventListener('click', () => {
      const capaTexto = gestorTexto.crearCapaTexto('CustomyTee', 'Poppins');
      estado.agregarCapa(capaTexto);
      this.mostrarNotificacion('Texto añadido a la polera.');
      this.sincronizarPanelPropiedades(capaTexto);
    });

    // Cargar Gráfico Demo
    document.getElementById('loadSampleGraphicBtn')?.addEventListener('click', () => {
      const capaDemo = gestorTexto.crearCapaTexto('CustomyTee', 'Anton');
      capaDemo.tamanoPt = 54;
      capaDemo.strokeColor = '#FAF9F6';
      capaDemo.strokeWidth = 2;
      gestorTexto.recalcularDimensionesCm(capaDemo);
      estado.agregarCapa(capaDemo);
      this.mostrarNotificacion('Gráfico demo añadido.');
    });

    // Controles de Texto en Panel
    const textContent = document.getElementById('textInputContent');
    textContent?.addEventListener('input', (e) => {
      const capa = estado.capaSeleccionada;
      if (capa && capa.tipo === 'texto') {
        capa.texto = e.target.value;
        gestorTexto.recalcularDimensionesCm(capa);
        estado.notificar('capa-modificada', capa);
      }
    });

    document.getElementById('textFontSelect')?.addEventListener('change', (e) => {
      const capa = estado.capaSeleccionada;
      if (capa && capa.tipo === 'texto') {
        capa.fuente = e.target.value;
        gestorTexto.recalcularDimensionesCm(capa);
        estado.guardarSnapshotHistorial(`Cambio tipografía a ${e.target.value}`);
        estado.notificar('capa-modificada', capa);
      }
    });

    document.getElementById('textColorPicker')?.addEventListener('input', (e) => {
      const capa = estado.capaSeleccionada;
      if (capa && capa.tipo === 'texto') {
        capa.color = e.target.value;
        estado.notificar('capa-modificada', capa);
      }
    });

    // Tamaño de letra (pt)
    document.getElementById('textPtInput')?.addEventListener('input', (e) => {
      const capa = estado.capaSeleccionada;
      if (capa && capa.tipo === 'texto') {
        const val = Math.max(6, Math.min(250, parseFloat(e.target.value) || 8));
        this.cambiarTamanoTexto(val);
      }
    });

    document.getElementById('textPtSelect')?.addEventListener('change', (e) => {
      const capa = estado.capaSeleccionada;
      if (capa && capa.tipo === 'texto') {
        const val = parseFloat(e.target.value);
        if (val) this.cambiarTamanoTexto(val);
      }
    });

    document.getElementById('textPtDecBtn')?.addEventListener('click', () => {
      const capa = estado.capaSeleccionada;
      if (capa && capa.tipo === 'texto') {
        const paso = (capa.tamanoPt || 36) <= 16 ? 1 : 2;
        this.cambiarTamanoTexto((capa.tamanoPt || 36) - paso);
      }
    });

    document.getElementById('textPtIncBtn')?.addEventListener('click', () => {
      const capa = estado.capaSeleccionada;
      if (capa && capa.tipo === 'texto') {
        const paso = (capa.tamanoPt || 36) < 16 ? 1 : 2;
        this.cambiarTamanoTexto((capa.tamanoPt || 36) + paso);
      }
    });

    document.getElementById('floatTextDecBtn')?.addEventListener('click', () => {
      const capa = estado.capaSeleccionada;
      if (capa && capa.tipo === 'texto') {
        const paso = (capa.tamanoPt || 36) <= 16 ? 1 : 2;
        this.cambiarTamanoTexto((capa.tamanoPt || 36) - paso);
      }
    });

    document.getElementById('floatTextIncBtn')?.addEventListener('click', () => {
      const capa = estado.capaSeleccionada;
      if (capa && capa.tipo === 'texto') {
        const paso = (capa.tamanoPt || 36) < 16 ? 1 : 2;
        this.cambiarTamanoTexto((capa.tamanoPt || 36) + paso);
      }
    });

    document.getElementById('textBoldBtn')?.addEventListener('click', () => {
      const capa = estado.capaSeleccionada;
      if (capa && capa.tipo === 'texto') {
        capa.bold = !capa.bold;
        gestorTexto.recalcularDimensionesCm(capa);
        estado.notificar('capa-modificada', capa);
      }
    });

    document.getElementById('textItalicBtn')?.addEventListener('click', () => {
      const capa = estado.capaSeleccionada;
      if (capa && capa.tipo === 'texto') {
        capa.italic = !capa.italic;
        gestorTexto.recalcularDimensionesCm(capa);
        estado.notificar('capa-modificada', capa);
      }
    });

    // Controles Dimensionales
    document.getElementById('inputWidthCm')?.addEventListener('input', (e) => {
      const capa = estado.capaSeleccionada;
      if (capa && !capa.locked) {
        const val = parseFloat(e.target.value);
        if (val > 0) {
          capa.widthCm = UNIDADES.deActivaACm(val);
          estado.notificar('capa-modificada', capa);
        }
      }
    });

    document.getElementById('inputHeightCm')?.addEventListener('input', (e) => {
      const capa = estado.capaSeleccionada;
      if (capa && !capa.locked) {
        const val = parseFloat(e.target.value);
        if (val > 0) {
          capa.heightCm = UNIDADES.deActivaACm(val);
          estado.notificar('capa-modificada', capa);
        }
      }
    });

    document.getElementById('inputAngleDeg')?.addEventListener('input', (e) => {
      const capa = estado.capaSeleccionada;
      if (capa && !capa.locked) {
        capa.angleDeg = parseInt(e.target.value, 10) || 0;
        estado.notificar('capa-modificada', capa);
      }
    });

    document.getElementById('inputOpacityRange')?.addEventListener('input', (e) => {
      const capa = estado.capaSeleccionada;
      if (capa) {
        capa.opacity = parseFloat(e.target.value);
        estado.notificar('capa-modificada', capa);
      }
    });
  }

  async manejarSubidaArchivos(fileList) {
    for (const file of Array.from(fileList)) {
      try {
        const capaImg = await gestorImagenes.procesarArchivo(file);
        estado.agregarCapa(capaImg);
        this.mostrarNotificacion(`Imagen "${file.name}" cargada.`);

        if (gestorImagenes.tieneCalidadBaja(capaImg)) {
          this.mostrarNotificacion('Aviso: Resolución baja (<150 DPI) para el tamaño elegido.');
        }
      } catch (err) {
        this.mostrarNotificacion(`Error: ${err.message}`);
      }
    }
  }

  enlazarEventosPedido() {
    // Añadir fila de talla/cantidad
    document.getElementById('addSizeRowBtn')?.addEventListener('click', () => {
      gestorPedido.agregarFilaTallaCantidad('M', 1);
    });

    // Inputs globales
    document.getElementById('whatsappInput')?.addEventListener('input', (e) => {
      estado.datos.clienteWhatsApp = e.target.value;
    });

    document.getElementById('notesTextarea')?.addEventListener('input', (e) => {
      estado.datos.indicaciones = e.target.value;
    });

    // Guardar Proyecto JSON
    document.getElementById('saveProjectBtn')?.addEventListener('click', () => {
      try {
        gestorAlmacenamiento.guardarProyectoJSON(estado);
        this.mostrarNotificacion('Proyecto guardado exitosamente.');
      } catch (err) {
        this.mostrarNotificacion(`Error al guardar: ${err.message}`);
      }
    });

    // Abrir Proyecto JSON
    const fileInput = document.getElementById('projectFileInput');
    document.getElementById('openProjectBtn')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', async (e) => {
      const archivo = e.target.files?.[0];
      if (archivo) {
        try {
          await gestorAlmacenamiento.abrirProyectoJSON(archivo, estado, this);
          this.mesa?.ajustarAPantalla?.();
          this.app?.solicitarRender?.();
        } catch (_) {
          // El aviso de error ya lo muestra abrirProyectoJSON
        } finally {
          fileInput.value = '';
        }
      }
    });

    // Botón Descargar Vista Previa ZIP
    document.getElementById('downloadPreviewZipBtn')?.addEventListener('click', async () => {
      try {
        this.mostrarNotificacion('Generando vista previa con marca de agua...');
        await exportadorArchivos.generarZipVistaPreviaCliente();
        this.mostrarNotificacion('¡Vista previa descargada con éxito!');
      } catch (err) {
        this.mostrarNotificacion(`Error: ${err.message}`);
      }
    });

    // Botón Enviar Pedido Cifrado (.ZRN)
    const btnZrn = document.getElementById('submitOrderZrnBtn');
    btnZrn?.addEventListener('click', async () => {
      this.abrirModalConfirmacionPedido();
    });

    document.getElementById('topExportBtn')?.addEventListener('click', () => {
      this.abrirModalConfirmacionPedido();
    });
  }

  enlazarEventosMesa() {
    // Botones de alineación
    document.querySelectorAll('[data-align]').forEach(btn => {
      btn.addEventListener('click', () => {
        gestorCapas.alinearCapa(btn.dataset.align);
      });
    });

    // Zoom
    document.getElementById('zoomInBtn')?.addEventListener('click', () => {
      this.mesa.zoom = Math.min(5.0, this.mesa.zoom * 1.2);
      estado.notificar('zoom', this.mesa.zoom);
    });

    document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
      this.mesa.zoom = Math.max(0.3, this.mesa.zoom / 1.2);
      estado.notificar('zoom', this.mesa.zoom);
    });

    document.getElementById('zoomResetBtn')?.addEventListener('click', () => {
      this.mesa.ajustarAPantalla();
      estado.notificar('zoom', this.mesa.zoom);
    });

    document.getElementById('fitScreenBtn')?.addEventListener('click', () => {
      this.mesa.ajustarAPantalla();
      estado.notificar('zoom', this.mesa.zoom);
    });

    // Herramienta Mano para mover la mesa
    const handBtn = document.getElementById('toolHandBtn');
    handBtn?.addEventListener('click', () => {
      if (this.app) {
        this.app.modoMano = !this.app.modoMano;
        handBtn.classList.toggle('active', this.app.modoMano);
        handBtn.setAttribute('aria-pressed', this.app.modoMano.toString());
        const viewport = document.getElementById('canvasViewport');
        if (viewport) viewport.classList.toggle('panning', this.app.modoMano);
      }
    });

    // Interruptor de Guías Magnéticas Inteligentes
    const snapBtn = document.getElementById('toggleSnapBtn');
    if (snapBtn) {
      snapBtn.classList.toggle('active', estado.datos.imanesGuias);
      snapBtn.addEventListener('click', () => {
        estado.datos.imanesGuias = !estado.datos.imanesGuias;
        snapBtn.classList.toggle('active', estado.datos.imanesGuias);
        snapBtn.setAttribute('aria-pressed', estado.datos.imanesGuias.toString());
        estado.notificar('cambio-imanes');
      });
    }

    // Rejilla y Cotas
    const gridBtn = document.getElementById('toggleGridBtn');
    gridBtn?.addEventListener('click', () => {
      estado.datos.mostrarCuadricula = !estado.datos.mostrarCuadricula;
      gridBtn.classList.toggle('active', estado.datos.mostrarCuadricula);
      estado.notificar('cambio-rejilla');
    });

    const cotasBtn = document.getElementById('toggleCotasBtn');
    cotasBtn?.addEventListener('click', () => {
      estado.datos.mostrarCotas = !estado.datos.mostrarCotas;
      cotasBtn.classList.toggle('active', estado.datos.mostrarCotas);
      estado.notificar('cambio-cotas');
    });

    // Controles de Barra de Ajuste Fino en Móvil / Táctil
    document.getElementById('nudgeLeftBtn')?.addEventListener('click', () => gestorCapas.moverConTeclado(-0.1, 0));
    document.getElementById('nudgeRightBtn')?.addEventListener('click', () => gestorCapas.moverConTeclado(0.1, 0));
    document.getElementById('nudgeUpBtn')?.addEventListener('click', () => gestorCapas.moverConTeclado(0, -0.1));
    document.getElementById('nudgeDownBtn')?.addEventListener('click', () => gestorCapas.moverConTeclado(0, 0.1));

    document.getElementById('scaleDownBtn')?.addEventListener('click', () => this.escalarCapaSeleccionada(0.95));
    document.getElementById('scaleUpBtn')?.addEventListener('click', () => this.escalarCapaSeleccionada(1.05));

    document.getElementById('toggleAspectBtn')?.addEventListener('click', (e) => {
      const sel = estado.capaSeleccionada;
      if (sel) {
        sel.lockAspect = !(sel.lockAspect !== false);
        e.currentTarget.textContent = sel.lockAspect ? '🔒' : '🔓';
        e.currentTarget.title = sel.lockAspect ? 'Proporción bloqueada (tocar para liberar)' : 'Proporción libre (tocar para bloquear)';
        estado.notificar('capa-modificada', sel);
      }
    });

    document.getElementById('rotMinus15Btn')?.addEventListener('click', () => this.rotarCapaSeleccionada(-15));
    document.getElementById('rotMinus1Btn')?.addEventListener('click', () => this.rotarCapaSeleccionada(-1));
    document.getElementById('rotPlus1Btn')?.addEventListener('click', () => this.rotarCapaSeleccionada(1));
    document.getElementById('rotPlus15Btn')?.addEventListener('click', () => this.rotarCapaSeleccionada(15));

    // Alternar modo de manga (Vista Polera / Patrón Plano)
    const mangaBtn = document.getElementById('mangaModeBtn');
    mangaBtn?.addEventListener('click', () => {
      this.mesa.modoManga = this.mesa.modoManga === 'plana' ? 'prenda' : 'plana';
      const span = mangaBtn.querySelector('span');
      if (span) {
        span.textContent = this.mesa.modoManga === 'plana' ? 'PATRÓN PLANO' : 'VISTA POLERA';
      }
      this.mesa.ajustarAPantalla();
      this.actualizarHUDMedidas();
      estado.notificar('modo-manga', this.mesa.modoManga);
    });

    // Botón para alternar a la otra manga con un toque
    document.getElementById('switchSleeveSideBtn')?.addEventListener('click', () => {
      const supActual = estado.datos.superficieActiva;
      const nuevaSup = supActual === 'manga_izquierda' ? 'manga_derecha' : 'manga_izquierda';
      this.mesa.modoManga = 'plana';
      estado.setSuperficieActiva(nuevaSup);
      this.mesa.ajustarAPantalla();
    });

    // Botón de alternancia rápida de Modo Espejo en la mesa
    const quickMirrorBtn = document.getElementById('quickMirrorBtn');
    quickMirrorBtn?.addEventListener('click', () => {
      estado.poleraActiva.mangasEspejo = !estado.poleraActiva.mangasEspejo;
      gestorMangas.sincronizarEspejo(estado.datos.superficieActiva);
      const mirrorToggle = document.getElementById('mirrorSleevesToggle');
      if (mirrorToggle) mirrorToggle.checked = estado.poleraActiva.mangasEspejo;
      if (quickMirrorBtn) {
        quickMirrorBtn.querySelector('span').textContent = estado.poleraActiva.mangasEspejo ? '🪞 ESPEJO: ON' : '🪞 ESPEJO: OFF';
        quickMirrorBtn.classList.toggle('active', estado.poleraActiva.mangasEspejo);
      }
      estado.guardarSnapshotHistorial(`Espejo mangas ${estado.poleraActiva.mangasEspejo ? 'activado' : 'desactivado'}`);
      estado.notificar('cambio-espejo');
    });

    // Botón para centrar en manga activa
    document.getElementById('sleevePresetCenterBtn')?.addEventListener('click', () => {
      gestorCapas.alinearCapa('center-zone');
    });

    // Deshacer y Rehacer
    document.getElementById('undoBtn')?.addEventListener('click', () => estado.deshacer());
    document.getElementById('redoBtn')?.addEventListener('click', () => estado.rehacer());

    // Barra Flotante Contextual
    document.getElementById('floatCenterBtn')?.addEventListener('click', () => {
      gestorCapas.alinearCapa('center-zone');
    });

    document.getElementById('floatDupBtn')?.addEventListener('click', () => {
      if (estado.datos.capaSeleccionadaId) {
        estado.duplicarCapa(estado.datos.capaSeleccionadaId);
      }
    });

    document.getElementById('floatLockBtn')?.addEventListener('click', () => {
      const capa = estado.capaSeleccionada;
      if (capa) {
        capa.locked = !capa.locked;
        estado.notificar('capa-modificada', capa);
      }
    });

    document.getElementById('floatDeleteBtn')?.addEventListener('click', () => {
      if (estado.datos.capaSeleccionadaId) {
        estado.eliminarCapa(estado.datos.capaSeleccionadaId);
        this.mostrarNotificacion('Elemento eliminado.');
      }
    });

    // Tour Guiado
    document.getElementById('startTourBtn')?.addEventListener('click', () => {
      tourGuiado.iniciar(true);
    });
  }

  enlazarEventosModales() {
    // Abrir Ajustes
    document.getElementById('openSettingsBtn')?.addEventListener('click', () => {
      document.getElementById('settingsModalBackdrop').classList.add('open');
    });

    // Cerrar Modales
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
      });
    });

    // Ajustes: Unidades
    document.getElementById('settingUnitsSelect')?.addEventListener('change', (e) => {
      estado.datos.unidades = e.target.value;
      this.actualizarHUDMedidas();
      document.querySelectorAll('.unit-label').forEach(el => el.textContent = e.target.value);
      estado.notificar('cambio-unidades', e.target.value);
    });

    // Ajustes: Fondo de mesa
    document.getElementById('settingDeskBgSelect')?.addEventListener('change', (e) => {
      estado.datos.fondoMesa = e.target.value;
      estado.notificar('cambio-fondo');
    });

    // Ajustes: Imanes
    document.getElementById('settingMagneticGuidesToggle')?.addEventListener('change', (e) => {
      estado.datos.imanesGuias = e.target.checked;
    });

    // Ajustes: Cotas
    document.getElementById('settingShowCotasToggle')?.addEventListener('change', (e) => {
      estado.datos.mostrarCotas = e.target.checked;
      document.getElementById('toggleCotasBtn')?.classList.toggle('active', e.target.checked);
      estado.notificar('cambio-cotas');
    });

    // Modal de Confirmación de Descarga Pedido
    document.getElementById('confirmDownloadBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('confirmDownloadBtn');
      const txt = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Cifrando pedido...';

      try {
        const codigo = gestorAlmacenamiento.generarCodigoPedido();
        const zipArrayBuffer = await exportadorArchivos.empaquetarZipTecnicoPedido(codigo);
        const zrnBlob = await motorCifradoZRN.cifrarPaqueteZRN(zipArrayBuffer);
        const metadata = gestorPedido.generarObjetoPedidoJSON(codigo);

        await motorCifradoZRN.enviarPedidoAZairenLab(zrnBlob, metadata, codigo);
        this.mostrarNotificacion(`¡Pedido cifrado generado con éxito! Código: ${codigo}`);
        document.getElementById('exportModalBackdrop').classList.remove('open');
      } catch (err) {
        this.mostrarNotificacion(`Error: ${err.message}`);
      } finally {
        btn.disabled = false;
        btn.textContent = txt;
      }
    });

    // Modal de Restauración de Sesión Previa (IndexedDB)
    document.getElementById('restoreSessionBtn')?.addEventListener('click', async () => {
      document.getElementById('restoreSessionModalBackdrop')?.classList.remove('open');
      const ok = await gestorAlmacenamiento.restaurarSesion(estado);
      if (ok) {
        this.mostrarNotificacion('Diseño anterior restaurado con éxito.');
        this.mesa?.ajustarAPantalla?.();
        this.app?.solicitarRender?.();
      }
    });

    document.getElementById('startFreshBtn')?.addEventListener('click', async () => {
      document.getElementById('restoreSessionModalBackdrop')?.classList.remove('open');
      await gestorAlmacenamiento.limpiarSesion();
      this.mostrarNotificacion('Nuevo diseño iniciado.');
    });

    document.getElementById('restoreModalCloseBtn')?.addEventListener('click', () => {
      document.getElementById('restoreSessionModalBackdrop')?.classList.remove('open');
    });

    // Tema
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
      const esOscuro = document.documentElement.getAttribute('data-theme') === 'dark';
      const nuevo = esOscuro ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nuevo);
      estado.datos.tema = nuevo;
      this.mostrarNotificacion(`Modo ${nuevo === 'dark' ? 'oscuro' : 'claro'} activado.`);
    });
  }

  sincronizarTema() {
    const esOscuro = estado.datos.tema === 'oscuro' || (estado.datos.tema === 'sistema' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)')?.matches);
    if (document.documentElement) {
      document.documentElement.setAttribute('data-theme', esOscuro ? 'dark' : 'light');
    }
  }

  abrirModalConfirmacionPedido() {
    const backdrop = document.getElementById('exportModalBackdrop');
    const notice = document.getElementById('exportModalNotice');
    const filesList = document.getElementById('exportFilesList');
    const confirmBtn = document.getElementById('confirmDownloadBtn');

    if (!backdrop) return;

    filesList.innerHTML = '';
    const pedido = gestorPedido.generarObjetoPedidoJSON();
    let hayDisenos = false;

    pedido.poleras.forEach(p => {
      if (p.superficiesConContenido.length > 0) hayDisenos = true;
      const li = document.createElement('li');
      li.innerHTML = `<strong>${p.nombre} (${p.tallaVista})</strong> <span>${p.superficiesConContenido.length} superficie(s) con arte</span>`;
      filesList.appendChild(li);
    });

    if (!hayDisenos) {
      notice.innerHTML = `<span style="color:var(--error); font-weight:600;">Aviso: Aún no has colocado ningún estampado en tus prendas. Sube un gráfico o texto para poder enviar el pedido.</span>`;
      confirmBtn.disabled = true;
    } else {
      notice.innerHTML = `<span>Se empaquetarán artes a 300 DPI, archivos originales sin pérdida y ficha técnica en el archivo protegido <strong>.zrn</strong>.</span>`;
      confirmBtn.disabled = false;
    }

    backdrop.classList.add('open');
  }

  // --- Sincronización de UI con Estado ---

  alCambiarEstado(tipo, detalle) {
    this.actualizarBotonesUndoRedo();
    this.actualizarHUDMedidas();
    this.actualizarListaCapas();
    this.actualizarMatrizCantidades();
    this.actualizarSelectPoleras();

    // Sincronizar pills de superficie y barra rápida de manga
    const sup = estado.datos.superficieActiva;
    document.querySelectorAll('.surface-pill').forEach(p => {
      const act = p.dataset.surface === sup;
      p.classList.toggle('active', act);
      p.setAttribute('aria-selected', act ? 'true' : 'false');
    });

    const chip = document.getElementById('activeSurfaceLabelChip');
    if (chip) chip.textContent = sup.toUpperCase().replace('_', ' ');

    const esManga = sup === 'manga_izquierda' || sup === 'manga_derecha';
    const mangaQuickBar = document.getElementById('mangaQuickBar');
    const mangaDivider = document.getElementById('mangaDivider');
    if (mangaQuickBar) mangaQuickBar.style.display = esManga ? 'inline-flex' : 'none';
    if (mangaDivider) mangaDivider.style.display = esManga ? 'block' : 'none';

    const switchLabel = document.getElementById('switchSleeveSideLabel');
    if (switchLabel) {
      switchLabel.textContent = sup === 'manga_izquierda' ? '👉 A MANGA DER' : '👈 A MANGA IZQ';
    }

    const quickMirrorBtn = document.getElementById('quickMirrorBtn');
    if (quickMirrorBtn) {
      quickMirrorBtn.classList.toggle('active', !!estado.poleraActiva.mangasEspejo);
      quickMirrorBtn.querySelector('span').textContent = estado.poleraActiva.mangasEspejo ? '🪞 ESPEJO: ON' : '🪞 ESPEJO: OFF';
    }

    // Sincronizar barra flotante
    const floatingEl = document.getElementById('floatingContextBar');
    gestorCapas.actualizarBarraFlotante(floatingEl, this.mesa);

    // Sincronizar propiedades de la capa activa
    this.sincronizarPanelPropiedades(estado.capaSeleccionada);
  }

  actualizarBotonesUndoRedo() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.disabled = !estado.puedeDeshacer;
    if (redoBtn) redoBtn.disabled = !estado.puedeRehacer;
  }

  actualizarHUDMedidas() {
    const capa = estado.capaSeleccionada;
    const hudSize = document.getElementById('hudSize');
    const hudNeck = document.getElementById('hudNeck');
    const hudBottom = document.getElementById('hudBottom');
    const hudSide = document.getElementById('hudSide');
    const zoomResetBtn = document.getElementById('zoomResetBtn');

    if (zoomResetBtn) {
      zoomResetBtn.textContent = `${Math.round(this.mesa.zoom * 100)}%`;
    }

    if (!capa) {
      if (hudSize) hudSize.textContent = '—';
      if (hudNeck) hudNeck.textContent = '—';
      if (hudBottom) hudBottom.textContent = '—';
      if (hudSide) hudSide.textContent = '—';
      document.querySelectorAll('[data-align]').forEach(b => b.disabled = true);
      return;
    }

    document.querySelectorAll('[data-align]').forEach(b => b.disabled = capa.locked);

    const unidad = estado.datos.unidades;
    if (hudSize) {
      hudSize.textContent = `${UNIDADES.formatear(capa.widthCm, unidad, 1)} × ${UNIDADES.formatear(capa.heightCm, unidad, 1)}`;
    }

    const { largoCm, anchoCm } = motorPoleraSVG.obtenerEscalasTalla();
    const cuelloY = estado.datos.superficieActiva === 'anverso' ? 8.0 : 2.0;

    const distCuello = Math.max(0, (capa.yCm - capa.heightCm / 2) - cuelloY);
    const distRuedo = Math.max(0, (largoCm || 71.0) - (capa.yCm + capa.heightCm / 2));
    const distLateral = Math.max(0, (anchoCm || 53.0) / 2 - (Math.abs(capa.xCm) + capa.widthCm / 2));

    if (hudNeck) hudNeck.textContent = UNIDADES.formatear(distCuello, unidad, 1);
    if (hudBottom) hudBottom.textContent = UNIDADES.formatear(distRuedo, unidad, 1);
    if (hudSide) hudSide.textContent = UNIDADES.formatear(distLateral, unidad, 1);
  }

  actualizarListaCapas() {
    const container = document.getElementById('layersListContainer');
    const countBadge = document.getElementById('layersCountBadge');
    if (!container) return;

    const capas = estado.capasSuperficieActiva;
    if (countBadge) countBadge.textContent = `${capas.length} CAPAS`;

    if (!capas.length) {
      container.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">🎨</div>
          <div class="empty-state-title">Superficie sin estampados</div>
          <p class="empty-state-desc">Añade imágenes o textos para personalizar esta zona de la polera.</p>
          <div class="empty-state-actions">
            <button type="button" class="btn-micro" id="emptyAddImageBtn">📁 Subir Imagen</button>
            <button type="button" class="btn-micro" id="emptyAddTextBtn">🔤 Añadir Texto</button>
          </div>
        </div>
      `;
      container.querySelector('#emptyAddImageBtn')?.addEventListener('click', () => {
        document.getElementById('fileInput')?.click();
      });
      container.querySelector('#emptyAddTextBtn')?.addEventListener('click', () => {
        document.getElementById('addTextBtn')?.click();
      });
      return;
    }

    container.innerHTML = '';
    // Mostrar capas de arriba a abajo (la superior primero)
    for (let i = capas.length - 1; i >= 0; i--) {
      const capa = capas[i];
      const item = document.createElement('div');
      item.className = `layer-item ${capa.id === estado.datos.capaSeleccionadaId ? 'active' : ''}`;

      item.innerHTML = `
        <div class="layer-info" role="button" tabindex="0">
          <span>${capa.tipo === 'texto' ? '🔤' : '🖼️'}</span>
          <span style="font-weight:600;">${capa.nombre}</span>
        </div>
        <div class="layer-actions">
          <button type="button" class="btn-micro" data-action="toggle-vis" title="Ocultar/Ver">${capa.visible ? '👁️' : '🚫'}</button>
          <button type="button" class="btn-micro" data-action="toggle-lock" title="Bloquear">${capa.locked ? '🔒' : '🔓'}</button>
          <button type="button" class="btn-micro btn-danger" data-action="delete" title="Eliminar">✕</button>
        </div>
      `;

      item.querySelector('.layer-info').addEventListener('click', () => {
        estado.seleccionarCapa(capa.id);
      });

      item.querySelector('[data-action="toggle-vis"]').addEventListener('click', (e) => {
        e.stopPropagation();
        capa.visible = !capa.visible;
        estado.notificar('capa-modificada', capa);
      });

      item.querySelector('[data-action="toggle-lock"]').addEventListener('click', (e) => {
        e.stopPropagation();
        capa.locked = !capa.locked;
        estado.notificar('capa-modificada', capa);
      });

      item.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
        e.stopPropagation();
        estado.eliminarCapa(capa.id);
        this.mostrarNotificacion('Elemento eliminado.');
      });

      container.appendChild(item);
    }
  }

  sincronizarPanelPropiedades(capa) {
    const box = document.getElementById('layerPropertiesBox');
    if (!box) return;

    if (!capa) {
      box.style.display = 'none';
      return;
    }

    box.style.display = 'block';
    const typeBadge = document.getElementById('layerTypeBadge');
    if (typeBadge) typeBadge.textContent = capa.tipo.toUpperCase();

    const textControls = document.getElementById('textControlsGroup');
    const dpiBanner = document.getElementById('dpiWarningBanner');

    if (capa.tipo === 'texto') {
      if (textControls) textControls.style.display = 'flex';
      if (dpiBanner) dpiBanner.style.display = 'none';

      const content = document.getElementById('textInputContent');
      if (content) content.value = capa.texto;
      const font = document.getElementById('textFontSelect');
      if (font) font.value = capa.fuente;
      const color = document.getElementById('textColorPicker');
      if (color) color.value = capa.color || '#0A0A0A';
      const pt = document.getElementById('textPtInput');
      if (pt && document.activeElement !== pt) pt.value = capa.tamanoPt || 36;
      const ptSelect = document.getElementById('textPtSelect');
      if (ptSelect) ptSelect.value = String(capa.tamanoPt || 36);
    } else {
      if (textControls) textControls.style.display = 'none';
      const esBaja = gestorImagenes.tieneCalidadBaja(capa);
      if (dpiBanner) {
        dpiBanner.style.display = esBaja ? 'block' : 'none';
        const dpiTxt = document.getElementById('dpiValueText');
        if (dpiTxt) dpiTxt.textContent = gestorImagenes.calcularDPI(capa);
      }
    }

    const inputW = document.getElementById('inputWidthCm');
    const inputH = document.getElementById('inputHeightCm');
    const inputAngle = document.getElementById('inputAngleDeg');
    const inputOpacity = document.getElementById('inputOpacityRange');

    if (capa.tipo === 'texto') {
      if (inputW) { inputW.disabled = true; inputW.title = 'El tamaño del texto se ajusta automáticamente según su contenido'; }
      if (inputH) { inputH.disabled = true; inputH.title = 'El tamaño del texto se ajusta automáticamente según su contenido'; }
    } else {
      if (inputW) { inputW.disabled = false; inputW.title = ''; }
      if (inputH) { inputH.disabled = false; inputH.title = ''; }
    }

    const unidad = estado.datos.unidades;
    if (inputW) inputW.value = UNIDADES.deCmAActiva(capa.widthCm, unidad).toFixed(1);
    if (inputH) inputH.value = UNIDADES.deCmAActiva(capa.heightCm, unidad).toFixed(1);
    if (inputAngle) inputAngle.value = capa.angleDeg || 0;
    if (inputOpacity) inputOpacity.value = capa.opacity !== undefined ? capa.opacity : 1;
  }

  actualizarMatrizCantidades() {
    const container = document.getElementById('quantitiesMatrixContainer');
    const totalEl = document.getElementById('totalGarmentsLabel');
    if (!container) return;

    const polera = estado.poleraActiva;
    if (!polera.cantidades) polera.cantidades = [{ talla: polera.tallaVista || 'M', cantidad: 1 }];

    container.innerHTML = '';
    let suma = 0;

    polera.cantidades.forEach((fila, idx) => {
      suma += (fila.cantidad || 0);
      const row = document.createElement('div');
      row.className = 'quantity-row';
      row.innerHTML = `
        <select class="select-input row-size-select" style="width:110px;">
          <option value="S" ${fila.talla === 'S' ? 'selected' : ''}>Talla S</option>
          <option value="M" ${fila.talla === 'M' ? 'selected' : ''}>Talla M</option>
          <option value="L" ${fila.talla === 'L' ? 'selected' : ''}>Talla L</option>
          <option value="XL" ${fila.talla === 'XL' ? 'selected' : ''}>Talla XL</option>
          <option value="XXL" ${fila.talla === 'XXL' ? 'selected' : ''}>Talla XXL</option>
        </select>
        <input type="number" class="ribbon-input row-qty-input" min="1" max="500" value="${fila.cantidad}" style="width:70px;">
        <span style="font-size:10px; font-family:var(--font-mono); color:var(--text-muted);">uds.</span>
        <button type="button" class="btn-micro btn-danger row-del-btn" title="Eliminar fila">✕</button>
      `;

      row.querySelector('.row-size-select').addEventListener('change', (e) => {
        fila.talla = e.target.value;
        estado.notificar('pedido-actualizado');
      });

      row.querySelector('.row-qty-input').addEventListener('input', (e) => {
        gestorPedido.actualizarCantidad(idx, e.target.value);
      });

      row.querySelector('.row-del-btn').addEventListener('click', () => {
        gestorPedido.eliminarFila(idx);
      });

      container.appendChild(row);
    });

    if (totalEl) totalEl.textContent = gestorPedido.calcularTotalPrendas();
  }

  cambiarTamanoTexto(nuevoPt) {
    const sel = estado.capaSeleccionada;
    if (sel && sel.tipo === 'texto' && !sel.locked) {
      const ptClamped = Math.max(6, Math.min(250, Math.round(nuevoPt)));
      sel.tamanoPt = ptClamped;
      gestorTexto.recalcularDimensionesCm(sel);

      const input = document.getElementById('textPtInput');
      if (input && document.activeElement !== input) input.value = ptClamped;
      const select = document.getElementById('textPtSelect');
      if (select) select.value = String(ptClamped);
      const floatLabel = document.getElementById('floatTextPtLabel');
      if (floatLabel) floatLabel.textContent = `${ptClamped}pt`;
      const fineTuneSize = document.getElementById('fineTuneSizeGroup');
      const tuneLabel = fineTuneSize?.querySelector('.tune-label');
      if (tuneLabel && sel.tipo === 'texto') tuneLabel.textContent = `${ptClamped}pt`;

      estado.notificar('capa-modificada', sel);
    }
  }

  escalarCapaSeleccionada(factor) {
    const sel = estado.capaSeleccionada;
    if (sel && !sel.locked) {
      if (sel.tipo === 'texto') {
        const paso = (sel.tamanoPt || 36) < 16 ? 1 : 2;
        const delta = factor > 1 ? paso : -paso;
        this.cambiarTamanoTexto((sel.tamanoPt || 36) + delta);
        estado.guardarSnapshotHistorial(`Tamaño texto ${sel.tamanoPt} pt`);
        return;
      }
      sel.widthCm = parseFloat(Math.max(1.5, Math.min(70.0, sel.widthCm * factor)).toFixed(2));
      sel.heightCm = parseFloat(Math.max(1.5, Math.min(70.0, sel.heightCm * factor)).toFixed(2));
      estado.notificar('capa-escalada', sel);
      estado.guardarSnapshotHistorial('Escalar tamaño elemento');
    }
  }

  rotarCapaSeleccionada(grados) {
    const sel = estado.capaSeleccionada;
    if (sel && !sel.locked) {
      sel.angleDeg = ((Math.round((sel.angleDeg || 0) + grados) % 360) + 360) % 360;
      estado.notificar('capa-rotada', sel);
      estado.guardarSnapshotHistorial(`Rotar ${grados}°`);
    }
  }

  mostrarNotificacion(mensaje, tipo = 'info') {
    const toast = document.getElementById('toastBanner');
    if (!toast) return;

    toast.textContent = mensaje;
    toast.className = `toast-banner visible ${tipo === 'error' ? 'toast-error' : tipo === 'warning' ? 'toast-warning' : 'toast-info'}`;
    clearTimeout(this.toastTimer);
    const duracion = tipo === 'error' ? 5200 : 3800;
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, duracion);
  }
}
