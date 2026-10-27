# CustomyTee — CAD Textil v2

Sistema CAD textil profesional para personalización, previsualización técnica y confección de poleras (camisetas) en tiempo real sobre la web. Construido íntegramente con estándares web modernos (ES Modules nativos, Canvas 2D de alta resolución y Web Crypto API) sin pasos de compilación ni dependencias pesadas al inicio (*zero-build*).

**Producción Oficial:** [https://customytee.pages.dev/](https://customytee.pages.dev/)  
**Rama de Desarrollo e Integración:** `dev-mejoras`  
**Vista Previa de la Rama en Cloudflare:** [https://dev-mejoras.customytee.pages.dev/](https://dev-mejoras.customytee.pages.dev/)  
**Taller y Marca de Agua:** ZAIRENLAB (`@zairen.lab` en [Instagram](https://www.instagram.com/zairen.lab))  

---

## 1. Novedades del Sistema

- **Identidad CustomyTee & Taller ZAIRENLAB:** Marca orientada al cliente en interfaz, títulos y archivos exportados (`CustomyTee`), preservando la identidad técnica del taller (`ZAIRENLAB`) en marcas de agua, lector administrativo (`/lector`), portal de acceso (`/acceso`) y mensajes a WhatsApp.
- **Set de Íconos de Trazo Lucide (Cero Emojis):** Sustitución del 100% de emojis por íconos de trazo SVG locales consistentes (`stroke-width="1.8"`, `currentColor`, accesibilidad `aria-hidden`), verificados por pruebas automatizadas con expresiones regulares `\p{Extended_Pictographic}`.
- **Barra Superior Funcional y Deshacer/Rehacer en la Mesa:**
  - Selector de prenda simplificado a "Polera" (con arquitectura lista para prendas adicionales).
  - Menú desplegable **Proyecto** con opciones de *Guardar proyecto*, *Abrir proyecto* y *Descargar vista previa*.
  - Modal de **Ajustes** (ícono de controles deslizantes) con unidades, fondo de mesa, imanes, cotas, toggle de animaciones, guía de uso y soporte en Instagram.
  - Selector de **Tema** segmentado (sol y luna) con contraste visual y tooltips accesibles.
  - Botón **PEDIDO** destacado para el cierre de cotización y exportación.
  - Botón **Compartir** con código QR.
  - Botones **Deshacer y Rehacer** ubicados en la barra de mesa en escritorio y en una píldora flotante compacta en móvil.
- **Corrección Geométrica de Mangas:** Mapeo anatómico verificado en anverso y reverso para todas las tallas (S a XXL), con eliminación de doble transformación angular en textos proyectados.
- **Encuadre y Zoom Inicial Adaptativo:** La polera completa se muestra centrada y visible (incluyendo el cuello) desde el inicio en pantallas móviles y escritorio ($360\text{ px}$ a $1920\text{ px}$).
- **Formato de Proyecto Abierto `.zrp`:** Paquete ZIP estándar que almacena `proyecto.json` y los artes originales en la carpeta `imagenes/`. Admite proyectos de solo texto o con imágenes, valida límites de seguridad ($\le 60\text{ MB}$, $\le 25\text{ MB}$ por imagen, máx 50 capas), rechaza amigablemente archivos `.zrn` indicando usar el `.zrp`, y permite reabrir proyectos directamente desde el `/lector` hacia el editor ("Abrir en el editor").
- **Compartir mediante Código QR:** Integración de la biblioteca `QRious` (nivel M, 4 módulos de silencio, contraste puro negro/blanco), modal accesible con copiado rápido al portapapeles, Web Share API nativa y descarga de código QR en alta resolución ($1024 \times 1024\text{ px}$).
- **Tokens de Animación y Microinteracciones a 60 fps:** Variables CSS en `:root` (`--motion-duration-fast: 120ms`, `normal: 200ms`, `slow: 320ms`, curvas iOS), pulsación con micro-escala (`active: scale(0.97)`), animación suave al alternar de superficie, animaciones restringidas estrictamente a `transform` y `opacity` sin causar retardo en el arrastre sobre el canvas, soporte a `@media (prefers-reduced-motion: reduce)` y toggle manual persistido en `localStorage` (`customytee_animaciones`).
- **Tour Guiado de 8 Pasos:** Recorrido interactivo con `Driver.js` sincronizado con la apertura/cierre de hojas móviles, paso final enfocado en el logo con mensaje de agradecimiento y enlace directo a Instagram. Persistencia en `customytee_tour_completado` e inicio manual desde Ajustes ("Ver guía de uso").
- **Cifrado Híbrido Cero-Conocimiento (.zrn):** Protección del pedido para producción en taller mediante Web Crypto API (AES-256-GCM + RSA-OAEP 3072 bits + AAD `ZRN1`).

---

## 2. Estructura del Repositorio

```text
custom-desing/
├── .gitignore                   # Exclusiones de seguridad (.env, .dev.vars, *.pem)
├── _headers                     # Cabeceras de seguridad CSP y X-Robots-Tag noindex
├── robots.txt                   # Bloqueo de indexación de rutas privadas
├── index.html                   # Editor CAD Textil CustomyTee
├── favicon.ico                  # Isotipo oficial
├── README.md                    # Manual técnico y guía de despliegue
├── css/
│   └── styles.css               # Sistema Zenith Monochrome (tokens de movimiento, 100dvh, sheets)
├── fonts/                       # Fuentes WOFF2 locales de marca y display OFL (14 fuentes)
│   ├── fonts.css                # Declaraciones @font-face locales
│   ├── poppins.woff2            # Titulares
│   ├── inter.woff2              # Cuerpo y navegación
│   ├── jetbrainsmono.woff2      # Datos técnicos y HUD
│   ├── cormorantgaramond.woff2  # Editorial
│   └── [anton, bebasneue, oswald, montserrat, playfairdisplay, lobster, pacifico, permanentmarker, bangers, caveat].woff2
├── svg/
│   ├── polera-anverso.svg       # SVG vectorial medidas reales (53x71 cm)
│   ├── polera-reverso.svg       # SVG vectorial medidas reales (53x71 cm)
│   └── manga-plana.svg          # Trapecio paramétrico de manga plana
├── js/
│   ├── config.js                # Constantes editables (URL_PUBLICA, INSTAGRAM_URL, WhatsApp, tallas)
│   ├── iconos.js                # Set de íconos SVG Lucide de trazo
│   ├── estado.js                # Estado reactivo, persistencia en localStorage y undo/redo
│   ├── polera-svg.js            # Motor geométrico y renderizado SVG
│   ├── mesa.js                  # Viewport, zoom, reglas graduadas, cuadrícula e imanes
│   ├── imagenes.js              # Carga de imágenes, cálculo de DPI y manijas 8-puntos
│   ├── texto.js                 # Motor de tipografía, estilos y renderizado
│   ├── capas.js                 # Pila de capas, reordenamiento, visibilidad y barra flotante
│   ├── mangas.js                # Gestión de piezas de mangas y sincronización espejo
│   ├── envolvente.js            # Motor de continuidad lateral anverso <-> reverso
│   ├── unidades.js              # Conversor de cm, mm e in (base interna mm)
│   ├── pedido.js                # Gestor multi-prenda y cálculo de cantidades
│   ├── exportar.js              # Generador de mockups acotados, marca de agua y paquete .zrn
│   ├── almacenamiento.js        # Formato de proyecto .zrp (ZIP/JSZip) y autoguardado en IndexedDB
│   ├── cifrado.js               # Web Crypto RSA-OAEP + AES-GCM formato .zrn
│   ├── tour.js                  # Tour guiado interactivo con Driver.js (8 pasos)
│   ├── ui.js                    # Controlador DOM, hojas deslizables, modales y microinteracciones
│   └── main.js                  # Orquestador del ciclo de vida y eventos de puntero
├── tests/                       # Suites de pruebas automatizadas Node.js
│   ├── sin-emojis.mjs           # Verificación de ausencia total de emojis
│   ├── auditoria-cierre.test.mjs# Auditoría integral de 10 puntos del sistema
│   ├── proyecto-zrp.test.mjs    # Pruebas de guardado/apertura de formato .zrp
│   ├── qr.test.mjs              # Pruebas de generación y exportación de QR
│   ├── animaciones.test.mjs     # Pruebas de tokens de movimiento y reduced-motion
│   ├── tour.test.mjs            # Pruebas de pasos y enlaces del tour guiado
│   ├── mangas-aislamiento.test.mjs # Corrección de mangas y aislamiento
│   ├── centrado-alineacion.test.mjs# Centrado visual real y botones de alineación
│   ├── cifrado.test.mjs         # Pruebas criptográficas Web Crypto RSA-3072 y .zrn
│   ├── tallas-geometria.test.mjs# Medidas reales M (53x71 cm), cotas y factores sx/sy
│   ├── interaccion.test.mjs     # Manijas táctiles, hit-testing y guías magnéticas
│   ├── interfaz-movil.test.mjs  # Barra flotante adaptable y hoja en 3 posiciones
│   └── guardado-proyecto.test.mjs # Autoguardado, Blobs, proyecto JSON y código ZRN
├── acceso/                      # Portal de inicio de sesión administrativo
├── lector/                      # Visor administrativo de pedidos .zrn y apertura en editor
└── functions/                   # Cloudflare Pages Functions (/api/login, /api/clave, etc.)
```

---

## 3. Batería de Pruebas Automatizadas

Para ejecutar todas las pruebas automatizadas de regresión, seguridad, geometría y usabilidad:

```bash
# Ejecutar todas las suites de prueba en Node.js
node --test tests/*.test.mjs; node tests/sin-emojis.mjs
```

---

## 4. Guía de Parámetros en Cloudflare Pages

Para la configuración completa de secretos y variables de entorno del portal administrativo, consulta la [Guía Maestra de Cloudflare](docs/CLOUDFLARE.md).

- **`ADMIN_PASSWORD`** (*Secret*): Contraseña de acceso al login administrativo en `/acceso`.
- **`SESSION_SECRET`** (*Secret*): Cadena aleatoria de 64 caracteres hex para firma HMAC-SHA256 de cookies.
- **`PRIVATE_KEY_ENC`** (*Secret*): Clave privada RSA-3072 PKCS#8 cifrada con PBKDF2 (600.000 iteraciones) + AES-GCM (`ZRNK1:`).
- **`CLAVE_PUBLICA`** (*PlainText*): Clave pública RSA-3072 SPKI Base64 (`ZRNP1:`).

---

## 5. Procedimiento de Fusión a `main`

El trabajo completo de evolución se encuentra consolidado en la rama de integración `dev-mejoras`.  
Para fusionar hacia producción tras la validación en la URL de vista previa:

```bash
# 1. Asegurar rama local dev-mejoras actualizada
git checkout dev-mejoras
git pull origin dev-mejoras

# 2. Fusionar hacia main con commit de fusión explícito
git checkout main
git merge --no-ff dev-mejoras -m "feat: integrar CustomyTee CAD Textil v2 (Fases 1 a 7)"

# 3. Publicar a producción en Cloudflare Pages
git push origin main
```
