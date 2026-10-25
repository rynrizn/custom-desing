/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Motor de Geometría y Renderizado Polera SVG
 * ============================================================================
 * Renderiza fielmente las siluetas vectoriales SVG (Talla M base: 53 × 71 cm),
 * con escalado paramétrico por talla, cuello acanalado de 1.5 cm con pespunte,
 * mangas en perspectiva y carga dinámica desde archivos SVG.
 */

import { CONFIG } from './config.js';
import { estado } from './estado.js';

// Siluetas vectoriales exactas con cotas milimétricas reales de taller (Talla M: 53 × 71 cm)
export const SVG_PATHS_PRENDA = {
  anverso: {
    cuerpo: 'M25.76 3.07 L22.21 1.88 L16.24 0.14 L14.70 -0.46 L13.40 -0.78 L11.39 -1.56 L10.97 -1.51 L9.79 -0.91 L8.72 -0.50 L6.54 0.09 L3.40 0.50 L0.62 0.64 L-2.45 0.55 L-5.65 0.14 L-8.43 -0.55 L-10.44 -1.37 L-11.09 -1.51 L-12.92 -0.78 L-14.23 -0.46 L-16.47 0.37 L-24.05 2.56 L-25.94 3.39 L-28.01 4.67 L-28.01 4.76 L-27.71 4.85 L-26.50 28.40 L-26.50 32.00 L-26.50 36.83 L-26.50 40.58 L-26.50 48.95 L-26.55 55.35 L-26.55 68.07 L-26.50 70.80 Q0 71.20 26.50 70.80 L26.55 68.07 L26.55 55.35 L26.50 48.95 L26.50 36.83 L26.50 32.00 L26.50 28.00 L28.07 4.85 L28.19 4.76 L28.66 4.76 L28.66 4.67 L27.48 3.93Z',
    mangaIzq: 'M-27.82 4.80 L-28.06 4.80 L-29.79 6.54 L-33.96 11.30 L-40.43 18.25 L-42.48 20.77 L-42.43 21.00 L-38.57 24.29 L-35.09 27.45 L-33.46 29.00 L-32.27 30.38 L-31.89 30.65 L-31.42 30.56 L-28.54 29.32 L-26.70 28.41Z',
    mangaDer: 'M28.17 4.80 L26.87 28.04 L29.36 29.42 L30.91 30.42 L31.71 30.79 L32.00 30.83 L32.66 30.51 L34.24 29.05 L40.27 23.10 L42.52 21.09 L42.52 20.77 L41.92 19.90 L34.95 12.08 L29.72 5.81 L28.69 4.80Z'
  },
  reverso: {
    cuerpo: 'M26.07 3.18 L24.39 2.50 L22.72 1.95 L15.44 -0.14 L14.00 -0.73 L13.48 -0.77 L11.23 -1.77 L10.71 -1.73 L8.28 -0.86 L6.21 -0.41 L3.49 -0.09 L0.95 0.05 L-2.17 0.00 L-5.80 -0.32 L-7.94 -0.73 L-8.98 -1.00 L-10.65 -1.64 L-11.29 -1.68 L-13.42 -0.73 L-14.23 -0.59 L-15.10 -0.18 L-23.93 2.50 L-25.84 3.27 L-27.74 4.41 L-27.74 4.50 L-27.45 4.59 L-26.50 27.91 L-26.50 32.77 L-26.30 35.77 L-26.24 37.91 L-26.41 41.27 L-26.47 53.59 L-26.59 54.23 L-26.70 57.32 L-26.64 60.95 L-26.88 68.73 L-26.50 70.80 Q0 71.20 26.50 70.80 L26.88 68.73 L26.64 60.95 L26.70 57.32 L26.59 54.23 L26.47 53.59 L26.41 41.27 L26.24 37.91 L26.30 35.77 L26.50 32.77 L26.50 27.73 L27.80 4.59 L27.91 4.50 L28.15 4.50 L28.15 4.41Z',
    mangaIzq: 'M-27.56 4.55 L-27.83 4.55 L-29.30 6.00 L-34.27 11.86 L-39.52 17.68 L-41.94 20.59 L-41.93 20.73 L-41.70 21.00 L-33.87 27.91 L-32.05 29.77 L-30.02 29.77 L-26.29 27.95Z',
    mangaDer: 'M27.90 4.55 L26.57 27.68 L27.49 28.09 L27.77 28.32 L29.60 29.27 L29.92 29.59 L30.29 29.77 L32.37 29.77 L35.69 26.50 L41.99 20.59 L41.99 20.41 L39.17 17.05 L34.15 11.41 L29.64 6.05 L28.18 4.55Z'
  }
};

export class MotorPoleraSVG {
  constructor() {
    const crearPath = (d) => typeof Path2D !== 'undefined' ? new Path2D(d) : d;
    this.path2d = {
      anverso: {
        cuerpo: crearPath(SVG_PATHS_PRENDA.anverso.cuerpo),
        mangaIzq: crearPath(SVG_PATHS_PRENDA.anverso.mangaIzq),
        mangaDer: crearPath(SVG_PATHS_PRENDA.anverso.mangaDer)
      },
      reverso: {
        cuerpo: crearPath(SVG_PATHS_PRENDA.reverso.cuerpo),
        mangaIzq: crearPath(SVG_PATHS_PRENDA.reverso.mangaIzq),
        mangaDer: crearPath(SVG_PATHS_PRENDA.reverso.mangaDer)
      }
    };

    if (typeof window !== 'undefined') {
      this.cargarSVGsDinamicos();
    }
  }

  /**
   * Carga los archivos SVG del servidor para auto-actualizarse si el usuario los modifica.
   */
  async cargarSVGsDinamicos() {
    try {
      const [resAnv, resRev] = await Promise.all([
        fetch('/svg/polera-anverso.svg'),
        fetch('/svg/polera-reverso.svg')
      ]);

      if (resAnv.ok) {
        const text = await resAnv.text();
        this.parsearYActualizarSVG('anverso', text);
      }
      if (resRev.ok) {
        const text = await resRev.text();
        this.parsearYActualizarSVG('reverso', text);
      }
    } catch (e) {
      // Usa las rutas vectoriales base pre-cargadas sin interrumpir
    }
  }

  parsearYActualizarSVG(vista, svgText) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const cuerpo = doc.getElementById('cuerpo')?.getAttribute('d');
      const mangaIzq = doc.getElementById('manga-izq-vista')?.getAttribute('d');
      const mangaDer = doc.getElementById('manga-der-vista')?.getAttribute('d');

      if (cuerpo && this.path2d[vista]) {
        this.path2d[vista].cuerpo = new Path2D(cuerpo);
      }
      if (mangaIzq && this.path2d[vista]) {
        this.path2d[vista].mangaIzq = new Path2D(mangaIzq);
      }
      if (mangaDer && this.path2d[vista]) {
        this.path2d[vista].mangaDer = new Path2D(mangaDer);
      }
    } catch (err) {
      console.warn('Error al parsear SVG dinámico:', err);
    }
  }

  /**
   * Obtiene los factores de escala de la silueta según la talla activa de la polera.
   * La silueta se escala anclada en (0,0): sx = ancho/53, sy = largo/71.
   * Los estampados de usuario NO usan este factor; conservan sus centímetros reales 1:1.
   */
  obtenerEscalasTalla(talla = estado.poleraActiva.tallaVista, superficie = estado.datos.superficieActiva) {
    const t = CONFIG.TALLAS_CUERPO[talla] || CONFIG.TALLAS_CUERPO.M;
    const m = CONFIG.TALLAS_MANGAS[talla] || CONFIG.TALLAS_MANGAS.M;

    const baseAncho = 53.0; // Talla M medida real en cm
    const baseLargo = 71.0; // Talla M medida real en cm

    return {
      sx: t.ancho / baseAncho,
      sy: t.largo / baseLargo,
      anchoCm: t.ancho,
      largoCm: t.largo,
      altoMangaCm: m.alto,
      bocaMangaCm: m.boca,
      unionMangaCm: m.union
    };
  }

  /**
   * Retorna los costados izquierdo y derecho en centímetros a una altura Y dada (en cm)
   * para el anverso o reverso.
   */
  obtenerCostadosCuerpoCmEnY(yCm, talla = estado.poleraActiva.tallaVista) {
    const { sx, sy, anchoCm, largoCm } = this.obtenerEscalasTalla(talla, 'anverso');
    const yClamped = Math.max(0, Math.min(largoCm, yCm));
    const semiAncho = anchoCm / 2.0;

    const axilaY = 28.0 * sy;
    if (yClamped < axilaY) {
      const factorHombro = 1.0 + (1.0 - (yClamped / axilaY)) * 0.05;
      return {
        izqCm: -semiAncho * factorHombro,
        derCm: semiAncho * factorHombro
      };
    }

    return {
      izqCm: -semiAncho,
      derCm: semiAncho
    };
  }

  /**
   * Retorna las dimensiones de la zona máxima de estampado para la superficie activa.
   */
  obtenerZonaMaximaImpresionCm(superficie = estado.datos.superficieActiva, modoManga = 'plana') {
    if (superficie === 'manga_izquierda' || superficie === 'manga_derecha') {
      const z = CONFIG.ZONAS_IMPRESION[superficie] || { ancho: 10, alto: 12, label: '10 × 12 cm' };
      if (modoManga === 'plana') {
        return {
          ancho: z.ancho,
          alto: z.alto,
          centroX: 0,
          centroY: 9.5, // Centrado en la pieza de manga plana (alto 19 cm)
          label: z.label
        };
      } else {
        const signo = superficie === 'manga_izquierda' ? 1 : -1;
        return {
          ancho: z.ancho,
          alto: z.alto,
          centroX: signo * 35.0,
          centroY: 18.0,
          label: z.label
        };
      }
    }

    const z = CONFIG.ZONAS_IMPRESION[superficie] || CONFIG.ZONAS_IMPRESION.anverso;
    return {
      ancho: z.ancho,
      alto: z.alto,
      centroX: 0,
      centroY: 28.0, // Centrado armónico sobre el pecho/espalda de 71 cm
      label: z.label
    };
  }

  /**
   * Dibuja la prenda completa en el contexto Canvas 2D en centímetros reales.
   */
  dibujarPrendaEnCanvas(ctx, superficie, colorHex, talla, mesa, modoManga = 'plana') {
    if (!mesa) return;

    ctx.save();

    // 1. Convertir origen de mundo (0,0) a píxeles de canvas
    const centroMundo = mesa.mundoACanvas(0, 0);
    const escala = mesa.pxPorCmBase * mesa.zoom;

    ctx.translate(centroMundo.cx, centroMundo.cy);
    ctx.scale(escala, escala);

    // 2. Sombra de estudio realista
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.20)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;

    const esManga = superficie === 'manga_izquierda' || superficie === 'manga_derecha';

    if (esManga && modoManga === 'plana') {
      this.dibujarMangaPlanaEnCanvas(ctx, colorHex, talla, superficie);
    } else {
      this.dibujarCuerpoEnCanvas(ctx, superficie, colorHex, talla, modoManga);
    }

    ctx.restore();
    ctx.restore();
  }

  /**
   * Renderizado vectorial preciso del cuerpo y mangas con cotas reales de 53 × 71 cm.
   */
  dibujarCuerpoEnCanvas(ctx, superficie, colorHex, talla, modoManga = 'prenda') {
    const { sx, sy } = this.obtenerEscalasTalla(talla, superficie);
    const esReverso = superficie === 'reverso';
    const esMangaIzq = superficie === 'manga_izquierda';
    const esMangaDer = superficie === 'manga_derecha';

    ctx.save();
    ctx.scale(sx, sy);

    const paths = esReverso ? this.path2d.reverso : this.path2d.anverso;

    // 1. Mangas de vista en perspectiva
    ctx.save();
    ctx.fillStyle = colorHex;
    ctx.fill(paths.mangaIzq);
    ctx.fill(paths.mangaDer);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.20)';
    ctx.lineWidth = 0.12;
    ctx.lineJoin = 'round';
    ctx.stroke(paths.mangaIzq);
    ctx.stroke(paths.mangaDer);

    // Resaltar manga seleccionada (mapeo anatómico de vista)
    // En anverso: manga visual izq es la der de quien la viste, y viceversa
    const resaltarIzqVisual = esAnverso => esAnverso ? esMangaDer : esMangaIzq;
    const resaltarDerVisual = esAnverso => esAnverso ? esMangaIzq : esMangaDer;

    if (resaltarIzqVisual(!esReverso)) {
      ctx.strokeStyle = '#BA002C';
      ctx.lineWidth = 0.35;
      ctx.stroke(paths.mangaIzq);
    } else if (resaltarDerVisual(!esReverso)) {
      ctx.strokeStyle = '#BA002C';
      ctx.lineWidth = 0.35;
      ctx.stroke(paths.mangaDer);
    }
    ctx.restore();

    // 2. Silueta del cuerpo
    ctx.save();
    ctx.fillStyle = colorHex;
    ctx.fill(paths.cuerpo);

    // Volumen suave del torso
    const gradTorso = ctx.createLinearGradient(-26.5, 0, 26.5, 0);
    gradTorso.addColorStop(0.0, 'rgba(0, 0, 0, 0.07)');
    gradTorso.addColorStop(0.2, 'rgba(255, 255, 255, 0.04)');
    gradTorso.addColorStop(0.5, 'rgba(255, 255, 255, 0.10)');
    gradTorso.addColorStop(0.8, 'rgba(255, 255, 255, 0.04)');
    gradTorso.addColorStop(1.0, 'rgba(0, 0, 0, 0.07)');
    ctx.fillStyle = gradTorso;
    ctx.fill(paths.cuerpo);

    // Contorno exterior nítido
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.20)';
    ctx.lineWidth = 0.12;
    ctx.lineJoin = 'round';
    ctx.stroke(paths.cuerpo);
    ctx.restore();

    // 3. Cuello acanalado de 1.5 cm
    this.dibujarCuelloEnCanvas(ctx, colorHex, !esReverso);

    // 4. Pespunte de confección en ruedo inferior
    ctx.beginPath();
    ctx.moveTo(-26.3, 69.4);
    ctx.quadraticCurveTo(0, 69.8, 26.3, 69.4);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.lineWidth = 0.07;
    ctx.setLineDash([0.35, 0.25]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  /**
   * Dibuja la banda de cuello acanalada (1.5 cm de ancho, abertura ~18 cm).
   * Caída interior ~8 cm en anverso y ~2 cm en reverso (medidas desde y=0).
   */
  dibujarCuelloEnCanvas(ctx, colorHex, esAnverso) {
    ctx.save();
    if (esAnverso) {
      // Fondo interior del cuello
      ctx.beginPath();
      ctx.moveTo(-9.0, -1.0);
      ctx.quadraticCurveTo(0, -2.2, 9.0, -1.0);
      ctx.quadraticCurveTo(0, 2.2, -9.0, -1.0);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
      ctx.fill();

      // Banda acanalada de cuello (1.5 cm)
      ctx.beginPath();
      ctx.moveTo(-9.0, -1.0);
      ctx.quadraticCurveTo(0, 8.0, 9.0, -1.0);
      ctx.quadraticCurveTo(9.2, 0.4, 8.2, 1.3);
      ctx.quadraticCurveTo(0, 9.5, -8.2, 1.3);
      ctx.quadraticCurveTo(-9.2, 0.4, -9.0, -1.0);
      ctx.closePath();
      ctx.fillStyle = colorHex;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.lineWidth = 0.09;
      ctx.stroke();

      // Pespunte de confección
      ctx.beginPath();
      ctx.moveTo(-8.4, 0.8);
      ctx.quadraticCurveTo(0, 8.2, 8.4, 0.8);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.lineWidth = 0.07;
      ctx.setLineDash([0.3, 0.2]);
      ctx.stroke();
    } else {
      // Cuello de espalda (caída borde interior ~2 cm)
      ctx.beginPath();
      ctx.moveTo(-9.0, -1.0);
      ctx.quadraticCurveTo(0, 2.0, 9.0, -1.0);
      ctx.quadraticCurveTo(9.1, 0.4, 8.4, 0.8);
      ctx.quadraticCurveTo(0, 3.8, -8.4, 0.8);
      ctx.quadraticCurveTo(-9.1, 0.4, -9.0, -1.0);
      ctx.closePath();
      ctx.fillStyle = colorHex;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.lineWidth = 0.09;
      ctx.stroke();

      // Pespunte de confección
      ctx.beginPath();
      ctx.moveTo(-8.4, 0.7);
      ctx.quadraticCurveTo(0, 3.6, 8.4, 0.7);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.lineWidth = 0.07;
      ctx.setLineDash([0.3, 0.2]);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Renderizado de la pieza plana paramétrica de la manga.
   * Talla M: alto 19 cm, boca 16.5 cm, unión 18.5 cm.
   */
  dibujarMangaPlanaEnCanvas(ctx, colorHex, talla, superficie) {
    const { sx, sy, altoMangaCm, bocaMangaCm, unionMangaCm } = this.obtenerEscalasTalla(talla, superficie);
    const semiUnion = (unionMangaCm || 18.5) / 2.0;
    const semiBoca = (bocaMangaCm || 16.5) / 2.0;
    const altoCm = altoMangaCm || 19.0;

    ctx.save();
    ctx.beginPath();
    // Copa superior curva
    ctx.moveTo(-semiUnion, 1.8 * sy);
    ctx.quadraticCurveTo(0, -0.4 * sy, semiUnion, 1.8 * sy);
    // Costado derecho hacia puño
    ctx.lineTo(semiBoca, altoCm);
    // Puño inferior recto
    ctx.lineTo(-semiBoca, altoCm);
    ctx.closePath();

    ctx.fillStyle = colorHex;
    ctx.fill();

    // Sombra transversal cilíndrica
    const gradManga = ctx.createLinearGradient(-semiUnion, 0, semiUnion, 0);
    gradManga.addColorStop(0.0, 'rgba(0, 0, 0, 0.07)');
    gradManga.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
    gradManga.addColorStop(0.5, 'rgba(255, 255, 255, 0.10)');
    gradManga.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
    gradManga.addColorStop(1.0, 'rgba(0, 0, 0, 0.07)');
    ctx.fillStyle = gradManga;
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.20)';
    ctx.lineWidth = 0.10;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Pespunte del dobladillo de la manga (a 2 cm del puño)
    ctx.beginPath();
    ctx.moveTo(-semiBoca + 0.15, altoCm - 2.0);
    ctx.lineTo(semiBoca - 0.15, altoCm - 2.0);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 0.07;
    ctx.setLineDash([0.35, 0.25]);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Traza el contorno de recorte para los estampados sobre la prenda.
   */
  trazarContornoRecorte(ctx, superficie, talla, modoManga = 'plana') {
    if ((superficie === 'manga_izquierda' || superficie === 'manga_derecha') && modoManga === 'plana') {
      const { altoMangaCm, bocaMangaCm, unionMangaCm, sy } = this.obtenerEscalasTalla(talla, superficie);
      const semiUnion = (unionMangaCm || 18.5) / 2.0;
      const semiBoca = (bocaMangaCm || 16.5) / 2.0;
      const altoCm = altoMangaCm || 19.0;
      ctx.beginPath();
      ctx.moveTo(-semiUnion, 1.8 * sy);
      ctx.quadraticCurveTo(0, -0.4 * sy, semiUnion, 1.8 * sy);
      ctx.lineTo(semiBoca, altoCm);
      ctx.lineTo(-semiBoca, altoCm);
      ctx.closePath();
      return;
    }

    const { sx, sy } = this.obtenerEscalasTalla(talla, superficie);
    const esAnverso = superficie === 'anverso';

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(25.76 * sx, 3.07 * sy);
    ctx.lineTo(11.39 * sx, -1.56 * sy);
    if (esAnverso) {
      ctx.quadraticCurveTo(0, 8.0 * sy, -9.0 * sx, -1.0 * sy);
    } else {
      ctx.quadraticCurveTo(0, 2.0 * sy, -9.0 * sx, -1.0 * sy);
    }
    ctx.lineTo(-28.01 * sx, 4.67 * sy);
    ctx.lineTo(-26.50 * sx, 70.80 * sy);
    ctx.quadraticCurveTo(0, 71.20 * sy, 26.50 * sx, 70.80 * sy);
    ctx.lineTo(28.07 * sx, 4.85 * sy);
    ctx.closePath();
    ctx.restore();
  }
}

export const motorPoleraSVG = new MotorPoleraSVG();
