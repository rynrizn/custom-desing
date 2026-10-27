import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TourGuiado, TOUR_STORAGE_KEY } from '../js/tour.js';
import { CONFIG } from '../js/config.js';

test('FASE 6: Configuración y pasos del tour guiado (Driver.js)', () => {
  console.log('--- INICIANDO TEST DEL TOUR GUIADO Y SOPORTE (FASE 6) ---');

  console.log('1. Verificando clave de almacenamiento en localStorage...');
  assert.equal(TOUR_STORAGE_KEY, 'customytee_tour_completado', 'La clave de persistencia debe ser customytee_tour_completado');
  console.log('   ✓ Clave de almacenamiento validada');

  console.log('2. Verificando estructura de pasos del tour...');
  const tour = new TourGuiado();
  let driverConfigCapture = null;

  // Mock global window and driver
  globalThis.window = {
    innerWidth: 1200,
    driver: {
      js: {
        driver: (config) => {
          driverConfigCapture = config;
          return {
            drive: () => {},
            destroy: () => {}
          };
        }
      }
    }
  };

  tour.iniciar(true);
  assert.ok(driverConfigCapture, 'Driver.js debe inicializarse con su configuración');
  assert.ok(Array.isArray(driverConfigCapture.steps), 'Debe contener una lista de pasos');
  assert.ok(driverConfigCapture.steps.length <= 8, `El tour debe tener máximo 8 pasos (tiene ${driverConfigCapture.steps.length})`);
  assert.equal(driverConfigCapture.steps.length, 8, 'El tour debe tener exactamente 8 pasos');
  console.log(`   ✓ Total de pasos verificado: ${driverConfigCapture.steps.length} pasos`);

  console.log('3. Verificando presencia de los elementos en index.html...');
  const indexHtml = fs.readFileSync('index.html', 'utf8');

  // Verify elements referenced in desktop/mobile
  assert.ok(indexHtml.includes('class="top-navbar"'), 'Debe existir .top-navbar');
  assert.ok(indexHtml.includes('id="canvasViewport"'), 'Debe existir #canvasViewport');
  assert.ok(indexHtml.includes('id="surfaceSwitcher"'), 'Debe existir #surfaceSwitcher');
  assert.ok(indexHtml.includes('id="panelSectionDiseno"'), 'Debe existir #panelSectionDiseno');
  assert.ok(indexHtml.includes('id="panelSectionCapas"'), 'Debe existir #panelSectionCapas');
  assert.ok(indexHtml.includes('id="panelSectionPrenda"'), 'Debe existir #panelSectionPrenda');
  assert.ok(indexHtml.includes('id="panelSectionPedido"'), 'Debe existir #panelSectionPedido');
  assert.ok(indexHtml.includes('class="brand-group"'), 'Debe existir .brand-group');
  console.log('   ✓ Todos los selectores existen en el DOM');

  console.log('4. Verificando paso final con agradecimiento y soporte a Instagram...');
  const ultimoPaso = driverConfigCapture.steps[driverConfigCapture.steps.length - 1];
  assert.equal(ultimoPaso.id, 'paso-final-agradecimiento', 'El último paso debe ser el de agradecimiento');
  assert.ok(ultimoPaso.popover.title.includes('CustomyTee'), 'El título del último paso debe incluir CustomyTee');
  assert.ok(ultimoPaso.popover.description.includes(CONFIG.INSTAGRAM_URL), 'El último paso debe incluir CONFIG.INSTAGRAM_URL');
  assert.ok(ultimoPaso.popover.description.includes('@zairen.lab'), 'Debe mencionar a @zairen.lab');
  console.log('   ✓ Paso final de agradecimiento e Instagram verificado');

  console.log('5. Verificando enlace directo de soporte en index.html...');
  assert.ok(indexHtml.includes('id="settingsSupportLink"'), 'Debe existir #settingsSupportLink');
  assert.ok(indexHtml.includes(CONFIG.INSTAGRAM_URL), 'El enlace de soporte debe apuntar a CONFIG.INSTAGRAM_URL');
  console.log('   ✓ Enlace de soporte en Ajustes verificado');

  console.log('\n===============================================================');
  console.log('TODAS LAS PRUEBAS DEL TOUR Y SOPORTE (FASE 6) PASARON CON ÉXITO');
  console.log('===============================================================\n');
});
