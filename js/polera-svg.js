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
    this.cacheImagenesSVG = {};
  }

  /**
   * Obtiene los factores de escala de la silueta según la talla activa de la polera.
   * Los diseños de usuario NO usan este factor; conservan sus centímetros reales 1:1.
   */
  obtenerEscalasTalla(talla = estado.poleraActiva.tallaVista, superficie = estado.datos.superficieActiva) {
    if (superficie === 'manga_izquierda' || superficie === 'manga_derecha') {
      const dim = CONFIG.TALLAS_MANGAS[talla] || CONFIG.TALLAS_MANGAS.M;
      return {
        sx: dim.union / CONFIG.TALLAS_MANGAS.M.union,
        sy: dim.alto / CONFIG.TALLAS_MANGAS.M.alto,
        altoCm: dim.alto,
        bocaCm: dim.boca,
        unionCm: dim.union
      };
    }

    const t = CONFIG.TALLAS_CUERPO[talla] || CONFIG.TALLAS_CUERPO.M;
    return {
      sx: t.ancho / CONFIG.TALLAS_CUERPO.M.ancho, // 53 cm base
      sy: t.largo / CONFIG.TALLAS_CUERPO.M.largo,  // 71 cm base
      anchoCm: t.ancho,
      largoCm: t.largo
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

    // Axila a ~36 cm de altura
    const axilaY = 36.0 * sy;
    if (yClamped < axilaY) {
      // Zona superior axila-hombro: ensanchamiento gradual hacia la manga
      const factorHombro = 1.0 + (1.0 - (yClamped / axilaY)) * 0.06;
      return {
        izqCm: -semiAncho * factorHombro,
        derCm: semiAncho * factorHombro
      };
    }

    // Del pecho al ruedo el cuerpo es recto con caída natural
    return {
      izqCm: -semiAncho,
      derCm: semiAncho
    };
  }

  /**
   * Retorna las dimensiones de la zona máxima de estampado para la superficie activa.
   */
  obtenerZonaMaximaImpresionCm(superficie = estado.datos.superficieActiva) {
    return CONFIG.ZONAS_IMPRESION[superficie] || CONFIG.ZONAS_IMPRESION.anverso;
  }

  /**
   * Dibuja la prenda completa en el contexto Canvas 2D en centímetros reales.
   * La prenda se dibuja centrada en x=0, con y=0 en la cúspide del hombro.
   */
  dibujarPrendaEnCanvas(ctx, superficie, colorHex, talla, alpha = 1.0) {
    ctx.save();
    ctx.globalAlpha = alpha;

    if (superficie === 'manga_izquierda' || superficie === 'manga_derecha') {
      this.dibujarMangaPlanaEnCanvas(ctx, colorHex, talla, superficie);
    } else {
      this.dibujarCuerpoEnCanvas(ctx, superficie, colorHex, talla);
    }

    ctx.restore();
  }

  /**
   * Renderizado vectorial preciso del cuerpo (Anverso / Reverso) en Canvas.
   */
  dibujarCuerpoEnCanvas(ctx, superficie, colorHex, talla) {
    const { sx, sy, anchoCm, largoCm } = this.obtenerEscalasTalla(talla, superficie);
    const esAnverso = superficie === 'anverso';

    ctx.save();
    // Escalar la prenda según la talla sin deformar los diseños
    ctx.scale(sx, sy);

    // 1. Mangas de vista en perspectiva
    this.dibujarMangasVistaPerspectiva(ctx, colorHex, esAnverso);

    // 2. Silueta del cuerpo
    ctx.beginPath();
    // Hombro derecho hacia cuello
    ctx.moveTo(25.76, 3.96);
    ctx.lineTo(22.21, 2.43);
    ctx.lineTo(16.24, 0.18);
    ctx.lineTo(14.70, -0.59);
    ctx.lineTo(13.40, -1.01);
    ctx.lineTo(11.39, -2.01);

    // Escote del cuello
    if (esAnverso) {
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

    // Sisa izquierda
    ctx.lineTo(-26.65, 36.61);
    ctx.lineTo(-26.23, 36.50);
    ctx.lineTo(-26.06, 36.79);
    ctx.lineTo(-26.12, 41.29);
    ctx.lineTo(-26.53, 47.62);
    ctx.lineTo(-26.65, 52.47);
    ctx.lineTo(-26.47, 63.29);
    ctx.lineTo(-26.50, 71.0);

    // Ruedo inferior suavizado (curva suave a y=71 cm exactos)
    ctx.quadraticCurveTo(0, 71.35, 26.50, 71.0);

    // Costado derecho hacia sisa derecha
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

    // Relleno de color de la prenda
    ctx.fillStyle = colorHex;
    ctx.fill();

    // Gradiente de volumen suave transversal
    const gradTorso = ctx.createLinearGradient(-26.5, 0, 26.5, 0);
    gradTorso.addColorStop(0.0, 'rgba(0, 0, 0, 0.08)');
    gradTorso.addColorStop(0.2, 'rgba(255, 255, 255, 0.04)');
    gradTorso.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
    gradTorso.addColorStop(0.8, 'rgba(255, 255, 255, 0.04)');
    gradTorso.addColorStop(1.0, 'rgba(0, 0, 0, 0.08)');
    ctx.fillStyle = gradTorso;
    ctx.fill();

    // Contorno exterior fino
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 0.12;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 3. Cuello de la polera (Banda acanalada de 1.5 cm)
    this.dibujarCuelloEnCanvas(ctx, colorHex, esAnverso);

    // 4. Pespunte sutil de confección en el ruedo
    ctx.beginPath();
    ctx.moveTo(-26.2, 68.8);
    ctx.quadraticCurveTo(0, 69.15, 26.2, 68.8);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 0.08;
    ctx.setLineDash([0.35, 0.25]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  /**
   * Mangas de vista en perspectiva lateral sobre el anverso/reverso.
   */
  dibujarMangasVistaPerspectiva(ctx, colorHex, esAnverso) {
    ctx.save();
    ctx.fillStyle = colorHex;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 0.12;
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

    // Sombra de axila izquierda
    const gradSombraIzq = ctx.createLinearGradient(-26, 6, -46, 38);
    gradSombraIzq.addColorStop(0.0, 'rgba(0, 0, 0, 0.16)');
    gradSombraIzq.addColorStop(0.7, 'rgba(0, 0, 0, 0.03)');
    gradSombraIzq.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = gradSombraIzq;
    ctx.fill();

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

    // Sombra de axila derecha
    const gradSombraDer = ctx.createLinearGradient(26, 6, 46, 38);
    gradSombraDer.addColorStop(0.0, 'rgba(0, 0, 0, 0.16)');
    gradSombraDer.addColorStop(0.7, 'rgba(0, 0, 0, 0.03)');
    gradSombraDer.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = gradSombraDer;
    ctx.fill();

    ctx.restore();
  }

  /**
   * Dibuja la banda de cuello acanalada con acabado profesional.
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

      // Pespunte de unión del cuello
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

      // Pespunte de espalda
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
    const { sx, sy, altoCm, bocaCm, unionCm } = this.obtenerEscalasTalla(talla, superficie);
    const semiUnion = unionCm / 2.0;
    const semiBoca = bocaCm / 2.0;

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
   * Traza el contorno de recorte (Path2D o trazado en ctx) para que los estampados
   * no floten fuera de la tela de la polera.
   */
  trazarContornoRecorte(ctx, superficie, talla) {
    if (superficie === 'manga_izquierda' || superficie === 'manga_derecha') {
      const { altoCm, bocaCm, unionCm, sy } = this.obtenerEscalasTalla(talla, superficie);
      const semiUnion = unionCm / 2.0;
      const semiBoca = bocaCm / 2.0;
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
