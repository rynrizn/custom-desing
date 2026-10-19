# Plan de Implementación: Separar Web en Archivos y Corregir Rutas de Imágenes

## Resumen

El proyecto consiste en un diseñador de poleras (camisetas) ZAIREN actualmente contenido en un **único archivo HTML monolítico** de ~3665 líneas (`dise_ador_de_poleras_zairen.html`) con todo el CSS y JS incrustado. Las imágenes de la polera (`polera-anverso.png` y `polera-reverso.png`) están en la **raíz del repo**, pero el código las busca en `img/polera-anverso.png` y `img/polera-reverso.png` — por lo que **no cargan** y se usa un fallback sintético.

### Objetivo

Separar la web en archivos organizados (HTML + CSS + JS), mover las imágenes a la carpeta correcta y que todo funcione al abrir `index.html` localmente.

## Estado Actual

```
custom-desing/
├── dise_ador_de_poleras_zairen.html   ← 141 KB, todo junto (HTML + CSS + JS)
├── polera-anverso.png                  ← 1.5 MB, foto real del frente
├── polera-reverso.png                  ← 2.4 MB, foto real de la espalda
├── LICENSE
└── README.md
```

### Problemas Detectados

| # | Problema | Impacto |
|---|----------|---------|
| 1 | Imágenes en raíz pero el JS las busca en `img/` → nunca cargan las fotos reales, siempre usa fallback sintético | **Alto** — la polera real no se muestra |
| 2 | Todo en un solo archivo de 141 KB → difícil de mantener y editar | **Medio** — mantenibilidad |
| 3 | Nombre del archivo HTML con caracteres raros (`dise_ador_de_poleras_zairen.html`) | **Bajo** — confuso pero funcional |

## Decisiones de Arquitectura

- **Estructura simple:** Solo HTML + CSS + JS + img. Sin bundlers, sin frameworks, sin npm. Se abre con doble clic en el navegador.
- **Un solo archivo JS:** El JavaScript tiene mucho estado global compartido y funciones interdependientes. Dividirlo en múltiples archivos requeriría módulos ES o un refactor profundo que escapa del alcance. Se extrae a `js/app.js` como un único script.
- **Un solo archivo CSS:** Todos los estilos se extraen a `css/styles.css`.
- **Carpeta `img/`:** Se mueven las imágenes reales del repo a `img/` (donde ya las busca el JS), no al revés — así evitamos tocar las ~20 referencias de calibración en el código.
- **Punto de entrada:** `index.html` limpio y legible.

### Estructura Final

```
custom-desing/
├── index.html              ← HTML limpio, enlaza CSS y JS
├── css/
│   └── styles.css          ← Todo el CSS extraído
├── js/
│   └── app.js              ← Todo el JS extraído
├── img/
│   ├── polera-anverso.png  ← Movidas desde la raíz
│   └── polera-reverso.png
├── LICENSE
└── README.md
```

## Lista de Tareas

### Fase 1: Organizar Estructura de Archivos

- [ ] Tarea 1: Crear carpetas `css/`, `js/`, `img/` y mover las imágenes
- [ ] Tarea 2: Extraer CSS a `css/styles.css`
- [ ] Tarea 3: Extraer JS a `js/app.js`
- [ ] Tarea 4: Crear `index.html` limpio con enlaces a CSS, JS e imágenes

### Checkpoint: Estructura
- [ ] Al abrir `index.html` en el navegador, la polera se muestra con las fotos reales (no el fallback sintético)
- [ ] Se puede cambiar color, talla, subir diseño y exportar ZIP
- [ ] No hay errores en la consola del navegador

### Fase 2: Limpieza
- [ ] Tarea 5: Eliminar el archivo monolítico original y actualizar README

### Checkpoint: Completo
- [ ] Proyecto funcional con archivos separados
- [ ] Imágenes reales cargan correctamente
- [ ] Todas las funcionalidades del personalizador funcionan

## Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| El JS usa variables globales extensivamente → dificultaría dividirlo en módulos | Medio | Mantener un solo archivo `app.js` por ahora |
| JSZip se carga desde CDN → si no hay internet, no exporta ZIP | Bajo | Ya existía antes, no cambia |
| Mover las imágenes rompe git history de esos archivos | Bajo | Es un movimiento limpio, git lo detecta como rename |

## Preguntas Abiertas

_Ninguna. El alcance es claro y limitado._
