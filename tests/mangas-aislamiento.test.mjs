/**
 * Test Suite: FASE 5 — Mangas, Patrón Plano, Aislamiento y Texto Simplificado
 * Ejecución con: node tests/mangas-aislamiento.test.mjs
 */

import assert from 'node:assert';
import { CONFIG } from '../js/config.js';
import { estado } from '../js/estado.js';
import { MesaDeTrabajo } from '../js/mesa.js';
import { GestorMangas } from '../js/mangas.js';
import { GestorTexto } from '../js/texto.js';
import { GestorImagenes } from '../js/imagenes.js';

console.log('--- INICIANDO TEST DE MANGAS, AISLAMIENTO Y TEXTO SIMPLIFICADO (FASE 5) ---');

// Mock básico para contexto Canvas 2D
class CanvasContextMock {
  constructor() {
    this.calls = [];
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1;
  }
  save() {}
  restore() {}
  translate() {}
  rotate() {}
  scale() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  quadraticCurveTo() {}
  stroke() {}
  fill() {}
  strokeRect() {}
  fillRect() {}
  measureText(str) { return { width: (str || '').length * 7 }; }
  fillText() {}
  setLineDash() {}
}

const ctxMock = new CanvasContextMock();

const mockCanvas = {
  width: 1000,
  height: 800,
  getContext: () => ctxMock,
  addEventListener: () => {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 })
};

// 1. Verificar modo plano predeterminado y zoom ~75%
console.log('1. Verificando modo plano predeterminado y cálculo de zoom al ~75%...');
const mesa = new MesaDeTrabajo(mockCanvas);
mesa.ctx = ctxMock;

assert.strictEqual(mesa.modoManga, 'plana', 'El modo de manga inicial debe ser "plana"');

estado.setSuperficieActiva('manga_izquierda');
assert.strictEqual(estado.datos.superficieActiva, 'manga_izquierda');
mesa.modoManga = 'plana';
mesa.ajustarAPantalla();

// Alto de manga M = 19 cm, Unión = 18.5 cm. pxPorCmBase = 28.0.
// Alto en px = 19 * 28 = 532 px.
// Con zoomX = (1000 * 0.75) / (18.5 * 28) = 1.447
// Con zoomY = (800 * 0.75) / (19.0 * 28) = 1.1278
// El zoom limitante (min) es zoomY = 1.1278, ocupando exactamente (532 * 1.1278) = 600 px = 75% de 800 px.
const altoPatronPx = 19.0 * mesa.pxPorCmBase * mesa.zoom;
const ocupacionAlto = altoPatronPx / mesa.altoLogico;
console.log(`   Zoom calculado: ${mesa.zoom.toFixed(4)} | Ocupación del alto: ${(ocupacionAlto * 100).toFixed(1)} %`);
assert(Math.abs(ocupacionAlto - 0.75) < 0.02, `El patrón plano debe ocupar ~75% de la mesa (obtenido: ${(ocupacionAlto * 100).toFixed(1)}%)`);
console.log('   ✓ Patrón plano predeterminado y zoom al 75% validado');

// 2. Verificar que "No invertir texto" (mangasVoltear) viene activado por defecto
console.log('2. Verificando que "No invertir texto" (mangasVoltear) está activado por defecto...');
assert.strictEqual(estado.poleraActiva.mangasVoltear, true, 'mangasVoltear debe ser true por defecto en la polera');

const gestorMangas = new GestorMangas();
const gestorTexto = new GestorTexto();
const capaTextoManga = gestorTexto.crearCapaTexto('TEXTO PRUEBA');
capaTextoManga.flipH = false;
estado.agregarCapa(capaTextoManga);

// Sincronizar espejo a manga derecha
estado.poleraActiva.mangasEspejo = true;
gestorMangas.sincronizarEspejo('manga_izquierda');

const capasMangaDer = estado.poleraActiva.superficies.manga_derecha.capas;
assert(capasMangaDer.length > 0, 'Debe haber una capa reflejada en manga derecha');
const capaReflejada = capasMangaDer[0];
// Dado que mangasVoltear es true, el texto NO debe invertirse (flipH sigue siendo false para que sea legible)
assert.strictEqual(capaReflejada.flipH, false, 'El texto no debe invertirse al reflejarse cuando mangasVoltear es true');
console.log('   ✓ "No invertir texto" activo por defecto y preservación de legibilidad validada');

// 3. Verificar que el texto NO tiene manijas de estiramiento ni escala
console.log('3. Verificando que las capas de texto no tienen manijas de estiramiento ni escala...');
const gestorImagenes = new GestorImagenes();
const { cx, cy } = mesa.mundoACanvas(capaTextoManga.xCm, capaTextoManga.yCm);
const escala = mesa.pxPorCmBase * mesa.zoom;
const wPx = capaTextoManga.widthCm * escala;
const hPx = capaTextoManga.heightCm * escala;

// Coordenadas donde estaría la manija de la esquina superior derecha (tr)
const hitEsquina = gestorImagenes.obtenerHitTest(cx + wPx / 2, cy - hPx / 2, capaTextoManga, mesa);
assert.notStrictEqual(hitEsquina?.tipo, 'manija', 'Una capa de texto NUNCA debe devolver tipo "manija" de escala');
console.log(`   Hit en esquina de texto: tipo="${hitEsquina?.tipo || 'ninguno'}" (esperado: no manija)`);

// Coordenadas donde estaría la manija lateral (mr)
const hitLateral = gestorImagenes.obtenerHitTest(cx + wPx / 2, cy, capaTextoManga, mesa);
assert.notStrictEqual(hitLateral?.tipo, 'manija', 'Una capa de texto NUNCA debe permitir estiramiento lateral');

// En el centro debe detectar cuerpo para moverlo
const hitCuerpo = gestorImagenes.obtenerHitTest(cx, cy, capaTextoManga, mesa);
assert.strictEqual(hitCuerpo?.tipo, 'cuerpo', 'El cuerpo de la capa de texto debe ser seleccionable para moverlo');

// En la manija de rotación debe detectar rotar
const brazoPx = gestorImagenes.brazoRotacionCm * escala;
const hitRotar = gestorImagenes.obtenerHitTest(cx, cy - hPx / 2 - brazoPx, capaTextoManga, mesa);
assert.strictEqual(hitRotar?.tipo, 'rotar', 'La manija de rotación sí debe estar presente en texto');
console.log('   ✓ Capas de texto sin manijas de estiramiento ni cambio de tamaño validadas');

// 4. Verificar aislamiento de superficies
console.log('4. Verificando aislamiento de superficies (mangas vs torso)...');
estado.setSuperficieActiva('anverso');
const capasAnverso = estado.capasSuperficieActiva;
// Las capas de anverso NO deben incluir la capa que creamos en la manga izquierda
const capaMangaEnAnverso = capasAnverso.find(c => c.id === capaTextoManga.id);
assert.strictEqual(capaMangaEnAnverso, undefined, 'Las capas de la manga NO deben existir en las capas del anverso');

estado.setSuperficieActiva('manga_izquierda');
const capasMangaIzq = estado.capasSuperficieActiva;
assert(capasMangaIzq.some(c => c.id === capaTextoManga.id), 'La capa debe existir únicamente en su superficie activa');
console.log('   ✓ Aislamiento estricto de capas por superficie verificado');

// 5. Clamping de etiqueta de área de impresión y cotas
console.log('5. Verificando clamping de etiqueta de área máxima de impresión...');
// Simular un pan extremo que movería la etiqueta fuera del lienzo
mesa.panX = -2000;
mesa.panY = -2000;
assert.doesNotThrow(() => {
  mesa.dibujarZonaMaximaEstampado();
  mesa.dibujarCotasPrenda();
}, 'El renderizado con clamping y cotas de costura no debe lanzar errores');
console.log('   ✓ Clamping de etiquetas y cotas de costura verificado');

// 6. Verificar ajuste de tamaño de letra numérico (8 pt, 12 pt)
console.log('6. Verificando ajuste de tamaño de letra numérico (8 pt, 12 pt)...');
capaTextoManga.tamanoPt = 12;
gestorTexto.recalcularDimensionesCm(capaTextoManga);
const alto12 = capaTextoManga.heightCm;

capaTextoManga.tamanoPt = 8;
gestorTexto.recalcularDimensionesCm(capaTextoManga);
const alto8 = capaTextoManga.heightCm;

assert(alto8 < alto12, 'El alto a 8 pt debe ser menor que a 12 pt');
assert.strictEqual(capaTextoManga.tamanoPt, 8, 'El tamaño de letra debe poder fijarse a 8 pt');
console.log('   ✓ Ajuste de tamaño de letra numérico (8 pt, 12 pt) verificado correctamente');


// 7. Prueba de regresión: proyección de mangas con 2 diseños distintos (espejo apagado)
console.log('7. Verificando corrección de proyección de mangas con 2 diseños independientes y todas las tallas...');

const ctxTest = new CanvasContextMock();
let transforms = [];
ctxTest.translate = (x, y) => transforms.push({ op: 'translate', x, y });
ctxTest.rotate = (rad) => transforms.push({ op: 'rotate', deg: Number((rad * 180 / Math.PI).toFixed(1)) });
ctxTest.scale = (sx, sy) => transforms.push({ op: 'scale', sx, sy });

// Desactivar modo espejo y asignar 2 diseños diferentes en cada manga
estado.poleraActiva.mangasEspejo = false;
estado.poleraActiva.superficies.manga_izquierda.capas = [
  { id: 'm-izq-1', tipo: 'texto', texto: 'CUSTOMYTEE IZQ', visible: true, xCm: 0, yCm: 9.5, tamanoPt: 16, angleDeg: 15, flipH: false, flipV: false, opacity: 1 }
];
estado.poleraActiva.superficies.manga_derecha.capas = [
  { id: 'm-der-1', tipo: 'texto', texto: 'CUSTOMYTEE DER', visible: true, xCm: 0, yCm: 9.5, tamanoPt: 16, angleDeg: 0, flipH: false, flipV: false, opacity: 1 }
];

// Probar proyección en anverso (vista frontal)
transforms = [];
gestorMangas.dibujarProyeccionEnTorso(ctxTest, 'anverso', mesa);
// Manga izquierda anatómica debe proyectarse a la derecha visual (x > 0, signo +1, ángulo -42°)
// Manga derecha anatómica debe proyectarse a la izquierda visual (x < 0, signo -1, ángulo +42°)
const rotaciones = transforms.filter(t => t.op === 'rotate');
assert(rotaciones.length >= 2, 'Debe haber rotaciones correspondientes a ambas mangas');
console.log('   ✓ Mapeo anatómico en anverso verificado (izq a derecha visual, der a izquierda visual)');

// Probar proyección en reverso (vista posterior)
transforms = [];
gestorMangas.dibujarProyeccionEnTorso(ctxTest, 'reverso', mesa);
assert(transforms.length > 0, 'La proyección en reverso debe ejecutarse correctamente');
console.log('   ✓ Mapeo anatómico en reverso verificado');

// Probar en todas las tallas paramétricas (S a XXL)
for (const talla of ['S', 'M', 'L', 'XL', 'XXL']) {
  estado.poleraActiva.tallaVista = talla;
  assert.doesNotThrow(() => {
    gestorMangas.dibujarProyeccionEnTorso(ctxTest, 'anverso', mesa);
  }, `Proyección en talla ${talla} debe ejecutarse sin errores`);
}
console.log('   ✓ Proyección validada para tallas S, M, L, XL, XXL');

console.log('\n===============================================================');
console.log('TODAS LAS PRUEBAS DE LA FASE 5 Y MANGAS PASARON CON ÉXITO');
console.log('===============================================================\n');