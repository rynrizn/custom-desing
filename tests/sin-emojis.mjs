/**
 * ============================================================================
 * CustomyTee — Test de Ausencia Total de Emojis en Archivos Publicados
 * ============================================================================
 * Audita mediante la propiedad Unicode \p{Extended_Pictographic} que ningún
 * archivo publicado de la aplicación web contenga emojis o pictogramas residuales.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('--- AUDITORÍA DE AUSENCIA DE EMOJIS EN ARCHIVOS PUBLICADOS ---');

// Rutas de archivos publicados que forman parte de la web
const directoriosPublicados = ['js', 'css', 'acceso', 'lector', 'functions'];
const archivosRaizPublicados = ['index.html', '_headers', 'robots.txt'];

const emojiRegex = /\p{Extended_Pictographic}/gu;
const hallazgos = [];

function auditarArchivo(rutaRelativa) {
  if (!fs.existsSync(rutaRelativa)) return;
  const contenido = fs.readFileSync(rutaRelativa, 'utf8');
  const lineas = contenido.split(/\r?\n/);

  lineas.forEach((linea, index) => {
    const coincidencias = [...linea.matchAll(emojiRegex)];
    if (coincidencias.length > 0) {
      hallazgos.push({
        archivo: rutaRelativa,
        linea: index + 1,
        emojis: coincidencias.map(m => m[0]).join(' '),
        texto: linea.trim()
      });
    }
  });
}

function auditarDirectorio(dir) {
  if (!fs.existsSync(dir)) return;
  const entradas = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entradas) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      auditarDirectorio(full);
    } else if (/\.(html|js|mjs|css|svg)$/.test(ent.name)) {
      auditarArchivo(full);
    }
  }
}

// 1. Auditar archivos raíz
for (const f of archivosRaizPublicados) {
  auditarArchivo(f);
}

// 2. Auditar directorios publicados
for (const d of directoriosPublicados) {
  auditarDirectorio(d);
}

if (hallazgos.length > 0) {
  console.error(`\n❌ Se encontraron ${hallazgos.length} líneas con emojis en archivos publicados:`);
  hallazgos.forEach(h => {
    console.error(`  - ${h.archivo}:${h.linea} [${h.emojis}] -> "${h.texto.slice(0, 60)}"`);
  });
  process.exit(1);
} else {
  console.log('✓ 100% libre de emojis en todos los archivos web publicados (HTML, JS, CSS)');
  console.log('===============================================================');
  console.log('AUDITORÍA DE EMOJIS SUPERADA CON ÉXITO');
  console.log('===============================================================');
}
