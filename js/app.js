/**
 * ============================================================================
 * ZAIREN — Diseñador de Poleras Textil
 * Motor interactivo en DOM (HTML) con imágenes reales de la prenda
 * ============================================================================
 */

// 1. CONFIGURACIÓN DE TALLAS Y MEDIDAS (Centímetros)
const CONFIG_TALLAS = {
  S:   { ancho: 50, largo: 69, manga: 14, estimada: true },
  M:   { ancho: 53, largo: 71, manga: 15, estimada: false },
  L:   { ancho: 54, largo: 72, manga: 17, estimada: false },
  XL:  { ancho: 57, largo: 74, manga: 18, estimada: true },
  XXL: { ancho: 60, largo: 76, manga: 19, estimada: true }
};

// Paleta de colores predefinidos
const PALETA_COLORES = [
  { nombre: 'Blanco Puro', hex: '#FFFFFF' },
  { nombre: 'Negro Zenith', hex: '#141416' },
  { nombre: 'Gris Vapor', hex: '#E2E2E4' },
  { nombre: 'Gris Carbón', hex: '#47474A' },
  { nombre: 'Carmesí Zairen', hex: '#BA002C' },
  { nombre: 'Verde Cromo', hex: '#2E4D32' },
  { nombre: 'Azul Marino', hex: '#1B2A4A' },
  { nombre: 'Arena Crudo', hex: '#E8DFD1' }
];

// 2. ESTADO GLOBAL DE LA APLICACIÓN
const state = {
  talla: 'M',
  colorCuerpo: '#FFFFFF',
  ladoActivo: 'anverso', // 'anverso' | 'reverso'
  bloquearProporcion: true,
  mostrarCuadricula: false,
  mostrarCotas: false,
  zoom: 1,

  // Diseños independientes por cada lado
  disenos: {
    anverso: null,
    reverso: null
  },

  // Historial para Deshacer / Rehacer
  historial: [],
  indiceHistorial: -1
};

// 3. REFERENCIAS AL DOM
const dom = {};

function inicializarReferenciasDOM() {
  dom.stageViewport = document.getElementById('stageViewport');
  dom.tshirtStage = document.getElementById('tshirtStage');
  dom.tshirtColorLayer = document.getElementById('tshirtColorLayer');
  dom.tshirtDisplayImg = document.getElementById('tshirtDisplayImg');
  dom.designWorkspaceArea = document.getElementById('designWorkspaceArea');
  dom.designWrapper = document.getElementById('designWrapper');
  dom.designDisplayImg = document.getElementById('designDisplayImg');
  dom.designGizmo = document.getElementById('designGizmo');
  dom.gridOverlay = document.getElementById('gridOverlay');
  dom.cotaWidth = document.getElementById('cotaWidth');
  dom.cotaWidthLabel = document.getElementById('cotaWidthLabel');
  dom.cotaHeight = document.getElementById('cotaHeight');
  dom.cotaHeightLabel = document.getElementById('cotaHeightLabel');

  dom.tabAnverso = document.getElementById('tabAnverso');
  dom.tabReverso = document.getElementById('tabReverso');
  dom.dotAnverso = document.getElementById('dotAnverso');
  dom.dotReverso = document.getElementById('dotReverso');
  dom.activeSideLabelText = document.getElementById('activeSideLabelText');

  dom.sizeSelect = document.getElementById('sizeSelect');
  dom.sizeEstBadge = document.getElementById('sizeEstBadge');
  dom.sizeDimensionsInfo = document.getElementById('sizeDimensionsInfo');

  dom.colorSwatchesContainer = document.getElementById('colorSwatchesContainer');
  dom.customColorPicker = document.getElementById('customColorPicker');
  dom.currentColorHexLabel = document.getElementById('currentColorHexLabel');
  dom.sleeveColorPreview = document.getElementById('sleeveColorPreview');
  dom.collarColorPreview = document.getElementById('collarColorPreview');

  dom.inputWidthCm = document.getElementById('inputWidthCm');
  dom.inputAngleDeg = document.getElementById('inputAngleDeg');
  dom.lockAspectBtn = document.getElementById('lockAspectBtn');
  dom.resetAngleBtn = document.getElementById('resetAngleBtn');
  dom.centerDesignBtn = document.getElementById('centerDesignBtn');
  dom.deleteDesignBtn = document.getElementById('deleteDesignBtn');

  dom.undoBtn = document.getElementById('undoBtn');
  dom.redoBtn = document.getElementById('redoBtn');
  dom.toggleGridBtn = document.getElementById('toggleGridBtn');
  dom.toggleCotasBtn = document.getElementById('toggleCotasBtn');

  dom.zoomInBtn = document.getElementById('zoomInBtn');
  dom.zoomOutBtn = document.getElementById('zoomOutBtn');
  dom.zoomResetBtn = document.getElementById('zoomResetBtn');

  dom.hudSizeCm = document.getElementById('hudSizeCm');
  dom.hudNeckCm = document.getElementById('hudNeckCm');
  dom.hudBottomCm = document.getElementById('hudBottomCm');
  dom.hudLeftCm = document.getElementById('hudLeftCm');
  dom.hudRightCm = document.getElementById('hudRightCm');

  dom.fileInput = document.getElementById('fileInput');
  dom.uploadDropzone = document.getElementById('uploadDropzone');
  dom.loadSampleGraphicBtn = document.getElementById('loadSampleGraphicBtn');

  dom.exportModalBackdrop = document.getElementById('exportModalBackdrop');
  dom.exportFilesList = document.getElementById('exportFilesList');
  dom.exportModalNotice = document.getElementById('exportModalNotice');
  dom.openExportModalBtn = document.getElementById('openExportModalBtn');
  dom.openExportModalBtnTop = document.getElementById('openExportModalBtnTop');
  dom.closeExportModalBtn = document.getElementById('closeExportModalBtn');
  dom.cancelExportBtn = document.getElementById('cancelExportBtn');
  dom.confirmDownloadZipBtn = document.getElementById('confirmDownloadZipBtn');
  dom.themeToggleBtn = document.getElementById('themeToggleBtn');
}

// 4. ACTUALIZACIÓN VISUAL DE LA MESA Y DE LA PRENDA EN EL HTML
function actualizarVistaPolera() {
  const lado = state.ladoActivo;
  const imgPath = `img/polera-${lado}.png`;

  // 1. Imagen de la polera en el HTML
  if (dom.tshirtDisplayImg) {
    if (!dom.tshirtDisplayImg.src.includes(imgPath)) {
      dom.tshirtDisplayImg.src = imgPath;
    }
  }

  // 2. Tinte de color sobre la polera (color layer con mix-blend-mode:multiply)
  if (dom.tshirtColorLayer) {
    dom.tshirtColorLayer.style.backgroundColor = state.colorCuerpo;
  }

  // 3. Zoom de la mesa
  if (dom.tshirtStage) {
    dom.tshirtStage.style.transform = `scale(${state.zoom})`;
  }

  // 4. Cuadrícula y Cotas
  if (dom.gridOverlay) {
    dom.gridOverlay.classList.toggle('active', state.mostrarCuadricula);
  }
  const dims = CONFIG_TALLAS[state.talla];
  if (dom.cotaWidth && dom.cotaHeight) {
    dom.cotaWidth.style.display = state.mostrarCotas ? 'flex' : 'none';
    dom.cotaHeight.style.display = state.mostrarCotas ? 'flex' : 'none';
    if (dom.cotaWidthLabel) dom.cotaWidthLabel.textContent = `ANCHO ${dims.ancho} cm`;
    if (dom.cotaHeightLabel) dom.cotaHeightLabel.textContent = `LARGO ${dims.largo} cm`;
  }

  // 5. Mostrar diseño activo sobre la polera
  const d = state.disenos[lado];
  if (d && dom.designWrapper && dom.designDisplayImg) {
    dom.designWrapper.style.display = 'block';
    if (dom.designDisplayImg.src !== d.src) {
      dom.designDisplayImg.src = d.src;
    }

    // Calcular tamaño del diseño en píxeles según los centímetros de la talla
    const stageWidthPx = dom.tshirtStage ? dom.tshirtStage.offsetWidth || 500 : 500;
    // El ancho del cuerpo de la polera ocupa aproximadamente el 55% del área total 2000x2000
    const bodyWidthPx = stageWidthPx * 0.55;
    const pxPerCm = bodyWidthPx / dims.ancho;

    const widthPx = Math.max(30, Math.round(d.widthCm * pxPerCm));
    const heightPx = Math.max(30, Math.round(d.heightCm * pxPerCm));

    dom.designWrapper.style.width = `${widthPx}px`;
    dom.designWrapper.style.height = `${heightPx}px`;
    dom.designWrapper.style.left = `${d.xPercent}%`;
    dom.designWrapper.style.top = `${d.yPercent}%`;
    dom.designWrapper.style.transform = `translate(-50%, -50%) rotate(${d.angleDeg}deg)`;

    // Sincronizar inputs
    if (dom.inputWidthCm) dom.inputWidthCm.value = d.widthCm;
    if (dom.inputAngleDeg) dom.inputAngleDeg.value = d.angleDeg;

    // Calcular métricas HUD respecto a la prenda
    const distCuelloCm = Number(((d.yPercent - 22) * (dims.largo / 70)).toFixed(1));
    const distInfCm = Number(((78 - d.yPercent) * (dims.largo / 70)).toFixed(1));
    const distIzqCm = Number(((d.xPercent - 23) * (dims.ancho / 54)).toFixed(1));
    const distDerCm = Number(((77 - d.xPercent) * (dims.ancho / 54)).toFixed(1));

    if (dom.hudSizeCm) dom.hudSizeCm.textContent = `${d.widthCm} × ${d.heightCm} cm`;
    if (dom.hudNeckCm) dom.hudNeckCm.textContent = `${Math.max(0, distCuelloCm)} cm`;
    if (dom.hudBottomCm) dom.hudBottomCm.textContent = `${Math.max(0, distInfCm)} cm`;
    if (dom.hudLeftCm) dom.hudLeftCm.textContent = `${Math.max(0, distIzqCm)} cm`;
    if (dom.hudRightCm) dom.hudRightCm.textContent = `${Math.max(0, distDerCm)} cm`;
  } else if (dom.designWrapper) {
    dom.designWrapper.style.display = 'none';
    if (dom.inputWidthCm) dom.inputWidthCm.value = '';
    if (dom.inputAngleDeg) dom.inputAngleDeg.value = '';
    if (dom.hudSizeCm) dom.hudSizeCm.textContent = 'Sin diseño';
    if (dom.hudNeckCm) dom.hudNeckCm.textContent = '—';
    if (dom.hudBottomCm) dom.hudBottomCm.textContent = '—';
    if (dom.hudLeftCm) dom.hudLeftCm.textContent = '—';
    if (dom.hudRightCm) dom.hudRightCm.textContent = '—';
  }

  // 6. Estado de botones de edición
  const tieneDiseno = Boolean(d);
  if (dom.inputWidthCm) dom.inputWidthCm.disabled = !tieneDiseno;
  if (dom.inputAngleDeg) dom.inputAngleDeg.disabled = !tieneDiseno;
  if (dom.centerDesignBtn) dom.centerDesignBtn.disabled = !tieneDiseno;
  if (dom.deleteDesignBtn) dom.deleteDesignBtn.disabled = !tieneDiseno;
  document.querySelectorAll('[data-align]').forEach((btn) => {
    btn.disabled = !tieneDiseno;
  });

  // 7. Indicador de puntos en pestañas
  if (dom.dotAnverso) dom.dotAnverso.classList.toggle('has-content', Boolean(state.disenos.anverso));
  if (dom.dotReverso) dom.dotReverso.classList.toggle('has-content', Boolean(state.disenos.reverso));
}

// 5. INTERACTIVIDAD TÁCTIL Y RATÓN SOBRE EL DISEÑO (Arrastrar, Escalar, Rotar)
let isInteracting = false;
let interactionType = null; // 'drag' | 'rotate' | 'resize'
let startPointerX = 0;
let startPointerY = 0;
let startDesignXPercent = 50;
let startDesignYPercent = 45;
let startWidthCm = 22;
let startHeightCm = 22;
let startAngleDeg = 0;
let designCenterScreenX = 0;
let designCenterScreenY = 0;

function conectarInteraccionDiseno() {
  if (!dom.designWrapper) return;

  // Iniciar interacción
  dom.designWrapper.addEventListener('pointerdown', (e) => {
    const d = state.disenos[state.ladoActivo];
    if (!d) return;

    dom.designWrapper.setPointerCapture(e.pointerId);
    isInteracting = true;
    startPointerX = e.clientX;
    startPointerY = e.clientY;
    startDesignXPercent = d.xPercent;
    startDesignYPercent = d.yPercent;
    startWidthCm = d.widthCm;
    startHeightCm = d.heightCm;
    startAngleDeg = d.angleDeg;

    const rect = dom.designWrapper.getBoundingClientRect();
    designCenterScreenX = rect.left + rect.width / 2;
    designCenterScreenY = rect.top + rect.height / 2;

    const target = e.target;
    if (target.classList.contains('rot-handle')) {
      interactionType = 'rotate';
    } else if (target.classList.contains('resize-handle')) {
      interactionType = 'resize';
    } else {
      interactionType = 'drag';
      dom.designWrapper.classList.add('is-dragging');
    }

    e.stopPropagation();
    e.preventDefault();
  });

  window.addEventListener('pointermove', (e) => {
    if (!isInteracting) return;
    const d = state.disenos[state.ladoActivo];
    if (!d) return;

    const stageRect = dom.tshirtStage.getBoundingClientRect();

    if (interactionType === 'drag') {
      const deltaXPx = e.clientX - startPointerX;
      const deltaYPx = e.clientY - startPointerY;

      let newXPercent = startDesignXPercent + (deltaXPx / stageRect.width) * 100;
      let newYPercent = startDesignYPercent + (deltaYPx / stageRect.height) * 100;

      // Imán central horizontal
      if (Math.abs(newXPercent - 50) < 1.2) newXPercent = 50;

      d.xPercent = Number(Math.max(15, Math.min(85, newXPercent)).toFixed(2));
      d.yPercent = Number(Math.max(15, Math.min(85, newYPercent)).toFixed(2));
      actualizarVistaPolera();
    } else if (interactionType === 'rotate') {
      const angleRad = Math.atan2(e.clientY - designCenterScreenY, e.clientX - designCenterScreenX);
      let deg = Math.round((angleRad * 180) / Math.PI + 90);
      if (deg > 180) deg -= 360;
      if (deg < -180) deg += 360;

      // Imán para ángulos clave (0°, 45°, 90°, -45°, -90°)
      const snaps = [-180, -90, -45, 0, 45, 90, 180];
      for (const s of snaps) {
        if (Math.abs(deg - s) <= 3) { deg = s; break; }
      }
      d.angleDeg = deg;
      actualizarVistaPolera();
    } else if (interactionType === 'resize') {
      const distStart = Math.hypot(startPointerX - designCenterScreenX, startPointerY - designCenterScreenY);
      const distNow = Math.hypot(e.clientX - designCenterScreenX, e.clientY - designCenterScreenY);
      const scaleFactor = Math.max(0.15, distNow / Math.max(10, distStart));

      let newW = Number((startWidthCm * scaleFactor).toFixed(1));
      newW = Math.max(4, Math.min(65, newW));
      d.widthCm = newW;
      if (state.bloquearProporcion) {
        d.heightCm = Number((newW / d.aspectRatio).toFixed(1));
      } else {
        d.heightCm = Number((startHeightCm * scaleFactor).toFixed(1));
      }
      actualizarVistaPolera();
    }
  });

  window.addEventListener('pointerup', () => {
    if (isInteracting) {
      isInteracting = false;
      interactionType = null;
      dom.designWrapper.classList.remove('is-dragging');
      guardarEstadoEnHistorial();
    }
  });
}

// 6. ALINEACIÓN Y ACCIONES DEL MENÚ SUPERIOR
function alinearDiseno(tipo) {
  const d = state.disenos[state.ladoActivo];
  if (!d) return;

  switch (tipo) {
    case 'left':
      d.xPercent = 36;
      break;
    case 'center-h':
      d.xPercent = 50;
      break;
    case 'right':
      d.xPercent = 64;
      break;
    case 'top':
      d.yPercent = 32;
      break;
    case 'center-v':
      d.yPercent = 46;
      break;
    case 'bottom':
      d.yPercent = 70;
      break;
  }
  actualizarVistaPolera();
  guardarEstadoEnHistorial();
}

function eliminarDisenoActivo() {
  const lado = state.ladoActivo;
  if (!state.disenos[lado]) return;
  state.disenos[lado] = null;
  actualizarVistaPolera();
  guardarEstadoEnHistorial();
  mostrarNotificacion(`Diseño eliminado del ${lado}.`);
}

// 7. SUBIDA DE ARCHIVOS Y GRÁFICO DEMO
function validarYCargarArchivo(file) {
  if (!file) return;
  const validos = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
  if (!validos.includes(file.type)) {
    mostrarNotificacion('Formato no soportado. Usa PNG, JPG, SVG o WEBP.');
    return;
  }
  if (file.size > 25 * 1024 * 1024) {
    mostrarNotificacion('El archivo excede el límite máximo de 25 MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const src = e.target.result;
    const img = new Image();
    img.onload = () => {
      const aspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
      const widthCm = 22;
      const heightCm = Number((widthCm / aspect).toFixed(1));
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();

      state.disenos[state.ladoActivo] = {
        src,
        file,
        fileName: file.name,
        fileExt: ext,
        xPercent: 50,
        yPercent: 40,
        widthCm,
        heightCm,
        angleDeg: 0,
        aspectRatio: aspect
      };

      actualizarVistaPolera();
      guardarEstadoEnHistorial();
      mostrarNotificacion(`Diseño cargado en ${state.ladoActivo.toUpperCase()} (${widthCm} × ${heightCm} cm).`);
    };
    img.src = src;
  };
  reader.readAsDataURL(file);
}

function cargarGraficoDemo() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480">
    <rect x="10" y="10" width="780" height="460" rx="18" fill="#141416" stroke="#BA002C" stroke-width="8"/>
    <text x="400" y="200" text-anchor="middle" fill="#FFFFFF" font-family="monospace" font-weight="700" font-size="96" letter-spacing="8">ZAIREN</text>
    <text x="400" y="290" text-anchor="middle" fill="#BA002C" font-family="sans-serif" font-weight="700" font-size="52">ザイレン · STUDIO</text>
    <line x1="120" y1="340" x2="680" y2="340" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="10 8"/>
    <text x="400" y="390" text-anchor="middle" fill="#E2E2E4" font-family="monospace" font-size="24" letter-spacing="4">CUSTOM APPAREL LAB</text>
  </svg>`;
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const demoFile = new File([blob], 'zairen-logo-demo.svg', { type: 'image/svg+xml' });
  validarYCargarArchivo(demoFile);
}

// 8. TEMA, TALLAS Y COLORES
function cambiarLadoActivo(nuevoLado) {
  if (nuevoLado !== 'anverso' && nuevoLado !== 'reverso') return;
  state.ladoActivo = nuevoLado;
  dom.tabAnverso.classList.toggle('active', nuevoLado === 'anverso');
  dom.tabAnverso.setAttribute('aria-selected', String(nuevoLado === 'anverso'));
  dom.tabReverso.classList.toggle('active', nuevoLado === 'reverso');
  dom.tabReverso.setAttribute('aria-selected', String(nuevoLado === 'reverso'));
  dom.activeSideLabelText.textContent = nuevoLado.toUpperCase();
  actualizarVistaPolera();
}

function seleccionarColor(hex) {
  state.colorCuerpo = hex.toUpperCase();
  dom.currentColorHexLabel.textContent = state.colorCuerpo;
  dom.customColorPicker.value = state.colorCuerpo;
  dom.sleeveColorPreview.style.backgroundColor = state.colorCuerpo;
  dom.collarColorPreview.style.backgroundColor = state.colorCuerpo;

  document.querySelectorAll('.color-swatch').forEach((sw) => {
    sw.classList.toggle('active', sw.dataset.hex.toUpperCase() === state.colorCuerpo);
  });

  actualizarVistaPolera();
  guardarEstadoEnHistorial();
}

function actualizarUIInfoTalla() {
  const d = CONFIG_TALLAS[state.talla];
  dom.sizeDimensionsInfo.innerHTML = `
    <span>ANCHO: <strong>${d.ancho} cm</strong></span>
    <span>LARGO: <strong>${d.largo} cm</strong></span>
    <span>BOCA MANGA: <strong>${d.manga} cm</strong></span>
  `;
  dom.sizeEstBadge.textContent = d.estimada ? '*ESTIMADA' : 'BASE REAL';
  actualizarVistaPolera();
}

function renderizarPaletaColores() {
  dom.colorSwatchesContainer.innerHTML = '';
  PALETA_COLORES.forEach((c) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-swatch';
    btn.style.backgroundColor = c.hex;
    btn.title = `${c.nombre} (${c.hex})`;
    btn.setAttribute('aria-label', `Color ${c.nombre}`);
    btn.dataset.hex = c.hex;
    btn.addEventListener('click', () => seleccionarColor(c.hex));
    dom.colorSwatchesContainer.appendChild(btn);
  });
  seleccionarColor(state.colorCuerpo);
}

// 9. HISTORIAL (Deshacer / Rehacer)
function clonarDiseno(d) {
  return d ? { ...d } : null;
}

function guardarEstadoEnHistorial() {
  const snap = {
    talla: state.talla,
    colorCuerpo: state.colorCuerpo,
    anverso: clonarDiseno(state.disenos.anverso),
    reverso: clonarDiseno(state.disenos.reverso)
  };
  state.historial = state.historial.slice(0, state.indiceHistorial + 1);
  state.historial.push(snap);
  if (state.historial.length > 30) state.historial.shift();
  state.indiceHistorial = state.historial.length - 1;
  actualizarBotonesHistorial();
}

function restaurarSnapshot(snap) {
  if (!snap) return;
  state.talla = snap.talla;
  state.colorCuerpo = snap.colorCuerpo;
  state.disenos.anverso = clonarDiseno(snap.anverso);
  state.disenos.reverso = clonarDiseno(snap.reverso);

  dom.sizeSelect.value = state.talla;
  actualizarUIInfoTalla();
  seleccionarColor(state.colorCuerpo);
  actualizarVistaPolera();
  actualizarBotonesHistorial();
}

function deshacerAccion() {
  if (state.indiceHistorial > 0) {
    state.indiceHistorial--;
    restaurarSnapshot(state.historial[state.indiceHistorial]);
  }
}

function rehacerAccion() {
  if (state.indiceHistorial < state.historial.length - 1) {
    state.indiceHistorial++;
    restaurarSnapshot(state.historial[state.indiceHistorial]);
  }
}

function actualizarBotonesHistorial() {
  if (dom.undoBtn) dom.undoBtn.disabled = state.indiceHistorial <= 0;
  if (dom.redoBtn) dom.redoBtn.disabled = state.indiceHistorial >= state.historial.length - 1;
}

// 10. EXPORTACIÓN ZIP / DESCARGA DE ALTA RESOLUCIÓN
async function generarCanvasCompuestoLado(lado) {
  const canvas = document.createElement('canvas');
  canvas.width = 2000;
  canvas.height = 2000;
  const ctx = canvas.getContext('2d');

  // Fondo blanco para ficha técnica
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 2000, 2000);

  // 1. Cargar imagen de la polera
  const tshirtImg = new Image();
  await new Promise((resolve) => {
    tshirtImg.onload = resolve;
    tshirtImg.onerror = resolve;
    tshirtImg.src = `img/polera-${lado}.png`;
  });

  // 2. Teñir polera con el color elegido
  const tintCanvas = document.createElement('canvas');
  tintCanvas.width = 2000;
  tintCanvas.height = 2000;
  const tCtx = tintCanvas.getContext('2d');
  tCtx.drawImage(tshirtImg, 0, 0, 2000, 2000);

  if (state.colorCuerpo.toUpperCase() !== '#FFFFFF') {
    tCtx.globalCompositeOperation = 'multiply';
    tCtx.fillStyle = state.colorCuerpo;
    tCtx.fillRect(0, 0, 2000, 2000);
    tCtx.globalCompositeOperation = 'destination-in';
    tCtx.drawImage(tshirtImg, 0, 0, 2000, 2000);
  }

  ctx.drawImage(tintCanvas, 0, 0, 2000, 2000);

  // 3. Dibujar el diseño en la posición relativa exacta
  const d = state.disenos[lado];
  if (d && d.src) {
    const designImg = new Image();
    await new Promise((resolve) => {
      designImg.onload = resolve;
      designImg.onerror = resolve;
      designImg.src = d.src;
    });

    const dims = CONFIG_TALLAS[state.talla];
    const bodyWidthPx2000 = 1100;
    const pxPerCm2000 = bodyWidthPx2000 / dims.ancho;

    const w = d.widthCm * pxPerCm2000;
    const h = d.heightCm * pxPerCm2000;
    const cx = (d.xPercent / 100) * 2000;
    const cy = (d.yPercent / 100) * 2000;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((d.angleDeg * Math.PI) / 180);
    ctx.drawImage(designImg, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // 4. Encabezado técnico
  ctx.fillStyle = '#141516';
  ctx.font = '700 24px monospace';
  ctx.fillText(`ZAIREN | ${lado.toUpperCase()} · TALLA ${state.talla} · COLOR ${state.colorCuerpo}`, 40, 60);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

function generarTextoEspecificaciones() {
  const t = CONFIG_TALLAS[state.talla];
  const hoy = new Date().toISOString().split('T')[0];
  let txt = `====================================================================
ZAIREN — FICHA TÉCNICA DE PERSONALIZACIÓN
====================================================================
Fecha: ${hoy}
Prenda: Polera Básica
Talla: ${state.talla} (Ancho ${t.ancho} cm | Largo ${t.largo} cm | Manga ${t.manga} cm)
Color del cuerpo: ${state.colorCuerpo}
`;

  ['anverso', 'reverso'].forEach((l) => {
    const d = state.disenos[l];
    txt += `\n--------------------------------------------------------------------\nLADO: ${l.toUpperCase()}\n`;
    if (d) {
      txt += `Tamaño: ${d.widthCm} cm x ${d.heightCm} cm\nPosición: X=${d.xPercent}%, Y=${d.yPercent}%\nRotación: ${d.angleDeg}°\n`;
    } else {
      txt += `Sin diseño.\n`;
    }
  });

  return txt;
}

function abrirModalExportacion() {
  const listEl = dom.exportFilesList;
  const noticeEl = dom.exportModalNotice;
  const confirmBtn = dom.confirmDownloadZipBtn;
  listEl.innerHTML = '';

  const tieneAnverso = Boolean(state.disenos.anverso);
  const tieneReverso = Boolean(state.disenos.reverso);

  if (!tieneAnverso && !tieneReverso) {
    noticeEl.innerHTML = `<strong style="color:var(--accent-crimson)">Aviso:</strong> Aún no has subido ningún gráfico. Puedes cargar uno en el Paso 2 o probar con "+ GRÁFICO DEMO".`;
    listEl.innerHTML = '<li>Sin archivos para exportar.</li>';
    confirmBtn.disabled = true;
  } else {
    noticeEl.innerHTML = `Paquete listo: <strong>polera-${state.talla}-${new Date().toISOString().split('T')[0]}.zip</strong>.`;
    confirmBtn.disabled = false;
    if (tieneAnverso) listEl.innerHTML += `<li><span><strong>anverso.png</strong></span><span class="file-tag">Vista frontal 2000px</span></li>`;
    if (tieneReverso) listEl.innerHTML += `<li><span><strong>reverso.png</strong></span><span class="file-tag">Vista posterior 2000px</span></li>`;
    if (state.disenos.anverso && state.disenos.anverso.file) {
      listEl.innerHTML += `<li><span><strong>${state.disenos.anverso.fileName}</strong></span><span class="file-tag">Diseño nativo anverso</span></li>`;
    }
    if (state.disenos.reverso && state.disenos.reverso.file) {
      listEl.innerHTML += `<li><span><strong>${state.disenos.reverso.fileName}</strong></span><span class="file-tag">Diseño nativo reverso</span></li>`;
    }
    listEl.innerHTML += `<li><span><strong>especificaciones.txt</strong></span><span class="file-tag">Ficha técnica</span></li>`;
  }

  dom.exportModalBackdrop.classList.add('open');
}

async function generarYDescargarZIP() {
  if (typeof JSZip === 'undefined') {
    mostrarNotificacion('Error: La librería JSZip no está disponible.');
    return;
  }

  const btn = dom.confirmDownloadZipBtn;
  const textoOrig = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Generando paquete ZIP...';

  try {
    const zip = new JSZip();

    if (state.disenos.anverso) {
      const blobAnverso = await generarCanvasCompuestoLado('anverso');
      if (blobAnverso) zip.file('anverso.png', blobAnverso);
      if (state.disenos.anverso.file) zip.file(`diseno_anverso.${state.disenos.anverso.fileExt}`, state.disenos.anverso.file);
    }

    if (state.disenos.reverso) {
      const blobReverso = await generarCanvasCompuestoLado('reverso');
      if (blobReverso) zip.file('reverso.png', blobReverso);
      if (state.disenos.reverso.file) zip.file(`diseno_reverso.${state.disenos.reverso.fileExt}`, state.disenos.reverso.file);
    }

    zip.file('especificaciones.txt', generarTextoEspecificaciones());

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipName = `polera-${state.talla}-${new Date().toISOString().split('T')[0]}.zip`;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);

    dom.exportModalBackdrop.classList.remove('open');
    mostrarNotificacion(`¡Descarga lista! (${zipName})`);
  } catch (err) {
    mostrarNotificacion('Error al generar el archivo ZIP.');
  } finally {
    btn.disabled = false;
    btn.textContent = textoOrig;
  }
}

// 11. NOTIFICACIONES FLOTANTES
function mostrarNotificacion(msg) {
  const toast = document.getElementById('toastBanner');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('visible');
  clearTimeout(mostrarNotificacion._t);
  mostrarNotificacion._t = setTimeout(() => toast.classList.remove('visible'), 3500);
}

// 12. TEMA CLARO / OSCURO
function inicializarTema() {
  const theme = localStorage.getItem('zairen_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);

  if (dom.themeToggleBtn) {
    dom.themeToggleBtn.addEventListener('click', () => {
      const actual = document.documentElement.getAttribute('data-theme');
      const nuevo = actual === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nuevo);
      try { localStorage.setItem('zairen_theme', nuevo); } catch (e) {}
    });
  }
}

// 13. CONEXIÓN DE EVENTOS
function conectarEventos() {
  // Pestañas Anverso / Reverso
  dom.tabAnverso.addEventListener('click', () => cambiarLadoActivo('anverso'));
  dom.tabReverso.addEventListener('click', () => cambiarLadoActivo('reverso'));

  // Talla
  dom.sizeSelect.addEventListener('change', (e) => {
    state.talla = e.target.value;
    actualizarUIInfoTalla();
    guardarEstadoEnHistorial();
  });

  // Selector de color libre
  dom.customColorPicker.addEventListener('input', (e) => seleccionarColor(e.target.value));
  dom.customColorPicker.addEventListener('change', () => guardarEstadoEnHistorial());

  // Alineaciones
  document.querySelectorAll('[data-align]').forEach((btn) => {
    btn.addEventListener('click', () => alinearDiseno(btn.dataset.align));
  });

  // Inputs numéricos de ancho y rotación
  dom.inputWidthCm.addEventListener('input', (e) => {
    const d = state.disenos[state.ladoActivo];
    const val = parseFloat(e.target.value);
    if (!d || isNaN(val) || val < 2 || val > 100) return;
    d.widthCm = Number(val.toFixed(1));
    if (state.bloquearProporcion) {
      d.heightCm = Number((val / d.aspectRatio).toFixed(1));
    }
    actualizarVistaPolera();
  });
  dom.inputWidthCm.addEventListener('change', guardarEstadoEnHistorial);

  dom.inputAngleDeg.addEventListener('input', (e) => {
    const d = state.disenos[state.ladoActivo];
    const val = parseFloat(e.target.value);
    if (!d || isNaN(val)) return;
    d.angleDeg = Math.round(val);
    actualizarVistaPolera();
  });
  dom.inputAngleDeg.addEventListener('change', guardarEstadoEnHistorial);

  dom.lockAspectBtn.addEventListener('click', () => {
    state.bloquearProporcion = !state.bloquearProporcion;
    dom.lockAspectBtn.classList.toggle('active', state.bloquearProporcion);
    dom.lockAspectBtn.innerHTML = `<span>${state.bloquearProporcion ? 'PROP.' : 'LIBRE'}</span>`;
  });

  dom.resetAngleBtn.addEventListener('click', () => {
    const d = state.disenos[state.ladoActivo];
    if (!d) return;
    d.angleDeg = 0;
    actualizarVistaPolera();
    guardarEstadoEnHistorial();
  });

  dom.centerDesignBtn.addEventListener('click', () => alinearDiseno('center-h'));
  dom.deleteDesignBtn.addEventListener('click', eliminarDisenoActivo);

  // Subida de archivos (clic y arrastrar)
  dom.uploadDropzone.addEventListener('click', () => dom.fileInput.click());
  dom.fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      validarYCargarArchivo(e.target.files[0]);
      e.target.value = '';
    }
  });

  dom.uploadDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dom.uploadDropzone.classList.add('dragover');
  });
  dom.uploadDropzone.addEventListener('dragleave', () => dom.uploadDropzone.classList.remove('dragover'));
  dom.uploadDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dom.uploadDropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validarYCargarArchivo(e.dataTransfer.files[0]);
    }
  });

  dom.loadSampleGraphicBtn.addEventListener('click', cargarGraficoDemo);

  // Botones de Guías y Cotas
  dom.toggleGridBtn.addEventListener('click', () => {
    state.mostrarCuadricula = !state.mostrarCuadricula;
    dom.toggleGridBtn.classList.toggle('active', state.mostrarCuadricula);
    actualizarVistaPolera();
  });

  dom.toggleCotasBtn.addEventListener('click', () => {
    state.mostrarCotas = !state.mostrarCotas;
    dom.toggleCotasBtn.classList.toggle('active', state.mostrarCotas);
    actualizarVistaPolera();
  });

  // Zoom
  dom.zoomInBtn.addEventListener('click', () => {
    state.zoom = Math.min(2.5, Number((state.zoom * 1.15).toFixed(2)));
    dom.zoomResetBtn.textContent = `${Math.round(state.zoom * 100)}%`;
    actualizarVistaPolera();
  });
  dom.zoomOutBtn.addEventListener('click', () => {
    state.zoom = Math.max(0.5, Number((state.zoom / 1.15).toFixed(2)));
    dom.zoomResetBtn.textContent = `${Math.round(state.zoom * 100)}%`;
    actualizarVistaPolera();
  });
  dom.zoomResetBtn.addEventListener('click', () => {
    state.zoom = 1;
    dom.zoomResetBtn.textContent = '100%';
    actualizarVistaPolera();
  });

  // Historial
  dom.undoBtn.addEventListener('click', deshacerAccion);
  dom.redoBtn.addEventListener('click', rehacerAccion);

  // Navegación de pasos en barra superior
  document.querySelectorAll('[data-goto-step]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const step = btn.dataset.gotoStep;
      document.querySelectorAll('[data-goto-step]').forEach((b) => b.classList.toggle('active', b.dataset.gotoStep === step));
      document.querySelectorAll('[data-mobile-tab]').forEach((b) => b.classList.toggle('active', b.dataset.mobileTab === step));
      document.querySelectorAll('.bento-section').forEach((s) => s.classList.toggle('mobile-active', s.id === `stepSection${step}`));
      if (step === '3') abrirModalExportacion();
    });
  });

  document.querySelectorAll('[data-mobile-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.mobileTab;
      document.querySelectorAll('[data-mobile-tab]').forEach((b) => b.classList.toggle('active', b.dataset.mobileTab === tab));
      document.querySelectorAll('.bento-section').forEach((s) => s.classList.toggle('mobile-active', s.id === `stepSection${tab}`));
    });
  });

  // Modal exportar
  dom.openExportModalBtn.addEventListener('click', abrirModalExportacion);
  dom.openExportModalBtnTop.addEventListener('click', abrirModalExportacion);
  dom.closeExportModalBtn.addEventListener('click', () => dom.exportModalBackdrop.classList.remove('open'));
  dom.cancelExportBtn.addEventListener('click', () => dom.exportModalBackdrop.classList.remove('open'));
  dom.confirmDownloadZipBtn.addEventListener('click', generarYDescargarZIP);

  window.addEventListener('resize', actualizarVistaPolera);
}

// INICIALIZACIÓN
window.onload = function () {
  inicializarReferenciasDOM();
  inicializarTema();
  renderizarPaletaColores();
  actualizarUIInfoTalla();
  conectarInteraccionDiseno();
  conectarEventos();
  guardarEstadoEnHistorial();
  actualizarVistaPolera();
};
