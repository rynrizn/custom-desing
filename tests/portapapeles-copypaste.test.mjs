import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EstadoApp } from '../js/estado.js';
import { gestorCapas } from '../js/capas.js';
import { ICONOS } from '../js/iconos.js';

test('PORTAPAPELES: Copiar, Cortar y Pegar entre superficies', async (t) => {
  await t.test('Copiar capa desde manga izquierda y pegar en anverso (centrado en pecho)', () => {
    const estado = new EstadoApp();
    estado.datos.superficieActiva = 'manga_izquierda';

    const capaManga = {
      id: 'capa-logo-manga',
      tipo: 'imagen',
      nombre: 'Logo Manga',
      anchoCm: 8.0,
      altoCm: 8.0,
      xCm: 0,
      yCm: 9.5,
      rotacionDeg: 0,
      opacidad: 1,
      visible: true,
      locked: false,
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      imgElement: { width: 100, height: 100 }
    };

    estado.capasSuperficieActiva.push(capaManga);
    estado.datos.capaSeleccionadaId = capaManga.id;

    // 1. Copiar capa
    const copiado = estado.copiarCapa();
    assert.equal(copiado, true, 'Debe copiar la capa seleccionada');
    assert.ok(estado.portapapeles, 'El portapapeles debe contener datos');
    assert.equal(estado.portapapeles.accion, 'copy');
    assert.equal(estado.portapapeles.superficieOrigen, 'manga_izquierda');

    // 2. Cambiar a anverso
    estado.datos.superficieActiva = 'anverso';
    assert.equal(estado.capasSuperficieActiva.length, 0, 'Anverso debe estar vacío al inicio');

    // 3. Pegar en anverso
    const pegada = estado.pegarCapa();
    assert.ok(pegada, 'Debe devolver la capa pegada');
    assert.equal(estado.capasSuperficieActiva.length, 1, 'Anverso debe contener 1 capa');
    assert.equal(pegada.nombre, 'Logo Manga');
    assert.equal(pegada.xCm, 0, 'Debe centrarse en X en el anverso');
    assert.equal(pegada.yCm, 28.0, 'Debe centrarse en Y (28 cm) en la zona de estampado del pecho');
    assert.ok(pegada.imgElement, 'Debe conservar imgElement');
    assert.ok(estado.cacheRecursos.has(pegada.id), 'Debe registrarse en cacheRecursos');
  });

  await t.test('Cortar capa grande de anverso y pegar en manga derecha (auto-escalado a 10x12)', () => {
    const estado = new EstadoApp();
    estado.datos.superficieActiva = 'anverso';

    const capaPechoGrande = {
      id: 'capa-pecho-xxl',
      tipo: 'imagen',
      nombre: 'Arte Gigante',
      anchoCm: 25.0,
      altoCm: 30.0,
      xCm: 0,
      yCm: 28.0,
      rotacionDeg: 0,
      opacidad: 1,
      visible: true,
      locked: false,
      dataUrl: 'data:image/png;base64,simulado'
    };

    estado.capasSuperficieActiva.push(capaPechoGrande);
    estado.datos.capaSeleccionadaId = capaPechoGrande.id;

    // Cortar capa
    const cortado = estado.cortarCapa();
    assert.equal(cortado, true, 'Debe cortar la capa');
    assert.equal(estado.capasSuperficieActiva.length, 0, 'La capa cortada debe removerse del origen');

    // Cambiar a manga derecha
    estado.datos.superficieActiva = 'manga_derecha';
    const pegadaEnManga = estado.pegarCapa();

    assert.ok(pegadaEnManga, 'Debe pegarse en la manga derecha');
    assert.ok(pegadaEnManga.anchoCm <= 10.0, `El ancho (${pegadaEnManga.anchoCm} cm) no debe exceder 10 cm`);
    assert.ok(pegadaEnManga.altoCm <= 12.0, `El alto (${pegadaEnManga.altoCm} cm) no debe exceder 12 cm`);
    assert.equal(pegadaEnManga.xCm, 0, 'Debe centrarse horizontalmente en la manga');
    assert.equal(pegadaEnManga.yCm, 9.5, 'Debe centrarse verticalmente en la zona de manga (9.5 cm)');
  });

  await t.test('Verificar métodos auxiliares en gestorCapas', () => {
    assert.equal(typeof gestorCapas.copiarCapa, 'function');
    assert.equal(typeof gestorCapas.cortarCapa, 'function');
    assert.equal(typeof gestorCapas.pegarCapa, 'function');
    assert.equal(typeof gestorCapas.duplicarCapa, 'function');
  });

  await t.test('Verificar íconos oficiales en ICONOS', () => {
    assert.ok(ICONOS.magnet.includes('m12 15 4 4'), 'El imán debe incluir las bandas de polaridad de Lucide');
    assert.ok(ICONOS.hand.includes('M18 11V6'), 'La mano debe ser el trazado anatómico de Lucide');
    assert.ok(ICONOS.maximize.includes('M15 3h6v6'), 'Maximize debe ser maximize-2 de Lucide');
    assert.ok(ICONOS.trash.includes('M10 11v6'), 'Trash debe ser trash-2 de Lucide');
    assert.ok(ICONOS.scissors, 'Debe existir el icono scissors');
    assert.ok(ICONOS.clipboardPaste, 'Debe existir el icono clipboardPaste');
  });

  await t.test('Verificar campo Talla Alternativa en index.html', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    assert.ok(html.includes('id="altSizeSelect"'), 'Debe existir altSizeSelect en index.html');
    assert.ok(html.includes('Talla Alternativa'), 'Debe tener la etiqueta Talla Alternativa');
    assert.ok(html.includes('id="floatCopyBtn"'), 'Debe existir floatCopyBtn en la barra flotante');
    assert.ok(html.includes('id="floatCutBtn"'), 'Debe existir floatCutBtn en la barra flotante');
    assert.ok(html.includes('id="pasteLayerBtn"'), 'Debe existir pasteLayerBtn en la cabecera de capas');
  });
});
