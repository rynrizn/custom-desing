/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Motor de Geometría y Renderizado Polera SVG
 * ============================================================================
 * Renderiza fielmente las siluetas vectoriales SVG alargadas (Talla M base: 53 x 91.5 cm),
 * con escalado paramétrico, cuellos, mangas y carga dinámica desde archivos SVG.
 */

import { CONFIG } from './config.js';
import { estado } from './estado.js';

// Siluetas vectoriales extraídas directamente de los archivos SVG del proyecto
export const SVG_PATHS_PRENDA = {
  anverso: {
    cuerpo: 'M25.76 3.96 L22.21 2.43 L16.24 0.18 L14.70 -0.59 L13.40 -1.01 L11.39 -2.01 L10.97 -1.95 L9.79 -1.18 L8.72 -0.65 L6.54 0.12 L3.40 0.65 L0.62 0.83 L-2.45 0.71 L-5.65 0.18 L-8.43 -0.71 L-10.44 -1.77 L-11.09 -1.95 L-12.92 -1.01 L-14.23 -0.59 L-16.47 0.47 L-24.05 3.31 L-25.94 4.38 L-28.01 6.03 L-28.01 6.15 L-27.71 6.27 L-26.65 36.61 L-26.23 36.50 L-26.06 36.79 L-26.12 41.29 L-26.53 47.62 L-26.65 52.47 L-26.47 63.29 L-26.65 71.57 L-26.71 88.02 L-26.53 90.68 L-26.29 91.21 L-24.99 91.45 L-21.62 91.57 L-19.73 91.74 L-15.35 91.74 L-13.58 91.51 L-11.68 91.09 L-8.61 89.97 L-7.42 89.73 L-6.12 89.61 L0.92 89.61 L6.77 89.85 L8.02 90.09 L11.21 91.09 L13.93 91.63 L15.17 91.63 L18.01 91.39 L22.33 91.39 L23.75 91.57 L25.70 91.51 L26.06 91.33 L26.23 90.62 L26.35 87.60 L26.29 74.35 L26.47 67.67 L26.41 51.34 L25.94 38.63 L25.94 36.02 L26.17 35.85 L26.65 36.14 L26.83 36.08 L28.07 6.27 L28.19 6.15 L28.66 6.15 L28.66 6.03 L27.48 5.09Z',
    mangaIzq: 'M-27.83 6.21 L-28.13 6.21 L-30.32 8.46 L-35.58 14.61 L-43.74 23.60 L-46.35 26.85 L-46.29 27.15 L-41.49 31.41 L-37.18 35.49 L-35.17 37.50 L-33.69 39.28 L-33.21 39.63 L-32.62 39.51 L-29.01 37.92 L-26.71 36.73Z',
    mangaDer: 'M28.19 6.21 L26.88 36.26 L30.02 38.03 L31.97 39.34 L32.98 39.81 L33.33 39.87 L34.16 39.45 L36.11 37.56 L43.57 29.87 L46.35 27.27 L46.35 26.85 L45.58 25.73 L36.76 15.62 L30.14 7.51 L28.84 6.21Z'
  },
  reverso: {
    cuerpo: 'M26.07 4.04 L24.39 3.18 L22.72 2.48 L15.44 -0.17 L14.00 -0.92 L13.48 -0.98 L11.23 -2.25 L10.71 -2.19 L8.28 -1.10 L6.21 -0.52 L3.49 -0.12 L0.95 0.06 L-2.17 0.00 L-5.80 -0.40 L-7.94 -0.92 L-8.98 -1.27 L-10.65 -2.08 L-11.29 -2.14 L-13.42 -0.92 L-14.23 -0.75 L-15.10 -0.23 L-23.93 3.18 L-25.84 4.16 L-27.74 5.60 L-27.74 5.72 L-27.45 5.83 L-26.24 35.45 L-26.07 35.56 L-26.07 41.63 L-26.30 45.44 L-26.24 48.15 L-26.41 52.42 L-26.47 68.07 L-26.59 68.88 L-26.70 72.80 L-26.64 77.42 L-26.88 87.29 L-26.76 89.55 L-26.53 89.78 L-25.84 89.89 L-21.51 90.07 L-12.73 90.18 L-10.36 90.01 L-6.73 89.37 L-4.30 89.14 L5.92 89.43 L8.46 89.60 L10.94 89.95 L13.65 90.18 L17.41 90.12 L20.93 89.89 L25.26 89.95 L26.76 89.83 L26.99 89.60 L27.11 87.99 L27.11 78.35 L26.88 72.57 L26.93 63.33 L26.82 57.73 L26.70 56.58 L26.70 51.44 L26.47 48.09 L26.47 42.72 L26.30 36.03 L26.36 35.22 L26.53 34.99 L27.80 5.83 L27.91 5.72 L28.15 5.72 L28.15 5.60Z',
    mangaIzq: 'M-27.57 5.77 L-27.91 5.77 L-29.76 7.62 L-36.06 15.07 L-42.69 22.46 L-45.75 26.15 L-45.75 26.33 L-45.47 26.67 L-35.77 35.45 L-33.51 37.82 L-30.97 37.82 L-26.30 35.51Z',
    mangaDer: 'M27.91 5.77 L26.59 35.16 L27.74 35.68 L28.09 35.97 L30.40 37.18 L30.80 37.58 L31.26 37.82 L33.86 37.82 L37.96 33.66 L45.75 26.15 L45.75 25.92 L42.17 21.65 L35.82 14.49 L30.11 7.68 L28.26 5.77Z'
  }
};

export class MotorPoleraSVG {
  constructor() {
    this.path2d = {
      anverso: {
        cuerpo: new Path2D(SVG_PATHS_PRENDA.anverso.cuerpo),
        mangaIzq: new Path2D(SVG_PATHS_PRENDA.anverso.mangaIzq),
        mangaDer: new Path2D(SVG_PATHS_PRENDA.anverso.mangaDer)
      },
      reverso: {
        cuerpo: new Path2D(SVG_PATHS_PRENDA.reverso.cuerpo),
        mangaIzq: new Path2D(SVG_PATHS_PRENDA.reverso.mangaIzq),
        mangaDer: new Path2D(SVG_PATHS_PRENDA.reverso.mangaDer)
      }
    };

    this.cargarSVGsDinamicos();
  }

  /**
   * Intenta cargar los archivos SVG del servidor para auto-actualizarse si el usuario los modifica.
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
   * Los diseños de usuario NO usan este factor; conservan sus centímetros reales 1:1.
   */
  obtenerEscalasTalla(talla = estado.poleraActiva.tallaVista, superficie = estado.datos.superficieActiva) {
    const t = CONFIG.TALLAS_CUERPO[talla] || CONFIG.TALLAS_CUERPO.M;
    const m = CONFIG.TALLAS_MANGAS[talla] || CONFIG.TALLAS_MANGAS.M;

    const baseAncho = CONFIG.TALLAS_CUERPO.M.ancho; // 53 cm base
    const baseLargo = CONFIG.TALLAS_CUERPO.M.largo; // 91.5 cm base alargada

    return {
      sx: t.ancho / baseAncho,
      sy: t.largo / baseLargo,
      anchoCm: t.ancho,
      largoCm: t.largo,
      // Dimensiones de manga plana
      altoMangaCm: m.alto,
      bocaMangaCm: m.boca,
      unionMangaCm: m.union
    };
  }

  /**
   * Retorna los costados izquierdo y derecho en centímetros a una altura Y dada (en cm)
   * para el anverso o reverso. Esencial para calcular el dobladillo lateral (envolvente).
   */
  obtenerCostadosCuerpoCmEnY(yCm, talla = estado.poleraActiva.tallaVista) {
    const { sx, sy, anchoCm, largoCm } = this.obtenerEscalasTalla(talla, 'anverso');
    const yClamped = Math.max(0, Math.min(largoCm, yCm));
    const semiAncho = anchoCm / 2.0;

    const axilaY = 36.0 * sy;
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
          centroY: 9.5, // Centrado perfecto en la manga plana (alto 19 cm)
          label: z.label
        };
      } else {
        const signo = superficie === 'manga_izquierda' ? -1 : 1;
        return {
          ancho: z.ancho,
          alto: z.alto,
          centroX: signo * 36.5,
          centroY: 22.5,
          label: z.label
        };
      }
    }

    const z = CONFIG.ZONAS_IMPRESION[superficie] || CONFIG.ZONAS_IMPRESION.anverso;
    return {
      ancho: z.ancho,
      alto: z.alto,
      centroX: 0,
      centroY: 34.0, // Centrado armónico sobre el torso alargado de 91.5 cm
      label: z.label
    };
  }

  /**
   * Dibuja la prenda completa en el contexto Canvas 2D en centímetros reales.
   * Aplica la traslación y escala del mundo desde la instancia de mesa de trabajo.
   */
  dibujarPrendaEnCanvas(ctx, superficie, colorHex, talla, mesa, modoManga = 'plana') {
    if (!mesa) return;

    ctx.save();

    // 1. Convertir origen de mundo (0,0) a píxeles de canvas
    const centroMundo = mesa.mundoACanvas(0, 0);
    const escala = mesa.pxPorCmBase * mesa.zoom;

    ctx.translate(centroMundo.cx, centroMundo.cy);
    ctx.scale(escala, escala);

    // 2. Sombra de estudio realista para destacar la prenda del fondo
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;

    const esManga = superficie === 'manga_izquierda' || superficie === 'manga_derecha';

    if (esManga && modoManga === 'plana') {
      this.dibujarMangaPlanaEnCanvas(ctx, colorHex, talla, superficie);
    } else {
      // Dibuja la silueta de polera completa (anverso o reverso) con la nueva longitud de 91.5 cm
      this.dibujarCuerpoEnCanvas(ctx, superficie, colorHex, talla, modoManga);
    }

    ctx.restore();
    ctx.restore();
  }

  /**
   * Renderizado vectorial preciso del cuerpo y mangas usando los trazados del SVG alargado.
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

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 0.14;
    ctx.lineJoin = 'round';
    ctx.stroke(paths.mangaIzq);
    ctx.stroke(paths.mangaDer);

    // Resaltar manga si es la superficie seleccionada
    if (esMangaIzq) {
      ctx.strokeStyle = '#BA002C';
      ctx.lineWidth = 0.40;
      ctx.stroke(paths.mangaIzq);
    } else if (esMangaDer) {
      ctx.strokeStyle = '#BA002C';
      ctx.lineWidth = 0.40;
      ctx.stroke(paths.mangaDer);
    }
    ctx.restore();

    // 2. Silueta del cuerpo alargado
    ctx.save();
    ctx.fillStyle = colorHex;
    ctx.fill(paths.cuerpo);

    // Volumen suave del torso
    const gradTorso = ctx.createLinearGradient(-26.5, 0, 26.5, 0);
    gradTorso.addColorStop(0.0, 'rgba(0, 0, 0, 0.08)');
    gradTorso.addColorStop(0.2, 'rgba(255, 255, 255, 0.04)');
    gradTorso.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
    gradTorso.addColorStop(0.8, 'rgba(255, 255, 255, 0.04)');
    gradTorso.addColorStop(1.0, 'rgba(0, 0, 0, 0.08)');
    ctx.fillStyle = gradTorso;
    ctx.fill(paths.cuerpo);

    // Contorno exterior nítido
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 0.14;
    ctx.lineJoin = 'round';
    ctx.stroke(paths.cuerpo);
    ctx.restore();

    // 3. Cuello acanalado
    this.dibujarCuelloEnCanvas(ctx, colorHex, !esReverso);

    // 4. Pespunte de confección en ruedo
    ctx.beginPath();
    ctx.moveTo(-26.2, 88.5);
    ctx.quadraticCurveTo(0, 88.8, 26.2, 88.5);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.lineWidth = 0.08;
    ctx.setLineDash([0.35, 0.25]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  /**
   * Mangas de vista en perspectiva lateral sobre la polera.
   */
  dibujarMangasVistaPerspectiva(ctx, colorHex, esAnverso, destacarIzq = false, destacarDer = false) {
    // Implementado con Path2D directo en dibujarCuerpoEnCanvas
  }

  /**
   * Dibuja la banda de cuello acanalada con acabado formal.
   */
  dibujarCuelloEnCanvas(ctx, colorHex, esAnverso) {
    ctx.save();
    if (esAnverso) {
      // Fondo interior del cuello
      ctx.beginPath();
      ctx.moveTo(-9.0, -1.2);
      ctx.quadraticCurveTo(0, -2.4, 9.0, -1.2);
      ctx.quadraticCurveTo(0, 2.2, -9.0, -1.2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
      ctx.fill();

      // Banda de cuello (1.5 cm)
      ctx.beginPath();
      ctx.moveTo(-9.0, -1.2);
      ctx.quadraticCurveTo(0, 7.8, 9.0, -1.2);
      ctx.quadraticCurveTo(9.2, 0.3, 8.3, 1.2);
      ctx.quadraticCurveTo(0, 9.4, -8.3, 1.2);
      ctx.quadraticCurveTo(-9.2, 0.3, -9.0, -1.2);
      ctx.closePath();
      ctx.fillStyle = colorHex;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 0.10;
      ctx.stroke();

      // Pespunte
      ctx.beginPath();
      ctx.moveTo(-8.8, 0.1);
      ctx.quadraticCurveTo(0, 8.0, 8.8, 0.1);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.lineWidth = 0.08;
      ctx.setLineDash([0.3, 0.2]);
      ctx.stroke();
    } else {
      // Cuello de espalda
      ctx.beginPath();
      ctx.moveTo(-9.0, -1.2);
      ctx.quadraticCurveTo(0, 2.2, 9.0, -1.2);
      ctx.quadraticCurveTo(9.1, 0.4, 8.5, 0.7);
      ctx.quadraticCurveTo(0, 3.8, -8.5, 0.7);
      ctx.quadraticCurveTo(-9.1, 0.4, -9.0, -1.2);
      ctx.closePath();
      ctx.fillStyle = colorHex;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 0.10;
      ctx.stroke();

      // Pespunte
      ctx.beginPath();
      ctx.moveTo(-8.8, 0.6);
      ctx.quadraticCurveTo(0, 3.7, 8.8, 0.6);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.lineWidth = 0.08;
      ctx.setLineDash([0.3, 0.2]);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Renderizado de la pieza plana paramétrica de la manga.
   */
  dibujarMangaPlanaEnCanvas(ctx, colorHex, talla, superficie) {
    const { sx, sy, altoMangaCm, bocaMangaCm, unionMangaCm } = this.obtenerEscalasTalla(talla, superficie);
    const semiUnion = (unionMangaCm || 18.5) / 2.0;
    const semiBoca = (bocaMangaCm || 16.5) / 2.0;
    const altoCm = altoMangaCm || 19.0;

    ctx.save();
    ctx.beginPath();
    // Copa superior ligeramente curva
    ctx.moveTo(-semiUnion, 1.8 * sy);
    ctx.quadraticCurveTo(0, -0.4 * sy, semiUnion, 1.8 * sy);
    // Costado derecho hacia puño
    ctx.lineTo(semiBoca, altoCm);
    // Puño inferior recto
    ctx.lineTo(-semiBoca, altoCm);
    ctx.closePath();

    ctx.fillStyle = colorHex;
    ctx.fill();

    // Sombra transversal de volumen cilíndrico
    const gradManga = ctx.createLinearGradient(-semiUnion, 0, semiUnion, 0);
    gradManga.addColorStop(0.0, 'rgba(0, 0, 0, 0.07)');
    gradManga.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
    gradManga.addColorStop(0.5, 'rgba(255, 255, 255, 0.10)');
    gradManga.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
    gradManga.addColorStop(1.0, 'rgba(0, 0, 0, 0.07)');
    ctx.fillStyle = gradManga;
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 0.10;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Pespunte del dobladillo de la manga (a 2 cm del puño)
    ctx.beginPath();
    ctx.moveTo(-semiBoca + 0.15, altoCm - 2.0);
    ctx.lineTo(semiBoca - 0.15, altoCm - 2.0);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 0.08;
    ctx.setLineDash([0.35, 0.25]);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Traza el contorno de recorte para los estampados.
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
    const esReverso = superficie === 'reverso';
    const paths = esReverso ? this.path2d.reverso : this.path2d.anverso;

    // Con Path2D, el recorte se puede aplicar directamente si se desea
  }
}

export const motorPoleraSVG = new MotorPoleraSVG();

  /**
   * Dibuja la banda de cuello acanalada con acabado formal.
   */
  dibujarCuelloEnCanvas(ctx, colorHex, esAnverso) {
    ctx.save();
    if (esAnverso) {
      // Fondo interior del cuello
      ctx.beginPath();
      ctx.moveTo(-9.0, -1.2);
      ctx.quadraticCurveTo(0, -2.4, 9.0, -1.2);
      ctx.quadraticCurveTo(0, 2.2, -9.0, -1.2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
      ctx.fill();

      // Banda de cuello (1.5 cm)
      ctx.beginPath();
      ctx.moveTo(-9.0, -1.2);
      ctx.quadraticCurveTo(0, 7.8, 9.0, -1.2);
      ctx.quadraticCurveTo(9.2, 0.3, 8.3, 1.2);
      ctx.quadraticCurveTo(0, 9.4, -8.3, 1.2);
      ctx.quadraticCurveTo(-9.2, 0.3, -9.0, -1.2);
      ctx.closePath();
      ctx.fillStyle = colorHex;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 0.10;
      ctx.stroke();

      // Pespunte
      ctx.beginPath();
      ctx.moveTo(-8.8, 0.1);
      ctx.quadraticCurveTo(0, 8.0, 8.8, 0.1);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.lineWidth = 0.08;
      ctx.setLineDash([0.3, 0.2]);
      ctx.stroke();
    } else {
      // Cuello de espalda
      ctx.beginPath();
      ctx.moveTo(-9.0, -1.2);
      ctx.quadraticCurveTo(0, 2.2, 9.0, -1.2);
      ctx.quadraticCurveTo(9.1, 0.4, 8.5, 0.7);
      ctx.quadraticCurveTo(0, 3.8, -8.5, 0.7);
      ctx.quadraticCurveTo(-9.1, 0.4, -9.0, -1.2);
      ctx.closePath();
      ctx.fillStyle = colorHex;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 0.10;
      ctx.stroke();

      // Pespunte
      ctx.beginPath();
      ctx.moveTo(-8.8, 0.6);
      ctx.quadraticCurveTo(0, 3.7, 8.8, 0.6);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.lineWidth = 0.08;
      ctx.setLineDash([0.3, 0.2]);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Renderizado de la pieza plana paramétrica de la manga.
   */
  dibujarMangaPlanaEnCanvas(ctx, colorHex, talla, superficie) {
    const { sx, sy, altoMangaCm, bocaMangaCm, unionMangaCm } = this.obtenerEscalasTalla(talla, superficie);
    const semiUnion = (unionMangaCm || 18.5) / 2.0;
    const semiBoca = (bocaMangaCm || 16.5) / 2.0;
    const altoCm = altoMangaCm || 19.0;

    ctx.save();
    ctx.beginPath();
    // Copa superior ligeramente curva
    ctx.moveTo(-semiUnion, 1.8 * sy);
    ctx.quadraticCurveTo(0, -0.4 * sy, semiUnion, 1.8 * sy);
    // Costado derecho hacia puño
    ctx.lineTo(semiBoca, altoCm);
    // Puño inferior recto
    ctx.lineTo(-semiBoca, altoCm);
    ctx.closePath();

    ctx.fillStyle = colorHex;
    ctx.fill();

    // Sombra transversal de volumen cilíndrico
    const gradManga = ctx.createLinearGradient(-semiUnion, 0, semiUnion, 0);
    gradManga.addColorStop(0.0, 'rgba(0, 0, 0, 0.07)');
    gradManga.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
    gradManga.addColorStop(0.5, 'rgba(255, 255, 255, 0.10)');
    gradManga.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
    gradManga.addColorStop(1.0, 'rgba(0, 0, 0, 0.07)');
    ctx.fillStyle = gradManga;
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 0.10;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Pespunte del dobladillo de la manga (a 2 cm del puño)
    ctx.beginPath();
    ctx.moveTo(-semiBoca + 0.15, altoCm - 2.0);
    ctx.lineTo(semiBoca - 0.15, altoCm - 2.0);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 0.08;
    ctx.setLineDash([0.35, 0.25]);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Traza el contorno de recorte para los estampados.
   */
  trazarContornoRecorte(ctx, superficie, talla, modoManga = 'prenda') {
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
    ctx.moveTo(25.76 * sx, 3.96 * sy);
    ctx.lineTo(11.39 * sx, -2.01 * sy);
    if (esAnverso) {
      ctx.quadraticCurveTo(0, 7.8 * sy, -9.0 * sx, -1.2 * sy);
    } else {
      ctx.quadraticCurveTo(0, 2.2 * sy, -9.0 * sx, -1.2 * sy);
    }
    ctx.lineTo(-28.01 * sx, 6.03 * sy);
    ctx.lineTo(-26.50 * sx, 71.0 * sy);
    ctx.quadraticCurveTo(0, 71.35 * sy, 26.50 * sx, 71.0 * sy);
    ctx.lineTo(28.07 * sx, 6.27 * sy);
    ctx.closePath();
    ctx.restore();
  }
}

export const motorPoleraSVG = new MotorPoleraSVG();
