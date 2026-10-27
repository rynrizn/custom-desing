/**
 * ============================================================================
 * CustomyTee — Test Suite: FASE 3 (Archivo de Proyecto .zrp sin cifrar)
 * ============================================================================
 * Ejecución con: node tests/proyecto-zrp.test.mjs
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Cargar JSZip en el entorno de pruebas de Node
const cachedJsZipPath = 'C:/Users/Ryan/.gemini/antigravity/brain/9aa232dc-b3bf-4793-80a5-9d1a803962f1/scratch/jszip.min.js';
if (fs.existsSync(cachedJsZipPath)) {
  const code = fs.readFileSync(cachedJsZipPath, 'utf8');
  const mod = { exports: {} };
  new Function('module', 'exports', 'window', code)(mod, mod.exports, globalThis);
  globalThis.JSZip = mod.exports;
} else {
  const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  const code = await res.text();
  const mod = { exports: {} };
  new Function('module', 'exports', 'window', code)(mod, mod.exports, globalThis);
  globalThis.JSZip = mod.exports;
}

import { gestorAlmacenamiento } from '../js/almacenamiento.js';
import { estado } from '../js/estado.js';

console.log('--- INICIANDO SUITE DE PRUEBAS DEL FORMATO .ZRP (FASE 3) ---');

// Mock mínimo de UI para capturar notificaciones
const uiMock = {
  notificaciones: [],
  mostrarNotificacion(msg, tipo = 'info') {
    this.notificaciones.push({ msg, tipo });
  },
  mostrarModalAvisoZrn() {
    this.modalZrnMostrado = true;
  }
};

// 1. Probar guardado y apertura de proyecto con 2 poleras, imágenes y texto (ida y vuelta sin pérdida)
console.log('1. Probando ida y vuelta guardar -> abrir .zrp con múltiples prendas, imágenes y texto...');

estado.datos.poleras = [
  {
    id: 'polera-test-1',
    nombre: 'Polera Principal',
    color: '#0A0A0A',
    tallaVista: 'L',
    cantidades: [{ talla: 'L', cantidad: 2 }, { talla: 'XL', cantidad: 1 }],
    opciones: { envolvente: true, mangasEspejo: true, mangasVoltear: true },
    superficies: {
      anverso: {
        capas: [
          {
            id: 'capa-texto-1',
            tipo: 'texto',
            nombre: 'CustomyTee Logo',
            texto: 'CustomyTee\nEdición 2026',
            fuente: 'Poppins',
            tamanoPt: 32,
            color: '#FAF9F6',
            bold: true,
            italic: false,
            align: 'center',
            lineHeight: 1.2,
            strokeWidth: 1,
            strokeColor: '#BA002C',
            shadowBlur: 4,
            shadowColor: 'rgba(0,0,0,0.5)',
            shadowOffsetX: 2,
            shadowOffsetY: 2,
            xCm: 0,
            yCm: 25,
            widthCm: 18,
            heightCm: 8,
            scaleX: 1.0,
            scaleY: 1.0,
            angleDeg: 5,
            opacity: 0.95,
            flipH: false,
            flipV: false,
            locked: false,
            visible: true
          }
        ]
      },
      reverso: { capas: [] },
      manga_izquierda: { capas: [] },
      manga_derecha: {
        capas: [
          {
            id: 'capa-img-1',
            tipo: 'imagen',
            nombre: 'Emblema Taller',
            fileExt: 'png',
            dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            widthCm: 8,
            heightCm: 8,
            anchoOriginalPx: 100,
            altoOriginalPx: 100,
            xCm: 0,
            yCm: 9.5,
            scaleX: 1.0,
            scaleY: 1.0,
            angleDeg: 0,
            opacity: 1,
            flipH: false,
            flipV: false,
            locked: false,
            visible: true
          }
        ]
      }
    }
  },
  {
    id: 'polera-test-2',
    nombre: 'Polera Secundaria',
    color: '#FAF9F6',
    tallaVista: 'M',
    cantidades: [{ talla: 'M', cantidad: 3 }],
    opciones: { envolvente: false, mangasEspejo: false, mangasVoltear: true },
    superficies: {
      anverso: { capas: [] },
      reverso: {
        capas: [
          {
            id: 'capa-texto-2',
            tipo: 'texto',
            nombre: 'Dorsal',
            texto: 'STAFF 2026',
            fuente: 'Inter',
            tamanoPt: 40,
            color: '#0A0A0A',
            bold: true,
            italic: false,
            align: 'center',
            xCm: 0,
            yCm: 28,
            widthCm: 20,
            heightCm: 6,
            scaleX: 1.0,
            scaleY: 1.0,
            angleDeg: 0,
            opacity: 1.0,
            flipH: false,
            flipV: false,
            locked: false,
            visible: true
          }
        ]
      },
      manga_izquierda: { capas: [] },
      manga_derecha: { capas: [] }
    }
  }
];
estado.datos.clienteWhatsApp = '+56912345678';
estado.datos.indicaciones = 'Coser etiquetas con hilo reforzado';

// Generar paquete .zrp
const resultadoZrp = await gestorAlmacenamiento.guardarProyectoZRP(estado, 'ZRN-20261027-TEST', false);
assert(resultadoZrp.blob, 'Debe generar un Blob nativo');
assert(resultadoZrp.blob.size > 200, 'El archivo ZIP debe contener datos');
assert.strictEqual(resultadoZrp.codigo, 'ZRN-20261027-TEST', 'El código de pedido debe coincidir');

// Inspeccionar contenido del ZIP generado
const zipCargado = await JSZip.loadAsync(await resultadoZrp.blob.arrayBuffer());
assert(zipCargado.file('proyecto.json'), 'El .zrp DEBE contener proyecto.json en raíz');
assert(zipCargado.file('imagenes/img_capa-img-1.png'), 'El .zrp DEBE guardar la imagen en imagenes/img_capa-img-1.png');

const jsonEnZip = JSON.parse(await zipCargado.file('proyecto.json').async('text'));
assert.strictEqual(jsonEnZip.formato, 'zrp', 'Formato en JSON debe ser "zrp"');
assert.strictEqual(jsonEnZip.version, 1, 'Versión debe ser 1');
assert.strictEqual(jsonEnZip.app, 'CustomyTee', 'App debe ser CustomyTee');
assert.strictEqual(jsonEnZip.poleras.length, 2, 'Debe incluir las 2 poleras');

// Limpiar estado y restaurar desde el blob .zrp
estado.datos.poleras = [];
const archivoSimulado = new File([resultadoZrp.blob], 'proyecto-ZRN-20261027-TEST.zrp', { type: 'application/zip' });
const exitoApertura = await gestorAlmacenamiento.abrirProyecto(archivoSimulado, estado, uiMock, 'reemplazar');

assert.strictEqual(exitoApertura, true, 'La apertura de .zrp debe ser exitosa');
assert.strictEqual(estado.datos.poleras.length, 2, 'Deben restaurarse 2 poleras');
assert.strictEqual(estado.datos.poleras[0].nombre, 'Polera Principal', 'Nombre de polera 1 restaurado');
assert.strictEqual(estado.datos.poleras[0].color, '#0A0A0A', 'Color restaurado');
assert.strictEqual(estado.datos.poleras[0].superficies.anverso.capas[0].texto, 'CustomyTee\nEdición 2026', 'Texto multilínea restaurado');
assert.strictEqual(estado.datos.poleras[0].superficies.manga_derecha.capas[0].tipo, 'imagen', 'Capa de imagen restaurada');
assert.strictEqual(estado.datos.poleras[1].superficies.reverso.capas[0].texto, 'STAFF 2026', 'Texto de polera 2 restaurado');
assert.strictEqual(estado.datos.clienteWhatsApp, '+56912345678', 'WhatsApp restaurado');
assert.strictEqual(estado.datos.indicaciones, 'Coser etiquetas con hilo reforzado', 'Indicaciones restauradas');
console.log('   ✓ Ida y vuelta guardar -> abrir .zrp completado con 100% de integridad');

// 2. Probar diseño de solo texto
console.log('2. Probando diseño de solo texto (sin imágenes)...');
estado.datos.poleras = [
  {
    id: 'solo-texto',
    nombre: 'Polera Texto',
    color: '#FAF9F6',
    tallaVista: 'M',
    cantidades: [{ talla: 'M', cantidad: 1 }],
    opciones: { envolvente: false, mangasEspejo: false, mangasVoltear: true },
    superficies: {
      anverso: {
        capas: [
          { id: 'txt-1', tipo: 'texto', nombre: 'Minimalista', texto: 'ZENITH', fuente: 'Inter', tamanoPt: 24, xCm: 0, yCm: 25, widthCm: 10, heightCm: 4, angleDeg: 0, opacity: 1, flipH: false, flipV: false, locked: false, visible: true }
        ]
      },
      reverso: { capas: [] },
      manga_izquierda: { capas: [] },
      manga_derecha: { capas: [] }
    }
  }
];

const zrpSoloTexto = await gestorAlmacenamiento.guardarProyectoZRP(estado, null, false);
estado.datos.poleras = [];
await gestorAlmacenamiento.abrirProyecto(new File([zrpSoloTexto.blob], 'solo-texto.zrp'), estado, uiMock, 'reemplazar');
assert.strictEqual(estado.datos.poleras.length, 1, 'Debe restaurar 1 polera');
assert.strictEqual(estado.datos.poleras[0].superficies.anverso.capas[0].texto, 'ZENITH');
console.log('   ✓ Proyectos de solo texto funcionan de forma íntegra');

// 3. Probar opción "Añadir como nueva polera"
console.log('3. Probando opción "Añadir como nueva polera"...');
const cantidadAntes = estado.datos.poleras.length; // 1
await gestorAlmacenamiento.abrirProyecto(new File([resultadoZrp.blob], 'adicional.zrp'), estado, uiMock, 'anadir');
assert.strictEqual(estado.datos.poleras.length, cantidadAntes + 2, 'Debe añadir 2 poleras sumando un total de 3');
console.log('   ✓ Opción "Añadir como nueva polera" comprobada con éxito');

// 4. Probar rechazo de archivo corrupto
console.log('4. Probando rechazo de archivos corruptos...');
const archivoCorrupto = new File([new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0x00, 0xFF, 0xFF, 0xFF])], 'corrupto.zrp');
await assert.rejects(
  async () => gestorAlmacenamiento.abrirProyecto(archivoCorrupto, estado, uiMock, 'reemplazar'),
  (err) => err.codigo === 'ARCHIVO_CORRUPTO',
  'Debe rechazar archivos ZIP dañados'
);
console.log('   ✓ Archivo corrupto rechazado adecuadamente');

// 5. Probar rechazo de versión desconocida (> 1)
console.log('5. Probando rechazo de versión futura desconocida...');
const zipFuturo = new JSZip();
zipFuturo.file('proyecto.json', JSON.stringify({ formato: 'zrp', version: 99, poleras: [{ id: 'p1', superficies: {} }] }));
const blobFuturo = await zipFuturo.generateAsync({ type: 'blob' });
await assert.rejects(
  async () => gestorAlmacenamiento.abrirProyecto(new File([blobFuturo], 'futuro.zrp'), estado, uiMock, 'reemplazar'),
  (err) => err.codigo === 'VERSION_DESCONOCIDA',
  'Debe rechazar versiones no soportadas'
);
console.log('   ✓ Versión desconocida rechazada adecuadamente');

// 6. Probar rechazo de archivo muy grande (> 60 MB)
console.log('6. Probando límite de tamaño de archivo (60 MB)...');
const archivoGigante = {
  name: 'enorme.zrp',
  size: 65 * 1024 * 1024,
  slice: () => ({ arrayBuffer: async () => new ArrayBuffer(4) })
};
await assert.rejects(
  async () => gestorAlmacenamiento.abrirProyecto(archivoGigante, estado, uiMock, 'reemplazar'),
  (err) => err.codigo === 'LIMITE_TAMANO_EXCEDIDO',
  'Debe rechazar archivos de más de 60 MB'
);
console.log('   ✓ Archivo superior a 60 MB rechazado adecuadamente');

// 7. Probar rechazo explícito y amigable de archivo .zrn
console.log('7. Probando rechazo explícito de archivo .zrn en el editor...');
const archivoZrn = new File([new Uint8Array([0x5A, 0x52, 0x4E, 0x31])], 'pedido-20261027-ABCD.zrn');
uiMock.modalZrnMostrado = false;
await assert.rejects(
  async () => gestorAlmacenamiento.abrirProyecto(archivoZrn, estado, uiMock, 'reemplazar'),
  (err) => {
    assert.strictEqual(err.codigo, 'ZRN_RECHAZADO');
    assert(err.message.includes('ZAIRENLAB'), 'Mensaje debe explicar que es exclusivo para el taller');
    assert(err.message.includes('.zrp'), 'Mensaje debe sugerir usar .zrp');
    return true;
  },
  'Debe rechazar archivos .zrn con mensaje explicativo'
);
assert.strictEqual(uiMock.modalZrnMostrado, true, 'Debe activar el modal explicativo de .zrn');
console.log('   ✓ Archivo .zrn rechazado con explicación clara para el cliente');

console.log('\n===============================================================');
console.log('TODAS LAS PRUEBAS DE LA FASE 3 (.ZRP) PASARON CON ÉXITO');
console.log('===============================================================\\n');
