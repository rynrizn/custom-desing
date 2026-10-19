# Tareas — Separar Web ZAIREN en Archivos

## Fase 1: Organizar Estructura de Archivos

### Tarea 1: Crear carpetas y mover imágenes
**Descripción:** Crear las carpetas `css/`, `js/` e `img/`, y mover `polera-anverso.png` y `polera-reverso.png` desde la raíz a `img/`. El JS ya las busca en `img/`, así que al moverlas se corrige el bug principal.

**Criterios de aceptación:**
- [x] Existen las carpetas `css/`, `js/`, `img/`
- [x] `img/polera-anverso.png` y `img/polera-reverso.png` existen
- [x] Los archivos originales ya no están en la raíz

**Verificación:**
- [x] `ls img/` muestra ambas imágenes

**Dependencias:** Ninguna

**Archivos afectados:** `polera-anverso.png`, `polera-reverso.png` (mover)

**Alcance:** XS (0 archivos de código, solo mover)

---

### Tarea 2: Extraer CSS a `css/styles.css`
**Descripción:** Copiar todo el contenido dentro de `<style>...</style>` (líneas 14–1010 del HTML original) al archivo `css/styles.css`.

**Criterios de aceptación:**
- [x] `css/styles.css` contiene todos los estilos (variables, reset, componentes, responsive)
- [x] No se modifica ni omite ninguna regla CSS

**Verificación:**
- [x] El archivo tiene ~996 líneas de CSS
- [x] Contiene `:root`, `[data-theme="dark"]` y el media query `@media (max-width: 960px)`

**Dependencias:** Tarea 1

**Archivos afectados:** `css/styles.css` (crear)

**Alcance:** S (1 archivo)

---

### Tarea 3: Extraer JS a `js/app.js`
**Descripción:** Copiar todo el contenido dentro de `<script>...</script>` (líneas 1336–3663 del HTML original) al archivo `js/app.js`. El JS no necesita modificaciones ya que las rutas de imágenes (`img/polera-anverso.png`) ya están correctas tras mover las imágenes en la Tarea 1.

**Criterios de aceptación:**
- [x] `js/app.js` contiene todo el JavaScript (~2327 líneas)
- [x] Incluye `CONFIG_PRENDAS`, `state`, `imageCache`, todas las funciones y `window.onload`
- [x] Las rutas `img/polera-anverso.png` e `img/polera-reverso.png` en CONFIG_PRENDAS están intactas

**Verificación:**
- [x] El archivo empieza con el bloque `CONFIG_PRENDAS`
- [x] El archivo termina con el bloque `window.onload`
- [x] No hay errores de sintaxis JS

**Dependencias:** Tarea 1

**Archivos afectados:** `js/app.js` (crear)

**Alcance:** S (1 archivo)

---

### Tarea 4: Crear `index.html` limpio
**Descripción:** Crear un `index.html` que contenga solo el HTML del body del archivo original, con `<link>` a `css/styles.css`, `<script>` para JSZip (CDN) y `<script>` para `js/app.js`. Todo el markup del `<body>` se preserva idéntico.

**Criterios de aceptación:**
- [x] `index.html` enlaza correctamente `css/styles.css` y `js/app.js`
- [x] Carga JSZip desde el CDN (igual que antes)
- [x] El HTML del body es idéntico al original
- [x] Las fuentes de Google Fonts cargan correctamente

**Verificación:**
- [x] Abrir `index.html` en Chrome sin servidor local
- [x] La polera aparece con la foto real (no fallback gris)
- [x] Cambiar color funciona
- [x] Subir imagen funciona
- [x] Exportar ZIP funciona
- [x] Modo oscuro funciona
- [x] Responsive funciona en móvil

**Dependencias:** Tareas 2, 3

**Archivos afectados:** `index.html` (crear)

**Alcance:** S (1 archivo)

---

## Checkpoint: Estructura Completa
- [x] `index.html` abre correctamente en el navegador
- [x] Las fotos reales de la polera se muestran (no el fallback sintético)
- [x] Personalización completa funciona (color, talla, subir diseño, alinear, rotar, exportar)
- [x] No hay errores en consola del navegador

---

## Fase 2: Limpieza

### Tarea 5: Eliminar archivo monolítico y actualizar README
**Descripción:** Eliminar `dise_ador_de_poleras_zairen.html` (ya reemplazado por la estructura separada) y actualizar `README.md` con una breve descripción de la estructura del proyecto.

**Criterios de aceptación:**
- [ ] `dise_ador_de_poleras_zairen.html` eliminado
- [ ] `README.md` describe la estructura de archivos y cómo usar el proyecto

**Verificación:**
- [ ] La raíz del proyecto solo contiene: `index.html`, `css/`, `js/`, `img/`, `tasks/`, `LICENSE`, `README.md`
- [ ] `index.html` sigue funcionando correctamente

**Dependencias:** Checkpoint anterior

**Archivos afectados:** `dise_ador_de_poleras_zairen.html` (eliminar), `README.md` (editar)

**Alcance:** XS (2 archivos)

---

## Checkpoint: Proyecto Finalizado
- [ ] Estructura limpia y organizada
- [ ] Todas las funcionalidades del personalizador de poleras funcionan
- [ ] Imágenes reales cargan sin problemas
