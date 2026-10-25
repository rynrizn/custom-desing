/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Motor de Continuidad Lateral Envolvente
 * ============================================================================
 * Proyecta los excedentes de los diseños que cruzan las costuras laterales
 * entre el Anverso y el Reverso ("Continuar por atrás").
 * Lo que sobresale por el costado izquierdo del anverso entra por el derecho
 * del reverso y viceversa, siguiendo las curvas reales del cuerpo SVG.
 */

import { estado } from './estado.js';
import { motorPoleraSVG } from './polera-svg.js';
import { gestorImagenes } from './imagenes.js';
import { gestorTexto } from './texto.js';

export class MotorEnvolvente {
  constructor() {}

  /**
   * Dibuja en la superficie actual las continuaciones de diseño proyectadas desde el lado opuesto.
   */
  dibujarContinuacionEnvolvente(ctx, superficieActual, mesa) {
    const polera = estado.poleraActiva;
    if (!polera.envolvente) return;

    if (superficieActual !== 'anverso' && superficieActual !== 'reverso') return;

    const superficieOrigen = superficieActual === 'anverso' ? 'reverso' : 'anverso';
    const capasOrigen = polera.superficies[superficieOrigen]?.capas || [];
    if (!capasOrigen.length) return;

    const { anchoCm, largoCm } = motorPoleraSVG.obtenerEscalasTalla(polera.tallaVista, superficieActual);
    const semiAncho = anchoCm / 2;

    for (const capa of capasOrigen) {
      if (!capa.visible) continue;

      // Evaluar si la capa sobresale de los costados del cuerpo (x = -semiAncho o +semiAncho)
      const bordeIzqCapa = capa.xCm - capa.widthCm / 2;
      const bordeDerCapa = capa.xCm + capa.widthCm / 2;

      // Caso 1: Sobresale por el costado DERECHO del lado origen (bordeDerCapa > semiAncho)
      // Debe ingresar por el costado IZQUIERDO del lado actual
      if (bordeDerCapa > semiAncho) {
        const excedente = bordeDerCapa - semiAncho;
        // La posición X en el lado receptor entra desde el borde izquierdo (-semiAncho)
        const nuevoXCm = -semiAncho + (excedente - capa.widthCm / 2);

        this.renderizarCapaProyectada(ctx, capa, nuevoXCm, capa.yCm, mesa);
      }

      // Caso 2: Sobresale por el costado IZQUIERDO del lado origen (bordeIzqCapa < -semiAncho)
      // Debe ingresar por el costado DERECHO del lado actual
      if (bordeIzqCapa < -semiAncho) {
        const excedente = -semiAncho - bordeIzqCapa;
        // La posición X en el lado receptor entra desde el borde derecho (semiAncho)
        const nuevoXCm = semiAncho - (excedente - capa.widthCm / 2);

        this.renderizarCapaProyectada(ctx, capa, nuevoXCm, capa.yCm, mesa);
      }
    }
  }

  renderizarCapaProyectada(ctx, capaOriginal, xCm, yCm, mesa) {
    ctx.save();
    // Leve transparencia para denotar que es la continuación y no es editable directamente desde aquí
    ctx.globalAlpha = (capaOriginal.opacity || 1.0) * 0.95;

    const capaClon = Object.assign({}, capaOriginal, {
      xCm,
      yCm,
      // No editable desde el lado receptor
      locked: true
    });

    if (capaOriginal.tipo === 'imagen') {
      gestorImagenes.dibujarCapa(ctx, capaClon, mesa);
    } else if (capaOriginal.tipo === 'texto') {
      gestorTexto.dibujarCapa(ctx, capaClon, mesa);
    }

    ctx.restore();
  }
}

export const motorEnvolvente = new MotorEnvolvente();
