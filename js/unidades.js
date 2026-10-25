/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Sistema de Unidades y Conversión
 * ============================================================================
 * Base interna estandarizada en milímetros (mm).
 * Soporta visualización y edición fluida en cm (predeterminada), mm e in (pulgadas).
 */

import { estado } from './estado.js';

export const UNIDADES = {
  // Factores de conversión respecto al milímetro interno (mm)
  FACTORES: {
    mm: 1.0,
    cm: 10.0,
    in: 25.4
  },

  // Conversiones directas
  mmACm(mm) { return mm / 10.0; },
  cmAMm(cm) { return cm * 10.0; },
  inAMm(pulg) { return pulg * 25.4; },
  mmAIn(mm) { return mm / 25.4; },

  cmAIn(cm) { return (cm * 10.0) / 25.4; },
  inACm(pulg) { return (pulg * 25.4) / 10.0; },

  /**
   * Convierte un valor expresado en centímetros a la unidad activa actual.
   */
  deCmAActiva(valorCm, unidad = estado.datos.unidades) {
    if (valorCm === null || valorCm === undefined || isNaN(valorCm)) return 0;
    switch (unidad) {
      case 'mm': return valorCm * 10.0;
      case 'in': return (valorCm * 10.0) / 25.4;
      case 'cm':
      default:   return valorCm;
    }
  },

  /**
   * Convierte un valor ingresado por el usuario en la unidad activa a centímetros.
   */
  deActivaACm(valorActivo, unidad = estado.datos.unidades) {
    if (valorActivo === null || valorActivo === undefined || isNaN(valorActivo)) return 0;
    switch (unidad) {
      case 'mm': return valorActivo / 10.0;
      case 'in': return (valorActivo * 25.4) / 10.0;
      case 'cm':
      default:   return valorActivo;
    }
  },

  /**
   * Formatea un número en centímetros a texto con la unidad actual.
   * Ej: 53 cm -> "53.0 cm", "530 mm", "20.9 in"
   */
  formatear(valorCm, unidad = estado.datos.unidades, decimales = null) {
    if (valorCm === null || valorCm === undefined || isNaN(valorCm)) return '—';
    const num = this.deCmAActiva(valorCm, unidad);
    let dec = decimales;
    if (dec === null) {
      if (unidad === 'mm') dec = 0;
      else if (unidad === 'in') dec = 2;
      else dec = 1; // cm
    }
    return `${num.toFixed(dec)} ${unidad}`;
  },

  /**
   * Retorna el paso (step) sugerido para campos numéricos según la unidad activa.
   */
  pasoInput(unidad = estado.datos.unidades) {
    switch (unidad) {
      case 'mm': return 1;
      case 'in': return 0.05;
      case 'cm':
      default:   return 0.1;
    }
  }
};
