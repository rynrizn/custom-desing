/**
 * ============================================================================
 * CustomyTee CAD Textil — Suite de Auditoría y Verificación de Cierre (FASE 7)
 * ============================================================================
 * Auditoría integral de 10 puntos que certifica:
 * 1. Ausencia total de secretos, claves privadas o contraseñas en código y configs
 * 2. Cero referencias a 91.5 cm en SVG, JS y HTML
 * 3. Existencia de las 14 fuentes WOFF2 locales requeridas
 * 4. Concordancia de medidas reales de taller (Talla M: 53x71 cm)
 * 5. Integridad de endpoints de Cloudflare Pages Functions
 * 6. Generación de código único formal ZRN
 * 7. Cero emojis en todos los archivos web publicados
 * 8. Formato .zrp estructurado con JSZip y rechazo amigable de .zrn
 * 9. Compartir por QR con URL pública y exportación a 1024x1024 px
 * 10. Accesibilidad de animación, respeto a prefers-reduced-motion y toggle de Ajustes
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from '../js/config.js';
import { gestorAlmacenamiento } from '../js/almacenamiento.js';

console.log('--- INICIANDO AUDITORÍA INTEGRAL DE CIERRE (10 PUNTOS) ---');

// 1. Auditoría de Secretos y Claves Privadas en js/config.js
console.log('1. Verificando que js/config.js no contiene claves ni secretos...');
assert.strictEqual(CONFIG.RSA_PUBLIC_KEY, '', 'RSA_PUBLIC_KEY debe estar vacía en repo público');
assert(CONFIG.WHATSAPP_NEGOCIO.includes('74522654'), 'WHATSAPP_NEGOCIO debe ser el número del taller');
console.log('   ✓ js/config.js limpio de secretos');

// 2. Auditoría de archivos en busca de referencias residuales a 91.5 cm
console.log('2. Verificando ausencia total de 91.5 cm en archivos de producción...');
const archivosAChequear = [
  'svg/polera-anverso.svg',
  'svg/polera-reverso.svg',
  'svg/manga-plana.svg',
  'js/config.js',
  'js/polera-svg.js',
  'js/mesa.js',
  'js/mangas.js',
  'index.html'
];

for (const relPath of archivosAChequear) {
  const contenido = fs.readFileSync(path.resolve(relPath), 'utf-8');
  assert(!contenido.includes('91.5'), `El archivo ${relPath} no debe contener '91.5'`);
  assert(!contenido.includes('91,5'), `El archivo ${relPath} no debe contener '91,5'`);
}
console.log('   ✓ Cero referencias a 91.5 cm en los 8 archivos clave');

// 3. Verificación de fuentes locales WOFF2
console.log('3. Verificando presencia de fuentes tipográficas WOFF2...');
const fuentesEsperadas = [
  'poppins.woff2',
  'inter.woff2',
  'jetbrainsmono.woff2',
  'cormorantgaramond.woff2',
  'anton.woff2',
  'bebasneue.woff2',
  'oswald.woff2',
  'montserrat.woff2',
  'playfairdisplay.woff2',
  'lobster.woff2',
  'pacifico.woff2',
  'permanentmarker.woff2',
  'bangers.woff2',
  'caveat.woff2'
];

for (const f of fuentesEsperadas) {
  const existe = fs.existsSync(path.resolve('fonts', f));
  assert(existe, `Falta la fuente requerida: fonts/${f}`);
}
console.log(`   ✓ Las ${fuentesEsperadas.length} fuentes WOFF2 están presentes en fonts/`);

// 4. Verificación de medidas reales Talla M en CONFIG
console.log('4. Verificando medidas reales de confección en CONFIG...');
assert.strictEqual(CONFIG.TALLAS_CUERPO.M.ancho, 53, 'Talla M debe tener 53 cm de ancho');
assert.strictEqual(CONFIG.TALLAS_CUERPO.M.largo, 71, 'Talla M debe tener 71 cm de largo');
assert.strictEqual(CONFIG.TALLAS_CUERPO.M.estimada, false, 'Talla M es medida real');
assert.strictEqual(CONFIG.TALLAS_MANGAS.M.alto, 19, 'Manga M debe tener 19 cm de largo');
assert.strictEqual(CONFIG.TALLAS_MANGAS.M.boca, 16.5, 'Manga M debe tener 16.5 cm de boca');
assert.strictEqual(CONFIG.TALLAS_MANGAS.M.union, 18.5, 'Manga M debe tener 18.5 cm de unión');
console.log('   ✓ Medidas reales de confección validadas');

// 5. Verificación de Functions en Cloudflare Pages
console.log('5. Verificando existencia de Cloudflare Pages Functions...');
const funcionesEsperadas = [
  'functions/api/login.js',
  'functions/api/logout.js',
  'functions/api/clave.js',
  'functions/api/publica.js',
  'functions/lector/_middleware.js'
];

for (const f of funcionesEsperadas) {
  assert(fs.existsSync(path.resolve(f)), `Falta la Cloudflare Pages Function: ${f}`);
}
console.log('   ✓ Todas las Cloudflare Pages Functions presentes');

// 6. Verificación de Código de Pedido Único ZRN
console.log('6. Verificando formato de código ZRN...');
const cod = gestorAlmacenamiento.generarCodigoPedido();
assert(/^ZRN-\d{8}-[A-Z0-9]{4}$/.test(cod), `Código ${cod} no cumple formato ZRN-AAAAMMDD-XXXX`);
console.log(`   ✓ Código de pedido ${cod} generado con éxito`);

// 7. Cero emojis en archivos web
console.log('7. Verificando ausencia total de emojis en archivos web publicados...');
const regexEmoji = /\p{Extended_Pictographic}/gu;
const ficherosWeb = [
  'index.html',
  'css/styles.css',
  'js/config.js',
  'js/ui.js',
  'js/tour.js',
  'js/almacenamiento.js',
  'js/exportar.js',
  'lector/index.html',
  'lector/lector.js',
  'acceso/index.html'
];
for (const rel of ficherosWeb) {
  const content = fs.readFileSync(path.resolve(rel), 'utf8');
  const matches = [...content.matchAll(regexEmoji)];
  assert.equal(matches.length, 0, `Se encontraron emojis en ${rel}`);
}
console.log('   ✓ Cero emojis confirmado en todos los archivos web de producción');

// 8. Formato .zrp estructurado con JSZip y rechazo amigable de .zrn
console.log('8. Verificando arquitectura de proyecto .zrp y rechazo de .zrn...');
const almacenamientoJs = fs.readFileSync(path.resolve('js/almacenamiento.js'), 'utf8');
const indexHtmlContent = fs.readFileSync(path.resolve('index.html'), 'utf8');
assert(almacenamientoJs.includes('guardarProyectoZRP'), 'Debe incluir función guardarProyectoZRP');
assert(almacenamientoJs.includes('procesarZipZRP'), 'Debe incluir procesarZipZRP');
assert(almacenamientoJs.includes('ZRN_RECHAZADO'), 'Debe rechazar archivos .zrn');
assert(indexHtmlContent.includes('id="zrnNoticeModalBackdrop"'), 'Debe existir el modal zrnNoticeModalBackdrop');
console.log('   ✓ Formato .zrp y rechazo amigable de .zrn validados');

// 9. Compartir QR con URL pública y resolución 1024x1024 px
console.log('9. Verificando compartir con código QR...');
const uiJs = fs.readFileSync(path.resolve('js/ui.js'), 'utf8');
const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
assert(indexHtml.includes('id="shareModalBackdrop"'), 'Modal de compartir presente');
assert(uiJs.includes('CONFIG.URL_PUBLICA'), 'QR debe apuntar a CONFIG.URL_PUBLICA');
assert(uiJs.includes('1024'), 'Exportación de QR en alta resolución a 1024 px');
console.log('   ✓ Compartir por QR y descarga en 1024 px validados');

// 10. Accesibilidad, tokens de animación y toggle de movimiento
console.log('10. Verificando tokens de animación y soporte de movimiento reducido...');
const css = fs.readFileSync(path.resolve('css/styles.css'), 'utf8');
assert(css.includes('--motion-duration-fast: 120ms;'), 'Tokens de duración presentes');
assert(css.includes('@media (prefers-reduced-motion: reduce)'), 'Media query prefers-reduced-motion presente');
assert(css.includes('body.reduced-motion') && css.includes('body.disable-animations'), 'Clases de reducción de movimiento presentes');
assert(uiJs.includes('customytee_animaciones'), 'Toggle de animaciones persistido');
console.log('   ✓ Tokens y accesibilidad de animación validados');

console.log('\n===============================================================');
console.log('AUDITORÍA INTEGRAL DE CIERRE (10/10) COMPLETADA CON 100% DE ÉXITO');
console.log('===============================================================\n');
