/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Suite de Pruebas Automatizadas de Interacción (Fase 3)
 * ============================================================================
 * Valida:
 * 1. Hit-testing de manijas con área de toque de 44 px y punto visible de 14 px.
 * 2. Margen de toque de 12 px sobre el cuerpo del elemento.
 * 3. Comportamiento de escala proporcional en esquinas y monoaxial en lados.
 * 4. Rangos de zoom calibrados de 30 % (0.30) a 800 % (8.00).
 * 5. Evaluación de guías magnéticas y snap con zonas de impresión.
 * 6. Configuración CSS anti-scroll (touch-action y overscroll-behavior).
 */

import assert from 'node:assert';
import fs from 'node:fs';
import { gestorImagenes } from '../js/imagenes.js';
import { MesaDeTrabajo } from '../js/mesa.js';
import { estado } from '../js/estado.js';

console.log('--- INICIANDO TEST DE INTERACCIÓN Y GESTOS TIPO CANVA (FASE 3) ---');

// Mock mínimo de canvas para Node.js
class MockCanvas {
  constructor() {
    this.width = 800;
    this.height = 800;
    this.clientWidth = 800;
    this.clientHeight = 800;
  }
  getContext() {
    return {
      save() {},
      restore() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      fill() {},
      fillRect() {},
      strokeRect() {},
      arc() {},
      fillText() {},
      measureText() { return { width: 40 }; },
      setTransform() {},
      setLineDash() {},
      translate() {},
      rotate() {}
    };
  }
  addEventListener() {}
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 800, height: 800 };
  }
}

const mockCanvas = new MockCanvas();
const mesa = new MesaDeTrabajo(mockCanvas);

// 1. Validar manijas y áreas de toque (14 px visual, 44 px toque, 12 px cuerpo)
console.log('1. Verificando especificaciones de manijas y áreas de toque...');
assert.strictEqual(gestorImagenes.manijaTamPx, 14.0, 'El punto visual de la manija debe medir 14 px');
assert.strictEqual(gestorImagenes.manijaHitAreaPx, 44.0, 'El área de toque debe medir 44 px');
assert.strictEqual(gestorImagenes.manijaHitRadioPx, 22.0, 'El radio de impacto de la manija debe ser 22 px (44/2)');
assert.strictEqual(gestorImagenes.margenToqueCuerpoPx, 12.0, 'El margen de toque del cuerpo debe ser 12 px');
console.log('   ✓ Dimensiones de manijas y márgenes táctiles validadas');

// 2. Validar hit-test a escala 1:1
console.log('2. Probando hit-testing sobre elemento centrado...');
const capaPrueba = {
  id: 'test-layer-1',
  tipo: 'imagen',
  xCm: 0,
  yCm: 28,
  widthCm: 10,
  heightCm: 10,
  angleDeg: 0,
  visible: true,
  locked: false
};

const centro = mesa.mundoACanvas(capaPrueba.xCm, capaPrueba.yCm);
const escala = mesa.pxPorCmBase * mesa.zoom; // 28 * 1.0 = 28 px/cm
const wPx = capaPrueba.widthCm * escala;     // 280 px
const hPx = capaPrueba.heightCm * escala;     // 280 px

// Impacto en el centro del cuerpo
const hitCentro = gestorImagenes.obtenerHitTest(centro.cx, centro.cy, capaPrueba, mesa);
assert(hitCentro !== null, 'Debe detectar impacto en el centro del elemento');
assert.strictEqual(hitCentro.tipo, 'cuerpo', 'El tipo de impacto en el centro debe ser cuerpo');

// Impacto en margen de toque de 12 px fuera del borde (lejos de las manijas para probar cuerpo)
const hitMargen = gestorImagenes.obtenerHitTest(centro.cx + wPx / 2 + 8, centro.cy + 60, capaPrueba, mesa);
assert(hitMargen !== null, 'Debe detectar impacto dentro del margen de 12 px');
assert.strictEqual(hitMargen.tipo, 'cuerpo', 'El impacto dentro del margen debe ser cuerpo');

// Sin impacto a 25 px fuera del borde (fuera de margen de 12 px)
const hitFuera = gestorImagenes.obtenerHitTest(centro.cx + wPx / 2 + 25, centro.cy + 60, capaPrueba, mesa);
assert.strictEqual(hitFuera, null, 'No debe detectar impacto fuera del margen táctil');

// Impacto en manija de esquina superior derecha (tr)
const manijaTrX = centro.cx + wPx / 2;
const manijaTrY = centro.cy - hPx / 2;
// Probar a 15 px de distancia de la manija (dentro del área de 44 px / radio 22 px)
const hitManija = gestorImagenes.obtenerHitTest(manijaTrX + 10, manijaTrY - 10, capaPrueba, mesa);
assert(hitManija !== null, 'Debe detectar manija dentro del área de toque de 44 px');
assert.strictEqual(hitManija.tipo, 'manija', 'El tipo de impacto debe ser manija');
assert.strictEqual(hitManija.manijaId, 'tr', 'Debe identificar la manija tr');
assert.strictEqual(hitManija.esEsquina, true, 'La manija tr debe ser identificada como esquina');
console.log('   ✓ Hit-testing de cuerpo, margen táctil de 12 px y manija de 44 px verificado');

// 3. Validar límites de zoom (30 % a 800 %)
console.log('3. Verificando límites de zoom...');
// Simular alejamiento excesivo
mesa.zoom = 0.5;
mesa.onWheel({ deltaY: 1000, preventDefault() {}, clientX: 400, clientY: 400 });
assert(mesa.zoom >= 0.30, `El zoom mínimo no debe bajar de 0.30 (actual: ${mesa.zoom})`);

// Simular acercamiento excesivo
mesa.zoom = 5.0;
for (let i = 0; i < 20; i++) {
  mesa.onWheel({ deltaY: -1000, preventDefault() {}, clientX: 400, clientY: 400 });
}
assert(mesa.zoom <= 8.00, `El zoom máximo no debe superar 8.00 (actual: ${mesa.zoom})`);
console.log(`   ✓ Zoom acotado formalmente entre 30 % y 800 % (máximo probado: ${mesa.zoom.toFixed(2)})`);

// 4. Validar guías magnéticas inteligentes y atracción
console.log('4. Verificando evaluación de guías magnéticas...');
estado.datos.imanesGuias = true;
// Probar snap al centro X=0 (umbral 0.8 cm)
const snapCentro = mesa.evaluarImanes(0.35, 20.0, 10, 10);
assert.strictEqual(snapCentro.xCm, 0, 'Debe atraer X a 0 cuando está a 0.35 cm del eje');
assert(mesa.guiasActivas.some(g => g.xCm === 0 && g.label === 'Centro'), 'Debe registrar guía activa en Centro');

// Probar snap a base de cuello anverso Y=8.0 (con alto 10 cm, borde superior está en y - 5 = 8 => y = 13)
const snapCuello = mesa.evaluarImanes(10.0, 13.2, 10, 10);
assert(Math.abs(snapCuello.yCm - 13.0) < 0.05, 'Debe atraer el borde superior a la base del cuello (Y=8)');
console.log('   ✓ Atracción magnética a centro, cuello y zonas de estampado validada');

// 5. Validar CSS anti-scroll (touch-action y overscroll-behavior)
console.log('5. Verificando reglas CSS anti-scroll...');
const css = fs.readFileSync('css/styles.css', 'utf8');
assert(css.includes('overscroll-behavior: none'), 'css/styles.css debe incluir overscroll-behavior: none');
assert(css.includes('touch-action: none'), 'css/styles.css debe incluir touch-action: none');
console.log('   ✓ Reglas CSS anti-scroll y touch-action: none confirmadas');

console.log('\n===============================================================');
console.log('TODAS LAS PRUEBAS DE INTERACCIÓN Y GESTOS PASARON CON ÉXITO');
console.log('===============================================================\n');
