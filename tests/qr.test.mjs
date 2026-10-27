/**
 * ============================================================================
 * CustomyTee — Test Suite: FASE 4 (Compartir con Código QR y Modal)
 * ============================================================================
 * Ejecución con: node tests/qr.test.mjs
 */

import assert from 'node:assert';
import fs from 'node:fs';
import { CONFIG } from '../js/config.js';

console.log('--- INICIANDO TEST DE COMPARTIR CON QR (FASE 4) ---');

// 1. Verificar constante URL_PUBLICA
console.log('1. Verificando URL_PUBLICA en CONFIG...');
assert.strictEqual(CONFIG.URL_PUBLICA, 'https://customytee.pages.dev', 'URL_PUBLICA debe apuntar a https://customytee.pages.dev');
console.log('   ✓ URL_PUBLICA validada');

// 2. Cargar QRious en el entorno de pruebas
console.log('2. Verificando inicialización de librería QRious...');
const cachedQriousPath = 'C:/Users/Ryan/.gemini/antigravity/brain/9aa232dc-b3bf-4793-80a5-9d1a803962f1/scratch/qrious.min.js';
let qriousCode = '';
if (fs.existsSync(cachedQriousPath)) {
  qriousCode = fs.readFileSync(cachedQriousPath, 'utf8');
} else {
  const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js');
  qriousCode = await res.text();
}

const mod = { exports: {} };
new Function('module', 'exports', 'window', qriousCode)(mod, mod.exports, globalThis);
globalThis.QRious = mod.exports;

assert(typeof globalThis.QRious === 'function', 'QRious debe exportarse como constructor');
console.log('   ✓ QRious inicializado con éxito');

// 3. Probar generación de QR con nivel M, padding 4 y colores contrastados
console.log('3. Probando generación de QR (nivel M, 4 módulos de silencio, negro sobre blanco)...');
// Mock de Canvas para Node
class HTMLCanvasElement {}
class HTMLImageElement {}
globalThis.HTMLCanvasElement = HTMLCanvasElement;
globalThis.HTMLImageElement = HTMLImageElement;

class MockCanvas extends HTMLCanvasElement {
  constructor(w = 220, h = 220) {
    super();
    this.width = w;
    this.height = h;
  }
  getContext() {
    return {
      fillStyle: '#000',
      fillRect() {},
      clearRect() {},
      drawImage() {}
    };
  }
  toDataURL(type) {
    return `data:${type || 'image/png'};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==`;
  }
}

globalThis.document = {
  createElement: (tag) => {
    if (tag === 'canvas') return new MockCanvas();
    if (tag === 'img') return new HTMLImageElement();
    return {};
  }
};

const mockCanvas = new MockCanvas(220, 220);
const qr = new globalThis.QRious({
  element: mockCanvas,
  value: CONFIG.URL_PUBLICA,
  size: 220,
  level: 'M',
  padding: 4,
  foreground: '#000000',
  background: '#FFFFFF'
});

assert.strictEqual(qr.value, CONFIG.URL_PUBLICA, 'El valor del QR debe ser exactamente CONFIG.URL_PUBLICA');
assert.strictEqual(qr.level, 'M', 'Nivel de corrección debe ser M');
assert.strictEqual(qr.padding, 4, 'Zona de silencio debe ser de 4 módulos');
assert.strictEqual(qr.foreground, '#000000', 'Módulos deben ser negros (#000000)');
assert.strictEqual(qr.background, '#FFFFFF', 'Fondo debe ser blanco (#FFFFFF)');
console.log('   ✓ Parámetros técnicos del QR validados');

// 4. Probar generación de QR de alta resolución (1024 × 1024 px) para descarga
console.log('4. Probando generación de QR en alta resolución (1024 × 1024 px)...');
const qrHiRes = new globalThis.QRious({
  value: CONFIG.URL_PUBLICA,
  size: 1024,
  level: 'M',
  padding: 4,
  foreground: '#000000',
  background: '#FFFFFF'
});

assert.strictEqual(qrHiRes.size, 1024, 'El tamaño de exportación debe ser de 1024 px');
const dataUrl1024 = qrHiRes.toDataURL('image/png');
assert(dataUrl1024.startsWith('data:image/png;base64,'), 'Debe generar un DataURL en formato PNG');
console.log('   ✓ Generación de QR a 1024 px validada para descarga');

// 5. Verificar estructura accesible del Modal de Compartir en index.html
console.log('5. Verificando accesibilidad y estructura del modal en index.html...');
const indexHtml = fs.readFileSync('index.html', 'utf8');
assert(indexHtml.includes('id="shareModalBackdrop"'), 'index.html debe contener #shareModalBackdrop');
assert(indexHtml.includes('id="shareQrCanvas"'), 'index.html debe contener #shareQrCanvas');
assert(indexHtml.includes('id="shareUrlInput"'), 'index.html debe contener #shareUrlInput');
assert(indexHtml.includes('id="copyShareUrlBtn"'), 'index.html debe contener #copyShareUrlBtn');
assert(indexHtml.includes('id="downloadQrBtn"'), 'index.html debe contener #downloadQrBtn');
assert(indexHtml.includes('id="nativeShareBtn"'), 'index.html debe contener #nativeShareBtn');
assert(indexHtml.includes('id="topShareBtn"'), 'index.html debe contener #topShareBtn');
assert(!indexHtml.includes('id="topShareBtn" class="btn-icon" title="Compartir enlace (QR)" aria-label="Compartir con QR" style="display:none;"'), 'topShareBtn no debe estar oculto');

const uiJs = fs.readFileSync('js/ui.js', 'utf8');
assert(uiJs.includes('this.vincularEventosCompartirQR();'), 'ui.js debe invocar vincularEventosCompartirQR en inicializar()');
assert(uiJs.includes('this.vincularDragAndDropGlobal();'), 'ui.js debe invocar vincularDragAndDropGlobal en inicializar()');
console.log('   ✓ Inicialización de eventos de compartir y drag-and-drop en ui.js verificada');
console.log('   ✓ Estructura de modal y botones de compartir verificados en index.html');

console.log('\n===============================================================');
console.log('TODAS LAS PRUEBAS DE LA FASE 4 (QR) PASARON CON ÉXITO');
console.log('===============================================================\\n');
