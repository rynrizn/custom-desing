/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Suite de Pruebas de Centrado y Alineación (Fase 4)
 * ============================================================================
 * Valida:
 * 1. Error de centrado < 0.5 mm (0.05 cm) en imágenes giradas con escalas distintas por eje.
 * 2. Error de centrado < 0.5 mm (0.05 cm) en textos de 1 línea y 2 líneas.
 * 3. Exactitud de los seis botones de alineación respecto a la zona de 30x40 cm (torso) y 10x12 cm (mangas).
 * 4. Actualización y sincronización automática de la manga opuesta cuando Modo Espejo está activo.
 */

import assert from 'node:assert';
import { gestorCapas } from '../js/capas.js';
import { estado } from '../js/estado.js';

console.log('--- INICIANDO TEST DE CENTRADO Y ALINEACIÓN DE PRECISIÓN (FASE 4) ---');

const TOLERANCIA_MAX_CM = 0.05; // 0.5 mm de tolerancia máxima exigida

// 1. Imagen girada con escalas distintas por eje en Torso (Anverso)
console.log('1. Probando centrado de imagen girada con escalas distintas...');
estado.setSuperficieActiva('anverso');
const capaImagen = {
  id: 'img-test-align',
  nombre: 'Logo Rotado',
  tipo: 'imagen',
  widthCm: 14.0,
  heightCm: 9.0,
  scaleX: 1.35,
  scaleY: 0.75,
  angleDeg: 37, // Ángulo arbitrario
  xCm: 8.5,
  yCm: 14.2,
  locked: false,
  visible: true
};

estado.agregarCapa(capaImagen);
estado.seleccionarCapa(capaImagen.id);

// Probar Centrado Horizontal
gestorCapas.alinearCapa('center-h');
let box = gestorCapas.obtenerCajaVisualRealCm(capaImagen);
let errorCentroX = Math.abs(box.currentCenterX - 0.0);
console.log(`   Centrado H: X visual = ${box.currentCenterX.toFixed(4)} cm | Error = ${(errorCentroX * 10).toFixed(3)} mm`);
assert(errorCentroX < TOLERANCIA_MAX_CM, `Error de centrado horizontal ${(errorCentroX * 10).toFixed(3)} mm debe ser < 0.5 mm`);

// Probar Centrado Vertical en Zona 30x40 (centro Y = 28.0 cm)
gestorCapas.alinearCapa('center-v');
box = gestorCapas.obtenerCajaVisualRealCm(capaImagen);
let errorCentroY = Math.abs(box.currentCenterY - 28.0);
console.log(`   Centrado V: Y visual = ${box.currentCenterY.toFixed(4)} cm | Error = ${(errorCentroY * 10).toFixed(3)} mm`);
assert(errorCentroY < TOLERANCIA_MAX_CM, `Error de centrado vertical ${(errorCentroY * 10).toFixed(3)} mm debe ser < 0.5 mm`);

// Probar Centrar en Zona
gestorCapas.alinearCapa('center-zone');
box = gestorCapas.obtenerCajaVisualRealCm(capaImagen);
assert(Math.abs(box.currentCenterX - 0.0) < TOLERANCIA_MAX_CM, 'Centrar en zona debe tener error H < 0.5 mm');
assert(Math.abs(box.currentCenterY - 28.0) < TOLERANCIA_MAX_CM, 'Centrar en zona debe tener error V < 0.5 mm');
console.log('   ✓ Centrado de imagen con escalas asimétricas y rotación validado');

// 2. Texto de 1 línea
console.log('2. Probando centrado de texto de 1 línea...');
const capaTexto1 = {
  id: 'txt-test-1',
  nombre: 'Texto 1L',
  tipo: 'texto',
  texto: 'ZAIREN URBAN',
  fuente: 'Poppins',
  tamanoPt: 44,
  scaleX: 1.0,
  scaleY: 1.0,
  angleDeg: 22,
  align: 'center',
  xCm: -10,
  yCm: 15,
  widthCm: 18.0,
  heightCm: 4.5,
  locked: false,
  visible: true
};

estado.agregarCapa(capaTexto1);
estado.seleccionarCapa(capaTexto1.id);
gestorCapas.alinearCapa('center-zone');
box = gestorCapas.obtenerCajaVisualRealCm(capaTexto1);
errorCentroX = Math.abs(box.currentCenterX - 0.0);
errorCentroY = Math.abs(box.currentCenterY - 28.0);
console.log(`   Texto 1L: Centro visual (${box.currentCenterX.toFixed(4)}, ${box.currentCenterY.toFixed(4)}) cm`);
assert(errorCentroX < TOLERANCIA_MAX_CM, 'Texto 1L debe tener error H < 0.5 mm');
assert(errorCentroY < TOLERANCIA_MAX_CM, 'Texto 1L debe tener error V < 0.5 mm');
console.log('   ✓ Centrado de texto de 1 línea verificado');

// 3. Texto de 2 líneas
console.log('3. Probando centrado de texto de 2 líneas...');
const capaTexto2 = {
  id: 'txt-test-2',
  nombre: 'Texto 2L',
  tipo: 'texto',
  texto: 'COLECCIÓN\nLIMITADA 2026',
  fuente: 'Poppins',
  tamanoPt: 36,
  lineHeight: 1.3,
  scaleX: 1.1,
  scaleY: 0.9,
  angleDeg: -18,
  align: 'center',
  xCm: 7,
  yCm: 40,
  widthCm: 16.0,
  heightCm: 8.0,
  locked: false,
  visible: true
};

estado.agregarCapa(capaTexto2);
estado.seleccionarCapa(capaTexto2.id);
gestorCapas.alinearCapa('center-zone');
box = gestorCapas.obtenerCajaVisualRealCm(capaTexto2);
errorCentroX = Math.abs(box.currentCenterX - 0.0);
errorCentroY = Math.abs(box.currentCenterY - 28.0);
console.log(`   Texto 2L: Centro visual (${box.currentCenterX.toFixed(4)}, ${box.currentCenterY.toFixed(4)}) cm`);
assert(errorCentroX < TOLERANCIA_MAX_CM, 'Texto 2L debe tener error H < 0.5 mm');
assert(errorCentroY < TOLERANCIA_MAX_CM, 'Texto 2L debe tener error V < 0.5 mm');
console.log('   ✓ Centrado de texto de 2 líneas verificado');

// 4. Seis botones de alineación respecto a la zona de 30x40 cm (X: -15 a 15, Y: 8 a 48)
console.log('4. Verificando los 6 botones de alineación respecto a la zona de 30x40 cm...');
// Left (borde izquierdo visual en x = -15.0)
gestorCapas.alinearCapa('left');
box = gestorCapas.obtenerCajaVisualRealCm(capaTexto2);
const errorLeft = Math.abs(box.minX - (-15.0));
assert(errorLeft < TOLERANCIA_MAX_CM, `Borde izquierdo visual debe ser -15.0 cm (actual: ${box.minX.toFixed(4)})`);

// Right (borde derecho visual en x = +15.0)
gestorCapas.alinearCapa('right');
box = gestorCapas.obtenerCajaVisualRealCm(capaTexto2);
const errorRight = Math.abs(box.maxX - 15.0);
assert(errorRight < TOLERANCIA_MAX_CM, `Borde derecho visual debe ser +15.0 cm (actual: ${box.maxX.toFixed(4)})`);

// Top (borde superior visual en y = 8.0)
gestorCapas.alinearCapa('top');
box = gestorCapas.obtenerCajaVisualRealCm(capaTexto2);
const errorTop = Math.abs(box.minY - 8.0);
assert(errorTop < TOLERANCIA_MAX_CM, `Borde superior visual debe ser 8.0 cm (actual: ${box.minY.toFixed(4)})`);

// Bottom (borde inferior visual en y = 48.0)
gestorCapas.alinearCapa('bottom');
box = gestorCapas.obtenerCajaVisualRealCm(capaTexto2);
const errorBottom = Math.abs(box.maxY - 48.0);
assert(errorBottom < TOLERANCIA_MAX_CM, `Borde inferior visual debe ser 48.0 cm (actual: ${box.maxY.toFixed(4)})`);
console.log('   ✓ Alineaciones left, right, top y bottom probadas con precisión submilimétrica');

// 5. Mangas y sincronización automática en espejo
console.log('5. Verificando alineación en mangas y sincronización en espejo...');
estado.setSuperficieActiva('manga_izquierda');
estado.poleraActiva.mangasEspejo = true;

const capaManga = {
  id: 'img-manga-1',
  nombre: 'Escudo Manga',
  tipo: 'imagen',
  widthCm: 8.0,
  heightCm: 6.0,
  xCm: 2.0,
  yCm: 5.0,
  locked: false,
  visible: true
};

estado.agregarCapa(capaManga);
estado.seleccionarCapa(capaManga.id);

// Centrar en zona de manga (centro x=0, y=9.5 cm)
gestorCapas.alinearCapa('center-zone');
box = gestorCapas.obtenerCajaVisualRealCm(capaManga);
assert(Math.abs(box.currentCenterX - 0.0) < TOLERANCIA_MAX_CM, 'Manga centro X debe ser 0');
assert(Math.abs(box.currentCenterY - 9.5) < TOLERANCIA_MAX_CM, 'Manga centro Y debe ser 9.5');

// Verificar que la otra manga (manga_derecha) se sincronizó automáticamente
const capasDer = estado.poleraActiva.superficies.manga_derecha.capas;
const capaEspejada = capasDer.find(c => c.id === `espejo-${capaManga.id}`);
assert(capaEspejada !== undefined, 'La manga derecha debe contener la capa clonada en espejo');
assert.strictEqual(capaEspejada.xCm, -capaManga.xCm, 'La coordenada X de la manga espejada debe ser simétrica (-X)');
assert.strictEqual(capaEspejada.yCm, capaManga.yCm, 'La coordenada Y de la manga espejada debe ser idéntica');
console.log('   ✓ Alineación en manga y actualización automática en espejo verificada');

console.log('\n===============================================================');
console.log('TODAS LAS PRUEBAS DE CENTRADO Y ALINEACIÓN PASARON CON ÉXITO');
console.log('===============================================================\n');
