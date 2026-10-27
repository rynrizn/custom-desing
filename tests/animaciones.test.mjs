import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('FASE 5: Tokens de movimiento y microinteracciones CSS', () => {
  console.log('--- INICIANDO TEST DE ANIMACIONES Y MICROINTERACCIONES (FASE 5) ---');
  const css = fs.readFileSync('css/styles.css', 'utf8');

  console.log('1. Verificando tokens de animación en :root...');
  assert.ok(css.includes('--motion-duration-fast: 120ms;'), 'Debe definir --motion-duration-fast: 120ms');
  assert.ok(css.includes('--motion-duration-normal: 200ms;'), 'Debe definir --motion-duration-normal: 200ms');
  assert.ok(css.includes('--motion-duration-slow: 320ms;'), 'Debe definir --motion-duration-slow: 320ms');
  assert.ok(css.includes('--motion-ease-decel: cubic-bezier(0.2, 0.0, 0.0, 1.0);'), 'Debe incluir curva de desaceleración iOS');
  assert.ok(css.includes('--motion-ease-out: cubic-bezier(0.16, 1, 0.3, 1);'), 'Debe incluir curva ease-out');
  console.log('   ✓ Tokens de movimiento y curvas validados');

  console.log('2. Verificando microinteracción de pulsación de botones (transform scale 0.97)...');
  assert.ok(css.includes('transform: scale(0.97);'), 'Los botones deben tener escala 0.97 en active');
  assert.ok(css.includes('button:active:not(:disabled)'), 'Selector button:active:not(:disabled) presente');
  console.log('   ✓ Microinteracción táctil en botones verificada');

  console.log('3. Verificando transición suave al cambiar de superficie en la mesa...');
  assert.ok(css.includes('@keyframes surfaceSwitchFade'), 'Debe definir keyframe surfaceSwitchFade');
  assert.ok(css.includes('.surface-transitioning'), 'Debe definir clase surface-transitioning');
  assert.ok(css.includes('#workbenchCanvas {\n  transition: none !important;') || css.includes('#workbenchCanvas {\r\n  transition: none !important;'), 'El canvas no debe tener transiciones activas durante manipulación');
  console.log('   ✓ Transición de superficie y restricción de cero-lag en canvas verificadas');

  console.log('4. Verificando animaciones de modales, paneles y toasts...');
  assert.ok(css.includes('@keyframes panelFadeIn'), 'Animación de paneles con translateY y opacity');
  assert.ok(css.includes('@keyframes modalBackdropFadeIn'), 'Animación de apertura de modal');
  assert.ok(css.includes('.toast-banner'), 'Toast banner estilizado con transform y opacity');
  console.log('   ✓ Modales, paneles y toasts verificados');

  console.log('5. Verificando respeto estricto a prefers-reduced-motion y toggle manual...');
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Debe incluir @media (prefers-reduced-motion: reduce)');
  assert.ok(css.includes('body.disable-animations') && css.includes('body.reduced-motion'), 'Debe incluir clases body.disable-animations y body.reduced-motion');
  assert.ok(css.includes('animation-duration: 0.01ms !important;'), 'Debe colapsar duraciones a 0.01ms para accesibilidad');
  console.log('   ✓ Accesibilidad y soporte para movimiento reducido verificados');

  console.log('\n===============================================================');
  console.log('TODAS LAS PRUEBAS DE ANIMACIONES (FASE 5) PASARON CON ÉXITO');
  console.log('===============================================================\n');
});

test('FASE 5: Lógica del toggle de animaciones en UI', () => {
  const uiJs = fs.readFileSync('js/ui.js', 'utf8');
  assert.ok(uiJs.includes('animarTransicionSuperficie()'), 'ControladorUI debe tener animarTransicionSuperficie');
  assert.ok(uiJs.includes("localStorage.getItem('customytee_animaciones')"), 'Debe persistir en customytee_animaciones');
  assert.ok(uiJs.includes("classList?.add('reduced-motion')") && uiJs.includes("classList?.add('disable-animations')"), 'Debe alternar clases en el body');
});
