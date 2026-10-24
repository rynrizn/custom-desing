# ZAIREN — CAD Textil v2

Sistema CAD textil profesional para personalización, previsualización técnica y confección de poleras (camisetas) en tiempo real sobre la web. Construido íntegramente con estándares web modernos (ES Modules nativos, Canvas 2D de alta resolución y Web Crypto API) sin pasos de compilación ni dependencias pesadas al inicio.

🌐 **Producción:** [https://customytee.pages.dev/](https://customytee.pages.dev/)  
🌿 **Rama de Desarrollo v2:** `dev-editor-svg`  
🧪 **Vista Previa de Rama en Cloudflare:** `https://dev-editor-svg.customytee.pages.dev/`

---

## 1. Novedades de la Versión 2.0

- **Polera Vectorial SVG Paramétrica:** Medidas físicas reales basadas en talla M ($53 \times 71\text{ cm}$), con origen en el punto más alto del hombro, ruedo suavizado, cuello acanalado de 1.5 cm, volumen por gradientes suaves y microtextura textil.
- **Escalado Matemático por Talla:** Matriz dimensional $sx = \text{ancho}/53$, $sy = \text{largo}/71$ para tallas S, M, L, XL y XXL. Los estampados preservan sus centímetros reales 1:1 independientemente de la talla elegida.
- **4 Superficies de Trabajo:**
  1. Pecho (`anverso`)
  2. Espalda (`reverso`)
  3. Manga Izquierda (`manga_izquierda` del portador)
  4. Manga Derecha (`manga_derecha` del portador)
- **Pieza Plana de Mangas y Modo Espejo:** Trapecio paramétrico SVG con opción de sincronización simétrica automática y botón de volteo horizontal (para preservar la lectura de textos).
- **Motor Tipográfico Integrado:** 14 fuentes tipográficas (4 de identidad de marca + 10 fuentes OFL de Google Fonts) alojadas localmente en formato WOFF2 en `fonts/` con soporte de contorno, sombra, tracking e interlineado.
- **Edición Gráfica tipo Canva:** 8 manijas de transformación independientes (esquinas proporcionales y laterales unidireccionales), rotación con imán angular, y aviso visual si la imagen baja de 150 DPI.
- **Gestión Multi-Polera:** Permite diseñar múltiples poleras en un solo pedido, desglosando cantidades por talla (ej. 2 en M y 1 en L con el mismo diseño).
- **Cifrado Híbrido Cero-Conocimiento (.zrn):** Protección de pedidos mediante Web Crypto API (AES-256-GCM + RSA-OAEP 3072 bits + AAD `ZRN1`). La clave privada reside cifrada con una Frase Secreta del taller y se descifra únicamente en la memoria del navegador del administrador.
- **Portal Administrativo Protegido:** Rutas privadas `/acceso` (login en tiempo constante), `/lector` (visor y descompresor de pedidos) y `/lector/configurar` (aprovisionador de claves) respaldadas por Cloudflare Pages Functions.
- **Tour Guiado con Driver.js:** Recorrido interactivo de 5 pasos cortos adaptado a pantallas táctiles y escritorio.

---

## 2. Estructura del Repositorio

```text
custom-desing/
├── .gitignore                   # Exclusiones de seguridad (.env, .dev.vars, *.pem)
├── _headers                     # Cabeceras de seguridad CSP y X-Robots-Tag noindex
├── robots.txt                   # Bloqueo de indexación de rutas privadas
├── index.html                   # Editor CAD Textil v2 público
├── favicon.ico                  # Isotipo ZAIREN
├── README.md                    # Manual técnico y guía de despliegue
├── css/
│   └── styles.css               # Sistema de diseño Zenith Monochrome (100dvh, sheets, tokens)
├── fonts/                       # Fuentes WOFF2 locales de marca y display OFL
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
│   ├── config.js                # Constantes editables (WhatsApp, clave pública, tallas)
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
│   ├── exportar.js              # Generador de mockups acotados y marca de agua
│   ├── cifrado.js               # Web Crypto RSA-OAEP + AES-GCM formato .zrn
│   ├── tour.js                  # Tour interactivo con Driver.js
│   ├── ui.js                    # Controlador DOM, hojas deslizables y diálogos
│   └── main.js                  # Orquestador del ciclo de vida y eventos de puntero
├── acceso/
│   ├── index.html               # Página de inicio de sesión administrativo
│   └── login.js                 # Cliente de login hacia /api/login
├── lector/
│   ├── index.html               # Visor administrativo de pedidos .zrn
│   ├── lector.js                # Descifrador local y extractor en navegador
│   └── configurar/
│       ├── index.html           # Generador de pares RSA 3072 bits
│       └── configurar.js        # Cifrado PBKDF2 de clave privada
└── functions/                   # Cloudflare Pages Functions
    ├── api/
    │   ├── login.js             # Validación tiempo constante + emisión de cookie HMAC
    │   ├── logout.js            # Revocación de sesión
    │   └── clave.js             # Entrega de PRIVATE_KEY_ENC a sesiones autenticadas
    └── lector/
        └── _middleware.js       # Protección de ruta /lector/*
```

---

## 3. Guía de Configuración en Cloudflare Pages

Para la guía detallada con capturas y fichas técnicas de cada parámetro, consulta el documento completo:  
👉 **[Guía Maestra de Cloudflare Pages](docs/CLOUDFLARE.md)**

### Resumen de los 5 Parámetros del Sistema:

1. **`ADMIN_PASSWORD`** (*Secret*): Contraseña de acceso al login administrativo en `/acceso`.
2. **`SESSION_SECRET`** (*Secret*): Cadena aleatoria de 64 caracteres hex (32 bytes) para firma HMAC-SHA256 de cookies.
3. **`PRIVATE_KEY_ENC`** (*Secret*): Clave privada RSA-3072 PKCS#8 cifrada con PBKDF2 (600.000 iteraciones) + AES-GCM, con prefijo `ZRNK1:`.
4. **`CLAVE_PUBLICA`** (*PlainText*): Clave pública RSA-3072 SPKI Base64 con prefijo `ZRNP1:` (servida dinámicamente vía `GET /api/publica`).
5. **`LOGIN_KV`** (*KV Binding, opcional*): Namespace KV para mitigar ataques de fuerza bruta (máximo 5 intentos en 15 min).

> **IMPORTANTE:** Cada vez que agregues o modifiques variables o secretos en Cloudflare Pages, debes re-desplegar (*Retry deployment* o hacer un nuevo push) para que las funciones tomen los nuevos valores.

---

### Paso 2: Generar tus Claves Criptográficas y Frase Secreta
1. Inicia sesión en `/acceso` y abre `/lector/configurar`.
2. Escribe una **Frase Secreta** fuerte (el asistente exige al menos 16 caracteres o 5 palabras).
3. Haz clic en **GENERAR CLAVES CRIPTOGRÁFICAS**.
4. Copia `CLAVE_PUBLICA` (prefijo `ZRNP1:`) y `PRIVATE_KEY_ENC` (prefijo `ZRNK1:`) y configúralas en Cloudflare Pages.
5. Descarga la copia de seguridad `.json` para custodia offline.
6. Usa la **Caja de comprobación** integrada para verificar que las claves y la frase coincidan antes de recibir pedidos reales.

---

### Paso 3: Configurar el WhatsApp del Negocio
En `js/config.js`:
```javascript
export const CONFIG = {
  WHATSAPP_NEGOCIO: '+59174522654', // Número del taller para recibir pedidos directos
  // ...
};
```

---

## 4. Pruebas Locales con Wrangler

Para probar las Cloudflare Pages Functions en tu entorno local:

1. Crea un archivo `.dev.vars` en la raíz (este archivo está excluido en `.gitignore`):
```ini
ADMIN_PASSWORD=mi-clave-super-secreta
SESSION_SECRET=un-secreto-aleatorio-muy-largo-para-hmac-32caracteres
PRIVATE_KEY_ENC={"salt":"...","iv":"...","ciphertext":"...","iterations":600000,"hash":"SHA-256"}
```

2. Ejecuta Wrangler:
```bash
npx wrangler pages dev .
```

---

## 5. Procedimiento para Merge a `main`

El trabajo actual se encuentra aislado en la rama `dev-editor-svg`. Para pasar a producción:

1. Prueba todas las funciones en la URL de prueba de Cloudflare Pages:
   `https://dev-editor-svg.customytee.pages.dev/`
2. Una vez que hayas verificado la edición, el pedido, la vista previa y el lector:
```bash
git checkout main
git merge --no-ff dev-editor-svg -m "feat: evolucionar a CAD Textil v2 con SVG paramétrico y cifrado .zrn"
git push origin main
```
Cloudflare Pages desplegará automáticamente la versión final a producción en `https://customytee.pages.dev/`.
