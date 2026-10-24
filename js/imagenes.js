/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Módulo de Manipulación y Renderizado de Imágenes
 * ============================================================================
 * Soporta carga y arrastre de PNG, JPG, SVG, WEBP (hasta 25 MB),
 * cálculo dinámico de DPI con aviso de calidad < 150 DPI,
 * transformaciones con manijas independientes en 8 puntos y rotación.
 */

import { CONFIG } from './config.js';
import { estado } from './estado.js';

export class GestorImagenes {
  constructor() {
    this.manijaRadioPx = 7.0;
    this.brazoRotacionCm = 2.8;
  }

  /**
   * Procesa un archivo de imagen subido por el usuario o arrastrado.
   */
  async procesarArchivo(file) {
    if (!file) throw new Error('No se seleccionó ningún archivo');

    if (file.size > CONFIG.MAX_FILE_SIZE_BYTES) {
      throw new Error(`El archivo supera el límite máximo de 25 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
    }

    if (!CONFIG.FORMATOS_SOPORTADOS.includes(file.type) && !file.name.match(/\.(png|jpe?g|svg|webp)$/i)) {
      throw new Error('Formato no soportado. Usa PNG, JPG, SVG o WEBP');
    }

    const dataUrl = await this.leerArchivoComoDataURL(file);
    const imgEl = await this.cargarElementoImagen(dataUrl);

    // Calcular tamaño inicial razonable en centímetros (máximo 22 cm de ancho inicial)
    const aspect = imgEl.naturalWidth / (imgEl.naturalHeight || 1);
    let initWidthCm = 20.0;
    let initHeightCm = 20.0 / aspect;

    if (initHeightCm > 26.0) {
      initHeightCm = 26.0;
      initWidthCm = initHeightCm * aspect;
    }

    const capaImagen = {
      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      nombre: file.name.replace(/\.[^/.]+$/, ''),
      tipo: 'imagen',
      originalFile: file,
      dataUrl: dataUrl,
      imgElement: imgEl,
      fileExt: file.name.split('.').pop().toLowerCase(),
      anchoOriginalPx: imgEl.naturalWidth,
      altoOriginalPx: imgEl.naturalHeight,

      // Geometría en centímetros adaptada a la superficie activa (manga centrada a 9.5 cm, torso a 30 cm)
      const supActiva = estado.datos.superficieActiva;
      const esManga = supActiva === 'manga_izquierda' || supActiva === 'manga_derecha';

      xCm: 0,
      yCm: esManga ? 9.5 : 30.0,
      widthCm: parseFloat(initWidthCm.toFixed(2)),
      heightCm: parseFloat(initHeightCm.toFixed(2)),
      scaleX: 1.0,
      scaleY: 1.0,
      angleDeg: 0,
      flipH: false,
      flipV: false,
      opacity: 1.0,
      locked: false,
      visible: true,

      // Proporción original bloqueada por defecto
      lockAspect: true
    };

    return capaImagen;
  }

  leerArchivoComoDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Error al leer el archivo en disco'));
      reader.readAsDataURL(file);
    });
  }

  cargarElementoImagen(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
      img.src = src;
    });
  }

  /**
   * Calcula los DPI efectivos de la imagen al tamaño actual en centímetros.
   */
  calcularDPI(capa) {
    if (!capa || capa.tipo !== 'imagen' || !capa.anchoOriginalPx || !capa.widthCm) {
      return 300;
    }
    const anchoPulgadas = capa.widthCm / 2.54;
    return Math.round(capa.anchoOriginalPx / anchoPulgadas);
  }

  /**
   * Determina si la capa tiene calidad baja (< 150 DPI).
   */
  tieneCalidadBaja(capa) {
    if (capa.tipo !== 'imagen') return false;
    // Si es SVG vectorial, siempre es resolución infinita
    if (capa.fileExt === 'svg' || (capa.originalFile && capa.originalFile.type === 'image/svg+xml')) {
      return false;
    }
    return this.calcularDPI(capa) < CONFIG.RESOLUCION_DPI_MINIMA_ALERTA;
  }

  /**
   * Renderiza una capa de imagen en el Canvas.
   */
  dibujarCapa(ctx, capa, mesa) {
    if (!capa.visible || !capa.imgElement) return;

    const { cx, cy } = mesa.mundoACanvas(capa.xCm, capa.yCm);
    const escala = mesa.pxPorCmBase * mesa.zoom;
    const wPx = capa.widthCm * escala;
    const hPx = capa.heightCm * escala;

    ctx.save();
    ctx.globalAlpha = capa.opacity;
    ctx.translate(cx, cy);
    ctx.rotate((capa.angleDeg * Math.PI) / 180);
    ctx.scale(capa.flipH ? -1 : 1, capa.flipV ? -1 : 1);

    ctx.drawImage(capa.imgElement, -wPx / 2, -hPx / 2, wPx, hPx);

    ctx.restore();
  }

  /**
   * Dibuja el marco de selección y las 8 manijas de transformación + manija de rotación.
   */
  dibujarManijasTransformacion(ctx, capa, mesa) {
    if (!capa || capa.locked) return;

    const { cx, cy } = mesa.mundoACanvas(capa.xCm, capa.yCm);
    const escala = mesa.pxPorCmBase * mesa.zoom;
    const wPx = capa.widthCm * escala;
    const hPx = capa.heightCm * escala;
    const rad = (capa.angleDeg * Math.PI) / 180;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rad);

    // Marco exterior con línea formal
    ctx.strokeStyle = '#BA002C'; // Carmesí Zairen
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-wPx / 2, -hPx / 2, wPx, hPx);

    // Brazo de rotación
    const brazoPx = this.brazoRotacionCm * escala;
    ctx.beginPath();
    ctx.moveTo(0, -hPx / 2);
    ctx.lineTo(0, -hPx / 2 - brazoPx);
    ctx.strokeStyle = '#BA002C';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Manija de rotación circular
    ctx.beginPath();
    ctx.arc(0, -hPx / 2 - brazoPx, this.manijaRadioPx, 0, Math.PI * 2);
    ctx.fillStyle = '#FAF9F6';
    ctx.fill();
    ctx.stroke();

    // 8 Manijas de transformación rectangulares formales
    const puntos = [
      { id: 'tl', x: -wPx / 2, y: -hPx / 2 },
      { id: 'tm', x: 0,        y: -hPx / 2 },
      { id: 'tr', x: wPx / 2,  y: -hPx / 2 },
      { id: 'mr', x: wPx / 2,  y: 0 },
      { id: 'br', x: wPx / 2,  y: hPx / 2 },
      { id: 'bm', x: 0,        y: hPx / 2 },
      { id: 'bl', x: -wPx / 2, y: hPx / 2 },
      { id: 'ml', x: -wPx / 2, y: 0 }
    ];

    const tam = this.manijaRadioPx * 2;
    for (const p of puntos) {
      ctx.fillStyle = '#FAF9F6';
      ctx.fillRect(p.x - tam / 2, p.y - tam / 2, tam, tam);
      ctx.strokeRect(p.x - tam / 2, p.y - tam / 2, tam, tam);
    }

    ctx.restore();
  }

  /**
   * Hit-testing para detectar clics sobre manijas o sobre el cuerpo de la capa.
   */
  obtenerHitTest(canvasX, canvasY, capa, mesa) {
    if (!capa || !capa.visible) return null;

    const { cx, cy } = mesa.mundoACanvas(capa.xCm, capa.yCm);
    const escala = mesa.pxPorCmBase * mesa.zoom;
    const wPx = capa.widthCm * escala;
    const hPx = capa.heightCm * escala;

    // Desrotar el punto del cursor al sistema local de la capa
    const dx = canvasX - cx;
    const dy = canvasY - cy;
    const rad = (-capa.angleDeg * Math.PI) / 180;
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

    if (capa.locked) {
      if (Math.abs(lx) <= wPx / 2 && Math.abs(ly) <= hPx / 2) {
        return { tipo: 'bloqueado', capa };
      }
      return null;
    }

    // Verificar manija de rotación
    const brazoPx = this.brazoRotacionCm * escala;
    const rotY = -hPx / 2 - brazoPx;
    if (Math.hypot(lx, ly - rotY) <= this.manijaRadioPx + 4) {
      return { tipo: 'rotar', capa };
    }

    // Verificar las 8 manijas de escala
    const umbral = this.manijaRadioPx + 4;
    const manijas = [
      { id: 'tl', x: -wPx / 2, y: -hPx / 2, cursor: 'nwse-resize' },
      { id: 'tr', x: wPx / 2,  y: -hPx / 2, cursor: 'nesw-resize' },
      { id: 'br', x: wPx / 2,  y: hPx / 2,  cursor: 'nwse-resize' },
      { id: 'bl', x: -wPx / 2, y: hPx / 2,  cursor: 'nesw-resize' },
      { id: 'tm', x: 0,        y: -hPx / 2, cursor: 'ns-resize' },
      { id: 'bm', x: 0,        y: hPx / 2,  cursor: 'ns-resize' },
      { id: 'ml', x: -wPx / 2, y: 0,        cursor: 'ew-resize' },
      { id: 'mr', x: wPx / 2,  y: 0,        cursor: 'ew-resize' }
    ];

    for (const m of manijas) {
      if (Math.abs(lx - m.x) <= umbral && Math.abs(ly - m.y) <= umbral) {
        return { tipo: 'manija', manijaId: m.id, cursor: m.cursor, capa };
      }
    }

    // Verificar cuerpo de la capa para arrastrar
    if (Math.abs(lx) <= wPx / 2 && Math.abs(ly) <= hPx / 2) {
      return { tipo: 'cuerpo', capa };
    }

    return null;
  }
}

export const gestorImagenes = new GestorImagenes();
