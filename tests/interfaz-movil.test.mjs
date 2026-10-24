/**
 * Test Suite: FASE 6 — Interfaz Móvil y Usabilidad
 * Ejecución con: node tests/interfaz-movil.test.mjs
 */

import assert from 'node:assert';
import fs from 'node:fs';
import { gestorCapas } from '../js/capas.js';
import { TourGuiado } from '../js/tour.js';

console.log('--- INICIANDO TEST DE INTERFAZ MÓVIL Y USABILIDAD (FASE 6) ---');

// Mock DOM para entorno Node
class MockElement {
  constructor(id = '', className = '') {
    this.id = id;
    this.className = className;
    this.style = {};
    this.children = [];
    this.offsetWidth = 240;
    this.offsetHeight = 36;
    this.dataset = {};
    this.classList = {
      _classes: new Set(className ? className.split(' ') : []),
      add: (...classes) => classes.forEach(c => this.classList._classes.add(c)),
      remove: (...classes) => classes.forEach(c => this.classList._classes.delete(c)),
      contains: (c) => this.classList._classes.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList._classes.has(c)) this.classList._classes.delete(c);
          else this.classList._classes.add(c);
        } else if (force) {
          this.classList._classes.add(c);
        } else {
          this.classList._classes.delete(c);
        }
      }
    };
  }
  setAttribute(k, v) { this[k] = v; }
  getAttribute(k) { return this[k]; }
  addEventListener() {}
  appendChild(c) { this.children.push(c); }
  querySelector() { return new MockElement(); }
  querySelectorAll() { return [new MockElement()]; }
}

// Mock Mesa de Trabajo
const mesaMock = {
  anchoLogico: 800,
  altoLogico: 800,
  pxPorCmBase: 28.0,
  zoom: 1.0,
  ajustarAPantalla: () => {},
  mundoACanvas: (xCm, yCm) => ({
    cx: 400 + xCm * 28.0,
    cy: 400 + (yCm - 35.5) * 28.0
  })
};

// 1. Verificando posicionamiento de la barra flotante en móvil vs escritorio
console.log('1. Verificando posicionamiento de la barra flotante en móvil vs escritorio...');

const floatingEl = new MockElement('floatingContextBar');
const fineTuneEl = new MockElement('fineTuneBar');

// Mockear document.getElementById
globalThis.document = {
  getElementById: (id) => {
    if (id === 'floatingContextBar') return floatingEl;
    if (id === 'fineTuneBar') return fineTuneEl;
    return new MockElement(id);
  },
  createElement: (tag) => new MockElement(tag),
  querySelectorAll: () => [],
  querySelector: () => null
};

// Mockear capa seleccionada
const capaMock = {
  id: 'img-1',
  tipo: 'imagen',
  visible: true,
  xCm: 0,
  yCm: 28, // en el pecho
  widthCm: 20,
  heightCm: 20,
  angleDeg: 0,
  lockAspect: true
};

// Importar estado dinámico
const { estado } = await import('../js/estado.js');
estado.datos.superficieActiva = 'anverso';
estado.poleraActiva.superficies.anverso.capas = [capaMock];
estado.datos.capaSeleccionadaId = capaMock.id;

// Caso A: Móvil (< 768 px)
globalThis.window = { innerWidth: 390, innerHeight: 844 };
gestorCapas.actualizarBarraFlotante(floatingEl, mesaMock);

assert.strictEqual(floatingEl.style.top, 'auto', 'En móvil, top debe ser "auto"');
assert.strictEqual(floatingEl.style.left, '50%', 'En móvil, la barra debe centrarse horizontalmente');
assert(floatingEl.style.bottom === '56px' || floatingEl.style.bottom === '14px', 'En móvil, la barra debe fijarse al borde inferior de la mesa');
console.log(`   Posición en móvil: bottom=${floatingEl.style.bottom}, top=${floatingEl.style.top} (fija al borde inferior, nunca cubre el diseño)`);

// Caso B: Escritorio (>= 768 px)
globalThis.window = { innerWidth: 1280, innerHeight: 900 };
gestorCapas.actualizarBarraFlotante(floatingEl, mesaMock);

assert.strictEqual(floatingEl.style.bottom, 'auto', 'En escritorio, bottom debe ser "auto"');
assert(parseInt(floatingEl.style.top) >= 50, 'En escritorio, la barra debe quedar dentro del área visible (top >= 50px)');
console.log(`   Posición en escritorio: top=${floatingEl.style.top}, left=${floatingEl.style.left} (fuera de la prenda y dentro de pantalla)`);
console.log('   ✓ Comportamiento responsive de la barra flotante validado');

// 2. Verificando la hoja de controles deslizable en 3 posiciones
console.log('2. Verificando hoja de controles en 3 posiciones (cerrada, media, completa)...');
const { ControladorUI } = await import('../js/ui.js');
const panelMock = new MockElement('controlsPanel');
const gridMock = new MockElement('workspaceGrid', 'workspace-grid');

globalThis.document.getElementById = (id) => {
  if (id === 'controlsPanel') return panelMock;
  if (id === 'workspaceGrid') return gridMock;
  if (id === 'floatingContextBar') return floatingEl;
  if (id === 'fineTuneBar') return fineTuneEl;
  return new MockElement(id);
};
globalThis.document.querySelector = (sel) => {
  if (sel === '.workspace-grid') return gridMock;
  return null;
};
globalThis.document.createElement = (tag) => new MockElement(tag);

const appMock = {
  ajustarResolucionCanvas: () => {},
  solicitarRender: () => {}
};

const ui = new ControladorUI(mesaMock, appMock);

// Posición inicial: cerrada
assert.strictEqual(ui.sheetPosition, 'cerrada');
assert(!panelMock.classList.contains('sheet-open'), 'La hoja debe iniciar cerrada');

// Abrir en posición MEDIA
ui.setSheetPosition('media');
assert.strictEqual(ui.sheetPosition, 'media');
assert(panelMock.classList.contains('sheet-pos-media'), 'Debe tener la clase sheet-pos-media');
assert(gridMock.classList.contains('sheet-media-active'), 'En posición media, workspace-grid debe contraerse (sheet-media-active)');
console.log('   ✓ Posición media: el lienzo superior se contrae de forma coordinada dejando visible el diseño');

// Alternar a posición COMPLETA
ui.setSheetPosition('completa');
assert.strictEqual(ui.sheetPosition, 'completa');
assert(panelMock.classList.contains('sheet-pos-completa'), 'Debe tener la clase sheet-pos-completa');
assert(!gridMock.classList.contains('sheet-media-active'), 'En completa, el grid no se contrae');
console.log('   ✓ Posición completa: la hoja se expande para edición detallada');

// Cerrar hoja
ui.setSheetPosition('cerrada');
assert.strictEqual(ui.sheetPosition, 'cerrada');
assert(!panelMock.classList.contains('sheet-open'), 'La hoja debe quedar cerrada');
assert(!gridMock.classList.contains('sheet-media-active'), 'El grid vuelve al 100% de altura');
console.log('   ✓ Posición cerrada: la mesa recupera toda la pantalla');

// 3. Verificando metas táctiles >= 44 px en css/styles.css
console.log('3. Verificando especificaciones CSS de metas táctiles >= 44 px...');
const cssContent = fs.readFileSync('css/styles.css', 'utf-8');

// Comprobar surface-pill >= 44px
assert(cssContent.includes('.surface-pill'), 'Debe contener estilos de surface-pill');
assert(cssContent.includes('min-height: 44px;'), 'Debe definir min-height: 44px para elementos táctiles móviles');
assert(cssContent.includes('min-width: 44px;'), 'Debe definir min-width: 44px para elementos táctiles móviles');

// Comprobar ancho y desborde en móvil
assert(cssContent.includes('overflow-x: auto;') || cssContent.includes('overflow-x: hidden;'), 'Debe gestionar el desborde horizontal');
console.log('   ✓ Metas táctiles >= 44 px y contención de desborde horizontal validadas en CSS');

// 4. Verificando actualización del Tour Guiado con gestos y patrón de mangas
console.log('4. Verificando actualización del Tour Guiado con gestos y patrón plano...');
const tour = new TourGuiado();
const stepMesa = tour.driverObj?.steps?.find?.(s => s.id === 'paso-mesa');
const tourCode = fs.readFileSync('js/tour.js', 'utf-8');

assert(tourCode.includes('1 dedo'), 'El tour debe documentar gestos con 1 dedo');
assert(tourCode.includes('2 dedos'), 'El tour debe documentar gestos con 2 dedos');
assert(tourCode.includes('30% a 800%'), 'El tour debe documentar el rango de zoom 30% a 800%');
assert(tourCode.includes('patrón plano'), 'El tour debe documentar el patrón plano de mangas');
console.log('   ✓ Tour guiado actualizado con gestos táctiles y patrón plano de mangas');

console.log('\n===============================================================');
console.log('TODAS LAS PRUEBAS DE LA FASE 6 PASARON CON ÉXITO');
console.log('===============================================================\n');
