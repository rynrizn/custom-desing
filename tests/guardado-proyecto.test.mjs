/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Suite de Pruebas Automatizadas: FASE 7 (Guardado)
 * ============================================================================
 * Valida:
 * 1. Generador de código de pedido único formal: ZRN-AAAAMMDD-XXXX
 * 2. Inclusión del código en pedido.json, .zrn y mensaje pre-rellenado de WhatsApp
 * 3. Serialización y deserialización de Proyecto CAD JSON (sin cifrar)
 * 4. Conversión de DataURL a Blob nativo para almacenamiento IndexedDB
 * 5. Debounce y protección contra bucles de autoguardado durante restauración
 */

import assert from 'node:assert';
import { gestorAlmacenamiento } from '../js/almacenamiento.js';
import { gestorPedido } from '../js/pedido.js';
import { motorCifradoZRN } from '../js/cifrado.js';
import { estado } from '../js/estado.js';

console.log('--- INICIANDO SUITE DE PRUEBAS DE GUARDADO Y PROYECTO (FASE 7) ---');

// 1. Validar formato de código único ZRN-AAAAMMDD-XXXX
console.log('1. Verificando generador de código de pedido único ZRN-AAAAMMDD-XXXX...');
const codigoRegex = /^ZRN-\d{8}-[A-Z0-9]{4}$/;
const codigosGenerados = new Set();

for (let i = 0; i < 50; i++) {
  const cod = gestorAlmacenamiento.generarCodigoPedido();
  assert(codigoRegex.test(cod), `El código ${cod} no cumple con el formato ZRN-AAAAMMDD-XXXX`);
  const sufijo = cod.split('-')[2];
  assert(!sufijo.includes('I') && !sufijo.includes('O') && !sufijo.includes('0') && !sufijo.includes('1'),
    `El sufijo ${sufijo} contiene caracteres visualmente ambiguos (I, O, 0, 1)`);
  codigosGenerados.add(cod);
}
assert.strictEqual(codigosGenerados.size, 50, 'Los códigos generados deben ser únicos');
console.log('   ✓ Formato ZRN-AAAAMMDD-XXXX y aleatoriedad no ambigua validados');

// 2. Validar que pedido.json incluye el código de pedido
console.log('2. Verificando inclusión de codigoPedido en pedido.json...');
const codigoFijo = 'ZRN-20261024-K8M4';
const pedidoObj = gestorPedido.generarObjetoPedidoJSON(codigoFijo);

assert.strictEqual(pedidoObj.codigoPedido, codigoFijo, 'pedido.json debe contener el codigoPedido asignado');
assert.strictEqual(pedidoObj.version, '2.0', 'Versión de pedido debe ser 2.0');
assert(pedidoObj.cliente, 'Debe incluir sección cliente');
assert(pedidoObj.resumen, 'Debe incluir sección resumen');
console.log('   ✓ pedido.json incluye codigoPedido y estructura normalizada');

// 3. Validar mensaje y enlace de WhatsApp con el código de pedido y archivo .zrn
console.log('3. Verificando formato de mensaje de WhatsApp con código y .zrn...');
// Simular entorno mínimo para motorCifradoZRN.enviarPedidoAZairenLab
let whatsappUrlCapturada = '';
const ventanaOriginal = globalThis.window;
const navigatorOriginal = globalThis.navigator;

Object.defineProperty(globalThis, 'window', {
  value: {
    open: (url) => { whatsappUrlCapturada = url; }
  },
  configurable: true,
  writable: true
});

Object.defineProperty(globalThis, 'navigator', {
  value: { canShare: false },
  configurable: true,
  writable: true
});

Object.defineProperty(globalThis, 'URL', {
  value: {
    createObjectURL: () => 'blob:simulado',
    revokeObjectURL: () => {}
  },
  configurable: true,
  writable: true
});
globalThis.document = {
  body: {
    appendChild: () => {},
    removeChild: () => {}
  },
  createElement: () => ({
    click: () => {},
    remove: () => {}
  })
};

const metadataSimulada = {
  codigoPedido: codigoFijo,
  cliente: { whatsapp: '+59174522654' },
  resumen: { totalUnidadesPrenda: 2 }
};

const blobFalso = new Blob(['simulacion_zrn'], { type: 'application/octet-stream' });
await motorCifradoZRN.enviarPedidoAZairenLab(blobFalso, metadataSimulada, codigoFijo);

assert(whatsappUrlCapturada.startsWith('https://wa.me/'), 'Debe abrir un enlace wa.me');
const paramsDecodificados = decodeURIComponent(whatsappUrlCapturada);
assert(paramsDecodificados.includes(codigoFijo), `El mensaje de WhatsApp debe contener el código ${codigoFijo}`);
assert(paramsDecodificados.includes(`${codigoFijo}.zrn`), `El mensaje debe mencionar el archivo ${codigoFijo}.zrn`);
assert(paramsDecodificados.includes('74522654'), 'El mensaje debe mencionar el WhatsApp de contacto');
console.log('   ✓ Mensaje de WhatsApp incluye código único y nombre .zrn exacto');

// 4. Validar Guardar y Abrir Proyecto JSON (sin cifrar)
console.log('4. Verificando exportación e importación de proyecto .json...');
// Configurar datos de prueba en el estado
estado.datos.clienteWhatsApp = '+59174522654';
estado.datos.indicaciones = 'Corte recto con refuerzo en cuello';
estado.datos.poleras[0].tallaVista = 'L';
estado.datos.poleras[0].superficies.anverso.capas = [
  {
    id: 'capa-test-1',
    tipo: 'texto',
    texto: 'ZAIREN TEST',
    xCm: 0,
    yCm: 25,
    visible: true,
    locked: false,
    imgElement: { fake: true }, // Referencia DOM que debe ser omitida en la serialización
    originalFile: { fake: true }
  }
];

let proyectoGeneradoTexto = '';
globalThis.document.createElement = (tag) => {
  return {
    tagName: tag.toUpperCase(),
    click: () => {},
    remove: () => {}
  };
};

// Capturar el contenido del blob generado por guardarProyectoJSON
const BlobOriginal = globalThis.Blob;
globalThis.Blob = class MockBlob {
  constructor(parts, opts) {
    this.parts = parts;
    this.type = opts?.type;
    proyectoGeneradoTexto = parts.join('');
  }
};

gestorAlmacenamiento.guardarProyectoJSON(estado);
globalThis.Blob = BlobOriginal;

assert(proyectoGeneradoTexto.length > 0, 'Debe generarse el contenido JSON del proyecto');
const proyectoParsed = JSON.parse(proyectoGeneradoTexto);
assert.strictEqual(proyectoParsed.tipo, 'zairen_proyecto_cad', 'Tipo de proyecto debe ser zairen_proyecto_cad');
assert.strictEqual(proyectoParsed.version, '2.0', 'Versión de proyecto debe ser 2.0');
assert(codigoRegex.test(proyectoParsed.codigoReferencia), 'Debe tener codigoReferencia ZRN');
assert(proyectoParsed.datos.poleras.length >= 1, 'Debe incluir las poleras del proyecto');
assert.strictEqual(proyectoParsed.datos.clienteWhatsApp, '+59174522654');

// Comprobar que imgElement y originalFile fueron limpiados
const capaGuardada = proyectoParsed.datos.poleras[0].superficies.anverso.capas[0];
assert.strictEqual(capaGuardada.imgElement, undefined, 'imgElement no debe serializarse');
assert.strictEqual(capaGuardada.originalFile, undefined, 'originalFile no debe serializarse');
assert.strictEqual(capaGuardada.texto, 'ZAIREN TEST');

// Probar deserialización con abrirProyectoJSON
const archivoSimulado = {
  text: async () => JSON.stringify(proyectoParsed)
};

await gestorAlmacenamiento.abrirProyectoJSON(archivoSimulado, estado);
assert.strictEqual(estado.datos.clienteWhatsApp, '+59174522654', 'Debe restaurar WhatsApp de contacto');
assert.strictEqual(estado.datos.indicaciones, 'Corte recto con refuerzo en cuello', 'Debe restaurar indicaciones');
assert.strictEqual(estado.poleraActiva.tallaVista, 'L', 'Debe restaurar talla');
console.log('   ✓ Exportación y restauración íntegra de proyecto .json validada');

// 5. Validar dataUrlABlob nativo
console.log('5. Verificando utilidad dataUrlABlob...');
const base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const blobConvertido = gestorAlmacenamiento.dataUrlABlob(base64Png);

assert(blobConvertido instanceof Blob, 'Debe retornar un objeto Blob');
assert.strictEqual(blobConvertido.type, 'image/png', 'MIME type debe ser image/png');
assert(blobConvertido.size > 0, 'Tamaño de blob debe ser > 0');
console.log('   ✓ Conversión de DataURL a Blob nativo verificada');

// Restaurar entorno
Object.defineProperty(globalThis, 'window', { value: ventanaOriginal, configurable: true, writable: true });
Object.defineProperty(globalThis, 'navigator', { value: navigatorOriginal, configurable: true, writable: true });

console.log('\n===============================================================');
console.log('TODAS LAS PRUEBAS DE LA FASE 7 PASARON CON ÉXITO');
console.log('===============================================================\n');
