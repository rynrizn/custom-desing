/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Motor de Geometría y Renderizado Polera SVG
 * ============================================================================
 * Provee las siluetas vectoriales paramétricas en centímetros reales (Talla M base: 53x71 cm),
 * matrices de escala por talla (sx = ancho/53, sy = largo/71), cuellos, sombras y trazados.
 */

import { CONFIG } from './config.js';
import { estado } from './estado.js';

export class MotorPoleraSVG {
  constructor() {
    this.cacheSVG = {};
  }

  /**
   * Obtiene los factores de escala de la silueta según la talla activa de la polera.
   * Los diseños de usuario NO usan este factor; conservan sus centímetros reales 1:1.
   */
  obtenerEscalasTalla(talla = estado.poleraActiva.tallaVista, superficie = estado.datos.superficieActiva) {
    const t = CONFIG.TALLAS_CUERPO[talla] || CONFIG.TALLAS_CUERPO.M;
    const m = CONFIG.TALLAS_MANGAS[talla] || CONFIG.TALLAS_MANGAS.M;

    return {
      sx: t.ancho / CONFIG.TALLAS_CUERPO.M.ancho, // 53 cm base
      sy: t.largo / CONFIG.TALLAS_CUERPO.M.largo,  // 71 cm base
      anchoCm: t.ancho,
      largoCm: t.largo,
      // Dimensiones de manga
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
      const factorHombro = 1.0 + (1.0 - (yClamped / axilaY)) * 0.06;
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
  obtenerZonaMaximaImpresionCm(superficie = estado.datos.superficieActiva, modoManga = 'prenda') {
    if (superficie === 'manga_izquierda' || superficie === 'manga_derecha') {
      const z = CONFIG.ZONAS_IMPRESION[superficie] || { ancho: 10, alto: 12, label: '10 × 12 cm' };
      if (modoManga === 'plana') {
        return {
          ancho: z.ancho,
          alto: z.alto,
          centroX: 0,
          centroY: 9.5,
          label: z.label
        };
      } else {
        // En vista de polera, colocada sobre la manga anatómica
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
      centroY: 28.0, // centrado vertical en pecho/espalda (de y=8 a y=48)
      label: z.label
    };
  }

  /**
   * Dibuja la prenda completa en el contexto Canvas 2D en centímetros reales.
   * Aplica la traslación y escala del mundo desde la instancia de mesa de trabajo.
   */
  dibujarPrendaEnCanvas(ctx, superficie, colorHex, talla, mesa, modoManga = 'prenda') {
    if (!mesa) return;

    ctx.save();

    // 1. Convertir origen de mundo (0,0) a píxeles de canvas
    const centroMundo = mesa.mundoACanvas(0, 0);
    const escala = mesa.pxPorCmBase * mesa.zoom;

    ctx.translate(centroMundo.cx, centroMundo.cy);
    ctx.scale(escala, escala);

    // 2. Sombra de estudio realista para que la prenda destaque claramente del fondo
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;

    if ((superficie === 'manga_izquierda' || superficie === 'manga_derecha') && modoManga === 'plana') {
      this.dibujarMangaPlanaEnCanvas(ctx, colorHex, talla, superficie);
    } else {
      // Dibuja la silueta de polera completa (anverso o reverso)
      this.dibujarCuerpoEnCanvas(ctx, superficie, colorHex, talla, modoManga);
    }

    ctx.restore();
    ctx.restore();
  }

  /**
   * Renderizado vectorial preciso del cuerpo y mangas en Canvas.
   */
  dibujarCuerpoEnCanvas(ctx, superficie, colorHex, talla, modoManga = 'prenda') {
    const { sx, sy } = this.obtenerEscalasTalla(talla, superficie);
    const esReverso = superficie === 'reverso';
    const esMangaIzq = superficie === 'manga_izquierda';
    const esMangaDer = superficie === 'manga_derecha';

    ctx.save();
    ctx.scale(sx, sy);

    // 1. Mangas de vista en perspectiva
    this.dibujarMangasVistaPerspectiva(ctx, colorHex, !esReverso, esMangaIzq, esMangaDer);

    // 2. Silueta del cuerpo
    ctx.beginPath();
    // Hombro derecho hacia cuello
    ctx.moveTo(25.76, 3.96);
    ctx.lineTo(22.21, 2.43);
    ctx.lineTo(16.24, 0.18);
    ctx.lineTo(14.70, -0.59);
    ctx.lineTo(13.40, -1.01);
    ctx.lineTo(11.39, -2.01);

    // Escote del cuello (anverso o reverso)
    if (!esReverso) {
      ctx.quadraticCurveTo(0, 7.8, -9.0, -1.2);
    } else {
      ctx.quadraticCurveTo(0, 2.2, -9.0, -1.2);
    }

    // Hombro izquierdo
    ctx.lineTo(-11.09, -1.95);
    ctx.lineTo(-12.92, -1.01);
    ctx.lineTo(-14.23, -0.59);
    ctx.lineTo(-16.47, 0.47);
    ctx.lineTo(-24.05, 3.31);
    ctx.lineTo(-25.94, 4.38);
    ctx.lineTo(-28.01, 6.03);
    ctx.lineTo(-27.71, 6.27);

    // Sisa y costado izquierdo
    ctx.lineTo(-26.65, 36.61);
    ctx.lineTo(-26.23, 36.50);
    ctx.lineTo(-26.06, 36.79);
    ctx.lineTo(-26.12, 41.29);
    ctx.lineTo(-26.53, 47.62);
    ctx.lineTo(-26.65, 52.47);
    ctx.lineTo(-26.47, 63.29);
    ctx.lineTo(-26.50, 71.0);

    // Ruedo inferior suavizado (curva limpia a y=71 cm)
    ctx.quadraticCurveTo(0, 71.35, 26.50, 71.0);

    // Costado y sisa derecho
    ctx.lineTo(26.47, 67.67);
    ctx.lineTo(26.41, 51.34);
    ctx.lineTo(25.94, 38.63);
    ctx.lineTo(25.94, 36.02);
    ctx.lineTo(26.17, 35.85);
    ctx.lineTo(26.65, 36.14);
    ctx.lineTo(26.83, 36.08);
    ctx.lineTo(28.07, 6.27);
    ctx.lineTo(28.66, 6.03);
    ctx.lineTo(27.48, 5.09);
    ctx.closePath();

    // Relleno principal de tela
    ctx.fillStyle = colorHex;
    ctx.fill();

    // Volumen suave del torso
    const gradTorso = ctx.createLinearGradient(-26.5, 0, 26.5, 0);
    gradTorso.addColorStop(0.0, 'rgba(0, 0, 0, 0.08)');
    gradTorso.addColorStop(0.2, 'rgba(255, 255, 255, 0.04)');
    gradTorso.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
    gradTorso.addColorStop(0.8, 'rgba(255, 255, 255, 0.04)');
    gradTorso.addColorStop(1.0, 'rgba(0, 0, 0, 0.08)');
    ctx.fillStyle = gradTorso;
    ctx.fill();

    // Contorno exterior
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 0.14;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 3. Cuello acanalado
    this.dibujarCuelloEnCanvas(ctx, colorHex, !esReverso);

    // 4. Pespunte de confección en ruedo
    ctx.beginPath();
    ctx.moveTo(-26.2, 68.8);
    ctx.quadraticCurveTo(0, 69.15, 26.2, 68.8);
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
    ctx.save();
    ctx.fillStyle = colorHex;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.20)';
    ctx.lineWidth = 0.14;
    ctx.lineJoin = 'round';

    // Manga Izquierda vista
    ctx.beginPath();
    ctx.moveTo(-27.83, 6.21);
    ctx.lineTo(-30.32, 8.46);
    ctx.lineTo(-35.58, 14.61);
    ctx.lineTo(-43.74, 23.60);
    ctx.lineTo(-46.35, 26.85);
    ctx.lineTo(-46.29, 27.15);
    ctx.lineTo(-41.49, 31.41);
    ctx.lineTo(-37.18, 35.49);
    ctx.lineTo(-35.17, 37.50);
    ctx.lineTo(-33.69, 39.28);
    ctx.lineTo(-29.01, 37.92);
    ctx.lineTo(-26.71, 36.73);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sombra de sisa izquierda
    const gradSombraIzq = ctx.createLinearGradient(-26, 6, -46, 38);
    gradSombraIzq.addColorStop(0.0, 'rgba(0, 0, 0, 0.16)');
    gradSombraIzq.addColorStop(0.7, 'rgba(0, 0, 0, 0.03)');
    gradSombraIzq.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = gradSombraIzq;
    ctx.fill();

    if (destacarIzq) {
      ctx.strokeStyle = '#BA002C'; // Resaltar borde de manga activa
      ctx.lineWidth = 0.25;
      ctx.stroke();
    }

    // Manga Derecha vista
    ctx.beginPath();
    ctx.moveTo(28.19, 6.21);
    ctx.lineTo(26.88, 36.26);
    ctx.lineTo(30.02, 38.03);
    ctx.lineTo(31.97, 39.34);
    ctx.lineTo(33.33, 39.87);
    ctx.lineTo(36.11, 37.56);
    ctx.lineTo(43.57, 29.87);
    ctx.lineTo(46.35, 27.27);
    ctx.lineTo(46.35, 26.85);
    ctx.lineTo(45.58, 25.73);
    ctx.lineTo(36.76, 15.62);
    ctx.lineTo(30.14, 7.51);
    ctx.lineTo(28.84, 6.21);
    ctx.closePath();
    ctx.fillStyle = colorHex;
    ctx.fill();
    ctx.stroke();

    // Sombra de sisa derecha
    const gradSombraDer = ctx.createLinearGradient(26, 6, 46, 38);
    gradSombraDer.addColorStop(0.0, 'rgba(0, 0, 0, 0.16)');
    gradSombraDer.addColorStop(0.7, 'rgba(0, 0, 0, 0.03)');
    gradSombraDer.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = gradSombraDer;
    ctx.fill();

    if (destacarDer) {
      ctx.strokeStyle = '#BA002C'; // Resaltar borde de manga activa
      ctx.lineWidth = 0.25;
      ctx.stroke();
    }

    ctx.restore();
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
