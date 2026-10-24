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
    this.manijaTamPx = 14.0;       // Punto visible de 14 px
    this.manijaRadioPx = 7.0;
    this.manijaHitAreaPx = 44.0;   // Área de toque táctil de 44 px
    this.manijaHitRadioPx = 22.0;
    this.margenToqueCuerpoPx = 12.0; // Margen de toque de 12 px para cuerpo
    this.brazoRotacionCm = 2.4;
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

    // Geometría en centímetros adaptada a la superficie activa (manga centrada a 9.5 cm, torso a 30 cm)
    const supActiva = estado.datos?.superficieActiva;
    const esManga = supActiva === 'manga_izquierda' || supActiva === 'manga_derecha';

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
   * Punto visible calibrado a 14 px exactos.
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

    // Brazo de rotación aparte
    const brazoPx = this.brazoRotacionCm * escala;
    ctx.beginPath();
    ctx.moveTo(0, -hPx / 2);
    ctx.lineTo(0, -hPx / 2 - brazoPx);
    ctx.strokeStyle = '#BA002C';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Manija de rotación circular visible (14 px de diámetro)
    ctx.beginPath();
    ctx.arc(0, -hPx / 2 - brazoPx, this.manijaRadioPx, 0, Math.PI * 2);
    ctx.fillStyle = '#FAF9F6';
    ctx.fill();
    ctx.strokeStyle = '#BA002C';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 8 Manijas de transformación visibles de 14 px exactos
    const puntos = [
      { id: 'tl', x: -wPx / 2, y: -hPx / 2, tipo: 'esquina' },
      { id: 'tm', x: 0,        y: -hPx / 2, tipo: 'lado' },
      { id: 'tr', x: wPx / 2,  y: -hPx / 2, tipo: 'esquina' },
      { id: 'mr', x: wPx / 2,  y: 0,        tipo: 'lado' },
      { id: 'br', x: wPx / 2,  y: hPx / 2,  tipo: 'esquina' },
      { id: 'bm', x: 0,        y: hPx / 2,  tipo: 'lado' },
      { id: 'bl', x: -wPx / 2, y: hPx / 2,  tipo: 'esquina' },
      { id: 'ml', x: -wPx / 2, y: 0,        tipo: 'lado' }
    ];

    const tam = this.manijaTamPx; // 14 px visible
    for (const p of puntos) {
      ctx.fillStyle = '#FAF9F6';
      ctx.strokeStyle = '#BA002C';
      ctx.lineWidth = 1.5;

      if (p.tipo === 'esquina') {
        // Manija de esquina: cuadrado de 14 px con borde nítido
        ctx.fillRect(p.x - tam / 2, p.y - tam / 2, tam, tam);
        ctx.strokeRect(p.x - tam / 2, p.y - tam / 2, tam, tam);
      } else {
        // Manija lateral de un solo eje: píldora/rectángulo de 14 px
        ctx.fillRect(p.x - tam / 2, p.y - tam / 2, tam, tam);
        ctx.strokeRect(p.x - tam / 2, p.y - tam / 2, tam, tam);
      }
    }

    ctx.restore();
  }

  /**
   * Hit-testing para detectar toques o clics sobre manijas o sobre el cuerpo de la capa.
   * Área de toque ampliada a 44 px para manijas y margen de toque de 12 px para cuerpo.
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
      if (Math.abs(lx) <= (wPx / 2 + this.margenToqueCuerpoPx) && Math.abs(ly) <= (hPx / 2 + this.margenToqueCuerpoPx)) {
        return { tipo: 'bloqueado', capa };
      }
      return null;
    }

    // 1. Verificar manija de rotación (área de toque de 44 px)
    const brazoPx = this.brazoRotacionCm * escala;
    const rotY = -hPx / 2 - brazoPx;
    if (Math.hypot(lx, ly - rotY) <= this.manijaHitRadioPx) {
      return { tipo: 'rotar', capa, cursor: 'grab' };
    }

    // 2. Verificar las 8 manijas de escala (área de toque de 44 px)
    const umbralHit = this.manijaHitRadioPx; // 22 px radio => 44 px área de toque
    const manijas = [
      { id: 'tl', x: -wPx / 2, y: -hPx / 2, cursor: 'nwse-resize', esEsquina: true },
      { id: 'tr', x: wPx / 2,  y: -hPx / 2, cursor: 'nesw-resize', esEsquina: true },
      { id: 'br', x: wPx / 2,  y: hPx / 2,  cursor: 'nwse-resize', esEsquina: true },
      { id: 'bl', x: -wPx / 2, y: hPx / 2,  cursor: 'nesw-resize', esEsquina: true },
      { id: 'tm', x: 0,        y: -hPx / 2, cursor: 'ns-resize',   esEsquina: false },
      { id: 'bm', x: 0,        y: hPx / 2,  cursor: 'ns-resize',   esEsquina: false },
      { id: 'ml', x: -wPx / 2, y: 0,        cursor: 'ew-resize',   esEsquina: false },
      { id: 'mr', x: wPx / 2,  y: 0,        cursor: 'ew-resize',   esEsquina: false }
    ];

    for (const m of manijas) {
      if (Math.abs(lx - m.x) <= umbralHit && Math.abs(ly - m.y) <= umbralHit) {
        return {
          tipo: 'manija',
          manijaId: m.id,
          cursor: m.cursor,
          esEsquina: m.esEsquina,
          capa
        };
      }
    }

    // 3. Verificar cuerpo de la capa con margen de toque de 12 px
    if (Math.abs(lx) <= (wPx / 2 + this.margenToqueCuerpoPx) && Math.abs(ly) <= (hPx / 2 + this.margenToqueCuerpoPx)) {
      return { tipo: 'cuerpo', capa, cursor: 'move' };
    }

    return null;
  }
}

export const gestorImagenes = new GestorImagenes();
