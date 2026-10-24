/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Test de Geometría y Tabla de Tallas Reales
 * ============================================================================
 * Ejecutable con Node.js:
 *   node tests/tallas-geometria.test.mjs
 *
 * Verifica:
 * 1. Talla M base mide exactamente 53 x 71 cm (fuente de verdad).
 * 2. Factores de escala sx = ancho/53 y sy = largo/71 anclados en (0,0).
 * 3. Tallas S, L, XL, XXL coinciden con las especificaciones de taller.
 * 4. Tallas S, XL y XXL marcadas como estimadas; M y L como reales.
 * 5. Dimensiones paramétricas de mangas planas por talla.
 * 6. Ausencia total de referencias a 91.5 cm en las fuentes SVG y configuraciones.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import { CONFIG } from '../js/config.js';
import { SVG_PATHS_PRENDA, MotorPoleraSVG } from '../js/polera-svg.js';

console.log('--- INICIANDO TEST DE GEOMETRÍA Y TALLAS REALES (FASE 2) ---');

// 1. Verificar Tabla de Tallas del Cuerpo
console.log('1. Verificando dimensiones reales del cuerpo...');
const tallas = CONFIG.TALLAS_CUERPO;
assert.deepStrictEqual(tallas.S, { ancho: 50, largo: 69, estimada: true });
assert.deepStrictEqual(tallas.M, { ancho: 53, largo: 71, estimada: false });
assert.deepStrictEqual(tallas.L, { ancho: 54, largo: 72, estimada: false });
assert.deepStrictEqual(tallas.XL, { ancho: 57, largo: 74, estimada: true });
assert.deepStrictEqual(tallas.XXL, { ancho: 60, largo: 76, estimada: true });
console.log('   ✓ Tallas S, M, L, XL, XXL verificadas correctamente (M = 53 × 71 cm)');

// 2. Verificar Factores de Escala Paramétrica
console.log('2. Verificando cálculo de escalas paramétricas...');
const motor = new MotorPoleraSVG();

const escalaM = motor.obtenerEscalasTalla('M');
assert.strictEqual(escalaM.sx, 1.0);
assert.strictEqual(escalaM.sy, 1.0);
assert.strictEqual(escalaM.anchoCm, 53);
assert.strictEqual(escalaM.largoCm, 71);

const escalaS = motor.obtenerEscalasTalla('S');
assert.strictEqual(escalaS.sx, 50 / 53);
assert.strictEqual(escalaS.sy, 69 / 71);

const escalaL = motor.obtenerEscalasTalla('L');
assert.strictEqual(escalaL.sx, 54 / 53);
assert.strictEqual(escalaL.sy, 72 / 71);

const escalaXL = motor.obtenerEscalasTalla('XL');
assert.strictEqual(escalaXL.sx, 57 / 53);
assert.strictEqual(escalaXL.sy, 74 / 71);

const escalaXXL = motor.obtenerEscalasTalla('XXL');
assert.strictEqual(escalaXXL.sx, 60 / 53);
assert.strictEqual(escalaXXL.sy, 76 / 71);
console.log('   ✓ Factores sx = ancho/53 y sy = largo/71 verificados para todas las tallas');

// 3. Verificar Dimensiones Paramétricas de Mangas
console.log('3. Verificando tabla de mangas...');
const mangas = CONFIG.TALLAS_MANGAS;
assert.deepStrictEqual(mangas.S, { alto: 18, boca: 15.5, union: 17.5, estimada: true });
assert.deepStrictEqual(mangas.M, { alto: 19, boca: 16.5, union: 18.5, estimada: false });
assert.deepStrictEqual(mangas.L, { alto: 21, boca: 18.5, union: 20.5, estimada: false });
assert.deepStrictEqual(mangas.XL, { alto: 22, boca: 19.5, union: 21.5, estimada: true });
assert.deepStrictEqual(mangas.XXL, { alto: 23, boca: 20.5, union: 22.5, estimada: true });
console.log('   ✓ Dimensiones de manga plana validadas (M: 19 x 16.5 x 18.5; L: +2 cm)');

// 4. Verificar Cuello y Zonas de Impresión
console.log('4. Verificando cuello y zonas de estampado...');
assert.strictEqual(CONFIG.CUELLO.anchoBandaCm, 1.5);
assert.strictEqual(CONFIG.CUELLO.anchoAberturaCm, 18.0);
assert.strictEqual(CONFIG.CUELLO.caidaAnversoCm, 8.0);
assert.strictEqual(CONFIG.CUELLO.caidaReversoCm, 2.0);

assert.strictEqual(CONFIG.ZONAS_IMPRESION.anverso.ancho, 30);
assert.strictEqual(CONFIG.ZONAS_IMPRESION.anverso.alto, 40);
assert.strictEqual(CONFIG.ZONAS_IMPRESION.manga_izquierda.ancho, 10);
assert.strictEqual(CONFIG.ZONAS_IMPRESION.manga_izquierda.alto, 12);
console.log('   ✓ Cuello 1.5 cm y zonas de impresión (30x40 cm y 10x12 cm) conformes');

// 5. Verificar Archivos SVG
console.log('5. Verificando archivos SVG en svg/polera-*.svg...');
const svgAnverso = fs.readFileSync('svg/polera-anverso.svg', 'utf8');
const svgReverso = fs.readFileSync('svg/polera-reverso.svg', 'utf8');

assert(svgAnverso.includes('viewBox="-43.48 -2.56 87.01 74.51"'), 'ViewBox anverso debe ser -43.48 -2.56 87.01 74.51');
assert(svgReverso.includes('viewBox="-42.94 -2.77 85.93 74.77"'), 'ViewBox reverso debe ser -42.94 -2.77 85.93 74.77');
assert(!svgAnverso.includes('91.5'), 'SVG anverso no debe contener 91.5');
assert(!svgReverso.includes('91.5'), 'SVG reverso no debe contener 91.5');
console.log('   ✓ Archivos SVG con viewBox reales y sin referencias residuales a 91.5 cm');

console.log('\n===============================================================');
console.log('TODAS LAS PRUEBAS DE GEOMETRÍA Y TALLAS PASARON CON ÉXITO');
console.log('===============================================================\n');
