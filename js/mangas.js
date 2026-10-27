/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Módulo de Gestión de Mangas y Modo Espejo
 * ============================================================================
 * Administra las superficies planas de ambas mangas (izquierda y derecha),
 * la replicación simétrica en modo espejo con opción de volteo, y la
 * proyección visual aproximada de los artes de manga sobre las vistas anverso/reverso.
 */

import { CONFIG } from './config.js';
import { estado } from './estado.js';
import { motorPoleraSVG } from './polera-svg.js';
import { gestorImagenes } from './imagenes.js';
import { gestorTexto } from './texto.js';

export class GestorMangas {
  constructor() {}

  /**
   * Sincroniza las capas entre mangas si el modo espejo está activo.
   */
  sincronizarEspejo(superficieModificada) {
    const polera = estado.poleraActiva;
    if (!polera.mangasEspejo) return;

    if (superficieModificada !== 'manga_izquierda' && superficieModificada !== 'manga_derecha') {
      return;
    }

    const supDestino = superficieModificada === 'manga_izquierda' ? 'manga_derecha' : 'manga_izquierda';
    const origenCapas = polera.superficies[superficieModificada].capas;

    // Clonar capas invirtiendo simétricamente el eje horizontal (x)
    polera.superficies[supDestino].capas = origenCapas.map(capa => {
      const clon = JSON.parse(JSON.stringify(capa));
      clon.id = `espejo-${capa.id}`;
      clon.xCm = -capa.xCm;

      // "No invertir texto al reflejar" (mangasVoltear = true):
      // Mantiene el texto legible al derecho (clon.flipH = capa.flipH).
      // Si mangasVoltear es false, invierte simétricamente (clon.flipH = !capa.flipH).
      if (polera.mangasVoltear) {
        clon.flipH = capa.flipH;
      } else {
        clon.flipH = !capa.flipH;
      }
      return clon;
    });
  }

  /**
   * Dibuja una proyección visual aproximada de los diseños de las mangas
   * sobre las mangas del torso en las vistas de Anverso y Reverso.
   */
  dibujarProyeccionEnTorso(ctx, superficieTorso, mesa) {
    if (superficieTorso !== 'anverso' && superficieTorso !== 'reverso') return;

    const polera = estado.poleraActiva;
    const esAnverso = superficieTorso === 'anverso';

    // En el anverso:
    // Manga visual a la izquierda del lienzo = Manga Izquierda anatómica del que viste la polera (x < 0)
    // Manga visual a la derecha del lienzo = Manga Derecha anatómica (x > 0)
    const capasIzq = polera.superficies.manga_izquierda?.capas || [];
    const capasDer = polera.superficies.manga_derecha?.capas || [];

    if (capasIzq.length > 0) {
      const ladoIzq = esAnverso ? 'der' : 'izq';
      this.proyectarDisenosEnMangaPerspectiva(ctx, capasIzq, ladoIzq, esAnverso, mesa);
    }
    if (capasDer.length > 0) {
      const ladoDer = esAnverso ? 'izq' : 'der';
      this.proyectarDisenosEnMangaPerspectiva(ctx, capasDer, ladoDer, esAnverso, mesa);
    }
  }

  /**
   * Dibuja una miniatura flotante en tiempo real (Picture-in-Picture) de la polera completa
   * cuando se está editando el patrón plano de una manga.
   */
  dibujarMiniaturaPolera(ctx, superficieManga, mesa) {
    const esManga = superficieManga === 'manga_izquierda' || superficieManga === 'manga_derecha';
    const modoManga = mesa.modoManga || 'plana';
    if (!esManga || modoManga !== 'plana') return;

    const w = mesa.anchoLogico;
    const h = mesa.altoLogico;

    // Dimensiones y posición de la miniatura en la esquina inferior derecha
    const anchoPiP = 120;
    const altoPiP = 150;
    const xPiP = w - anchoPiP - 16;
    const yPiP = h - altoPiP - 16;

    ctx.save();

    // Fondo y borde del visor PiP
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = 'rgba(20, 21, 24, 0.95)';
    ctx.beginPath();
    ctx.roundRect(xPiP, yPiP, anchoPiP, altoPiP, 6);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Etiqueta superior
    ctx.fillStyle = '#BA002C';
    ctx.fillRect(xPiP, yPiP, anchoPiP, 18);
    ctx.fillStyle = '#FAF9F6';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VISTA EN POLERA (3D)', xPiP + anchoPiP / 2, yPiP + 12);

    // Mock mesa para escalar la silueta dentro del cuadro PiP
    const polera = estado.poleraActiva;
    const pxPorCmPiP = (anchoPiP * 0.70) / 53.0; // Polera de 53 cm escalada
    const centroPiPX = xPiP + anchoPiP / 2.0;
    const centroPiPY = yPiP + 26.0;

    const mockMesaPiP = {
      pxPorCmBase: pxPorCmPiP,
      zoom: 1.0,
      mundoACanvas: (xCm, yCm) => ({
        cx: centroPiPX + xCm * pxPorCmPiP,
        cy: centroPiPY + yCm * pxPorCmPiP
      })
    };

    // Renderizar silueta de la polera en miniatura
    motorPoleraSVG.dibujarPrendaEnCanvas(ctx, 'anverso', polera.color, polera.tallaVista, mockMesaPiP, 'prenda');

    // Proyectar diseño actual en la manga de la miniatura
    this.dibujarProyeccionEnTorso(ctx, 'anverso', mockMesaPiP);

    // Pista táctil inferior
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Clic para alternar vista', xPiP + anchoPiP / 2, yPiP + altoPiP - 6);

    ctx.restore();
  }

  /**
   * Verifica si un clic ocurrió dentro de la tarjeta de previsualización PiP.
   */
  esHitEnMiniaturaPiP(cx, cy, mesa) {
    const sup = estado.datos.superficieActiva;
    const esManga = sup === 'manga_izquierda' || sup === 'manga_derecha';
    const modoManga = mesa.modoManga || 'plana';
    if (!esManga || modoManga !== 'plana') return false;

    const w = mesa.anchoLogico;
    const h = mesa.altoLogico;
    const anchoPiP = 120;
    const altoPiP = 150;
    const xPiP = w - anchoPiP - 16;
    const yPiP = h - altoPiP - 16;

    return cx >= xPiP && cx <= xPiP + anchoPiP && cy >= yPiP && cy <= yPiP + altoPiP;
  }

  /**
   * Mapea las coordenadas planas de la manga a la perspectiva visual de la manga en el cuerpo.
   */
  proyectarDisenosEnMangaPerspectiva(ctx, capas, lado, esAnverso, mesa) {
    ctx.save();
    // Centro aproximado de la manga en perspectiva en centímetros del mundo
    // Manga izquierda: x ≈ -36 cm, y ≈ 22 cm, ángulo ≈ -42°
    // Manga derecha:   x ≈ +36 cm, y ≈ 22 cm, ángulo ≈ +42°
    const signo = lado === 'izq' ? -1 : 1;
    const { sx, sy } = motorPoleraSVG.obtenerEscalasTalla(estado.poleraActiva.tallaVista);
    const centroMangaX = signo * 36.5 * (sx || 1.0);
    const centroMangaY = 22.5 * (sy || 1.0);
    const anguloPerspectiva = signo * (esAnverso ? -42 : -38);

    const { cx, cy } = mesa.mundoACanvas(centroMangaX, centroMangaY);
    ctx.translate(cx, cy);
    ctx.rotate((anguloPerspectiva * Math.PI) / 180);
    // Factor de compresión en perspectiva (0.78 de escala)
    ctx.scale(0.78, 0.78);

    for (const capa of capas) {
      if (!capa.visible) continue;
      ctx.save();
      ctx.globalAlpha = (capa.opacity || 1.0) * 0.92;

      // Desplazamiento relativo al centro de la manga plana
      const escala = mesa.pxPorCmBase * mesa.zoom;
      const offsetX = capa.xCm * escala;
      const offsetY = (capa.yCm - 9.5) * escala; // 9.5 cm es el centro vertical de la manga M
      ctx.translate(offsetX, offsetY);
      ctx.rotate((capa.angleDeg * Math.PI) / 180);
      ctx.scale((capa.flipH ? -1 : 1) * (capa.scaleX || 1.0), capa.flipV ? -1 : 1);

      if (capa.tipo === 'imagen' && capa.imgElement) {
        const wPx = capa.widthCm * escala;
        const hPx = capa.heightCm * escala;
        ctx.drawImage(capa.imgElement, -wPx / 2, -hPx / 2, wPx, hPx);
      } else if (capa.tipo === 'texto' && capa.texto) {
        gestorTexto.dibujarCapa(ctx, capa, mesa, { omitirTransformacion: true });
      }

      ctx.restore();
    }

    ctx.restore();
  }
}

export const gestorMangas = new GestorMangas();
