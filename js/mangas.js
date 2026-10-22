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

      // Si "voltear" está activado, invierte el reflejo para que el texto se lea al derecho
      if (polera.mangasVoltear) {
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
      this.proyectarDisenosEnMangaPerspectiva(ctx, capasIzq, 'izq', esAnverso, mesa);
    }
    if (capasDer.length > 0) {
      this.proyectarDisenosEnMangaPerspectiva(ctx, capasDer, 'der', esAnverso, mesa);
    }
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
    const centroMangaX = signo * 36.5;
    const centroMangaY = 22.5;
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
      const escala = mesa.pxPorCmBase * mesa.zoom * 0.78;
      const offsetX = capa.xCm * escala;
      const offsetY = (capa.yCm - 9.5) * escala; // 9.5 cm es el centro vertical de la manga M
      ctx.translate(offsetX, offsetY);
      ctx.rotate((capa.angleDeg * Math.PI) / 180);
      ctx.scale(capa.flipH ? -1 : 1, capa.flipV ? -1 : 1);

      if (capa.tipo === 'imagen' && capa.imgElement) {
        const wPx = capa.widthCm * escala;
        const hPx = capa.heightCm * escala;
        ctx.drawImage(capa.imgElement, -wPx / 2, -hPx / 2, wPx, hPx);
      } else if (capa.tipo === 'texto' && capa.texto) {
        gestorTexto.dibujarCapa(ctx, capa, {
          mundoACanvas: (x, y) => ({ cx: 0, cy: 0 }),
          pxPorCmBase: mesa.pxPorCmBase,
          zoom: mesa.zoom * 0.78
        });
      }

      ctx.restore();
    }

    ctx.restore();
  }
}

export const gestorMangas = new GestorMangas();
