# CustomyTee — Estado del Proyecto CAD Textil

Documento técnico del estado actual del editor CAD textil web **CustomyTee** (anteriormente CAD Textil v2), desplegado en **Cloudflare Pages** con funciones serverless (Pages Functions) y arquitectura de módulos ES nativos sin compilación (*zero-build*).

**URL Pública Oficial:** [https://customytee.pages.dev](https://customytee.pages.dev)  
**Taller y Marca de Agua:** ZAIRENLAB (`@zairen.lab`, [Instagram](https://www.instagram.com/zairen.lab))  
**Rama de integración:** `dev-mejoras`  

---

## 1. Resumen Ejecutivo de la Evolución (Fases 1 a 7)

El proyecto ha completado su ciclo de mejoras técnicas, de marca, usabilidad y rendimiento:

| Fase | Ámbito | Descripción y Resultados |
| :--- | :--- | :--- |
| **Fase 1** | Marca, Íconos y Barra Superior | Unificación de marca a **CustomyTee** (preservando **ZAIRENLAB** en taller, marca de agua y WhatsApp). Sustitución del 100% de emojis por íconos de trazo SVG Lucide (licencia ISC). Reorganización de barra superior con menú desplegable de Proyecto, interruptor deslizante de Ajustes, switch de tema sol/luna y botón PEDIDO. Traslado de Deshacer/Rehacer a la mesa. |
| **Fase 2** | Mangas y Pulido Visual | Corrección matemática de la proyección de mangas (mapeo anatómico anverso/reverso y eliminación de doble rotación/escala en texto). Ajuste de encuadre y zoom inicial (prenda completa visible con cuello dentro de pantalla). Fichas de manga/cuello como insignias bloqueadas con candado. Botones de guardar/abrir en pedido accesibles (contraste AA y $\ge 40\text{ px}$). |
| **Fase 3** | Formato de Proyecto `.zrp` | Implementación del formato de proyecto abierto no cifrado `.zrp` (ZIP estándar con `proyecto.json` y carpeta `imagenes/`). Validación de límites de seguridad ($\le 60\text{ MB}$, $\le 25\text{ MB}$ por imagen, máx 50 capas). Rechazo amigable si se ingresa un paquete `.zrn` del taller. Función "Abrir en el editor" desde el portal `/lector`. Doble descarga automática (`.zrn` y `.zrp`) con mismo código de pedido. |
| **Fase 4** | Compartir con Código QR | Integración de `QRious` (vía CDN permitido por CSP). Botón Compartir en barra superior que abre modal/bottom-sheet con código QR dinámico hacia la URL oficial, botón de copiar enlace con feedback, Web Share API nativa y exportación del QR en alta resolución ($1024 \times 1024\text{ px}$). |
| **Fase 5** | Animaciones y Microinteracciones | Definición de tokens de movimiento CSS (`--motion-duration-fast: 120ms`, `normal: 200ms`, `slow: 320ms`, curvas iOS). Microinteracciones en botones (`active: scale(0.97)`), transición suave al cambiar de superficie (escala $0.995 \to 1.0$ y opacidad), transiciones en paneles/toasts restringidas a `transform` y `opacity` (60 fps sin lag de arrastre en el canvas). Soporte estricto para `prefers-reduced-motion` y selector manual persistido en `localStorage` (`customytee_animaciones`). |
| **Fase 6** | Tour Interactivo y Soporte | Recorrido guiado de 8 pasos ágiles con `Driver.js`, sincronizado en móvil para abrir y cerrar automáticamente las hojas de control según el elemento enfocado. Paso final de agradecimiento enfocado en el logo de CustomyTee con enlace directo a Instagram (`@zairen.lab`). Persistencia de primera visita en `customytee_tour_completado` y acceso manual desde Ajustes ("Ver guía de uso"). Enlace directo de soporte en Ajustes. |
| **Fase 7** | Cierre y Auditoría Integral | Batería de 11 suites de pruebas automatizadas con 100% de éxito: cero emojis, cero secretos en repositorio, medidas reales de confección (M = $53 \times 71\text{ cm}$), 14 fuentes locales WOFF2, proyección de mangas sin deformaciones, validación integral del formato `.zrp`, código QR y accesibilidad de animación. |

---

## 2. Arquitectura del Archivo de Proyecto `.zrp`

El cliente dispone de un archivo de proyecto portable `.zrp` que le permite guardar y reanudar su trabajo en cualquier momento:

### 2.1. Estructura del Contenedor ZIP
```text
mi-diseno.zrp (ZIP estándar)
├── proyecto.json             # Manifiesto JSON con especificaciones completas
└── imagenes/                 # Carpeta con las imágenes originales cargadas
    ├── img_capa-1.png
    └── img_capa-2.webp
```

### 2.2. Estructura de `proyecto.json`
```json
{
  "formato": "zrp",
  "version": 1,
  "fecha": "2026-10-27T21:00:00.000Z",
  "codigoPedido": "ZRN-20261027-ABCD",
  "poleras": [
    {
      "id": "polera-1",
      "nombre": "Polera 1",
      "color": "#FAF9F6",
      "tallaVista": "M",
      "filasTalla": [
        { "talla": "M", "cantidad": 2 },
        { "talla": "L", "cantidad": 1 }
      ],
      "mangasEspejo": true,
      "mangasVoltear": false,
      "envolvente": false,
      "superficies": {
        "anverso": [
          {
            "id": "capa-1",
            "tipo": "imagen",
            "nombre": "Logo.png",
            "x": 0.0,
            "y": 28.0,
            "escalaX": 1.0,
            "escalaY": 1.0,
            "rotacion": 0,
            "opacidad": 1.0,
            "bloqueada": false,
            "visible": true,
            "volteadaH": false,
            "archivo": "imagenes/img_capa-1.png"
          }
        ],
        "reverso": [],
        "manga_izquierda": [],
        "manga_derecha": []
      }
    }
  ],
  "cliente": {
    "whatsapp": "59174522654",
    "indicaciones": ""
  }
}
```

### 2.3. Parámetros de Seguridad y Validación
- **Límite total:** $\le 60\text{ MB}$ por archivo `.zrp`.
- **Límite por imagen:** $\le 25\text{ MB}$.
- **Límite de capas:** máximo 50 capas simultáneas.
- **Protección Zip Slip:** rechazo de rutas con `../` o rutas absolutas.
- **Inyección SVG:** las imágenes SVG se procesan exclusivamente vía `Blob` en instancias `new Image()` y renderizadas en Canvas 2D, jamás insertadas en el DOM HTML.
- **Rechazo amigable de `.zrn`:** si un usuario intenta abrir un paquete `.zrn` (cifrado para taller), el sistema despliega una ventana modal explicativa indicando que use su archivo `.zrp`.

---

## 3. Sistema de Geometría y Mangas

- **Prenda Real:** Talla M base de confección con $53\text{ cm}$ de ancho de sisa a sisa y $71\text{ cm}$ de largo desde el hombro.
- **Proyección Anatómica:**
  - En vista **Anverso**, la manga izquierda del portador (`manga_izquierda`) se sitúa en la derecha del observador ($x > 0$), y la manga derecha (`manga_derecha`) en la izquierda ($x < 0$).
  - En vista **Reverso**, la manga izquierda del portador se sitúa en la izquierda del observador ($x < 0$).
- **Texto en Perspectiva de Manga:** Las capas de texto proyectadas delegan la traslación y ángulo a la matriz de perspectiva de la manga (`{ omitirTransformacion: true }`), evitando la doble rotación angular y manteniendo la nitidez tipográfica en todas las tallas.
- **Encuadre inicial:** Cálculo adaptativo del zoom ($34.5\text{ cm}$ de centro de silueta y $7.0\text{ cm}$ de margen superior de cuello) para mostrar la polera completa y centrada en cualquier viewport ($360\text{ px}$ a $1920\text{ px}$).

---

## 4. Pruebas y Aseguramiento de Calidad

El repositorio cuenta con 11 suites de pruebas automatizadas nativas en Node.js (ejecutables con `node --test tests/*.test.mjs; node tests/sin-emojis.mjs`):

1. `tests/sin-emojis.mjs`: Certifica cero emojis en todo el código HTML, JS y CSS publicado.
2. `tests/auditoria-cierre.test.mjs`: Auditoría integral de 10 puntos (cero secretos, medidas reales, WOFF2, Cloudflare Functions, .zrp, QR, animaciones).
3. `tests/proyecto-zrp.test.mjs`: Pruebas de ida y vuelta guardar $\to$ abrir `.zrp`, diseños de solo texto, adición de prendas, límites de tamaño y rechazo de `.zrn`.
4. `tests/qr.test.mjs`: Verificación de generación de QR, resolución $1024\text{ px}$, nivel de corrección M y atributos de accesibilidad.
5. `tests/animaciones.test.mjs`: Validación de tokens de animación CSS, microinteracciones `active`, clave de persistencia y soporte de movimiento reducido.
6. `tests/tour.test.mjs`: Estructura de 8 pasos del tour con Driver.js, persistencia y enlaces de soporte a Instagram.
7. `tests/mangas-aislamiento.test.mjs`: Mapeo anatómico en anverso/reverso, 2 diseños independientes de manga, y proyección en tallas S a XXL.
8. `tests/centrado-alineacion.test.mjs`: Centrado geométrico submilimétrico y botones de alineación respecto a la zona técnica de estampado.
9. `tests/cifrado.test.mjs`: Pruebas criptográficas Web Crypto RSA-3072 + AES-GCM del formato `.zrn`.
10. `tests/guardado-proyecto.test.mjs`: Autoguardado en IndexedDB, Blobs y código ZRN.
11. `tests/tallas-geometria.test.mjs`: Factores dimensionales $sx/sy$ y tablas de medidas de cuerpo y mangas.
12. `tests/interaccion.test.mjs`: Manijas táctiles de 44 px, guías magnéticas y límites de zoom.
13. `tests/interfaz-movil.test.mjs`: Hoja deslizable en 3 posiciones, barra flotante adaptada y gestos táctiles.

---

## 5. Parámetros de Cloudflare Pages

- **Framework Preset:** None / Static Site (módulos ES nativos servidos directamente desde la raíz).
- **Build Command:** *(vacío — sin compilación)*.
- **Output Directory:** *(vacío / raíz del repositorio)*.
- **Variables de Entorno (Pages Functions):**
  - `HASH_CONTRASENA`: Hash PBKDF2/SHA-256 de la contraseña de acceso al portal `/lector`.
  - `SALT_CONTRASENA`: Sal hexadecimal utilizada para verificar la autenticación en tiempo constante.
  - `FRASE_SECRETA`: Frase maestra del taller utilizada para descifrar la clave privada RSA en memoria del navegador del administrador. *(Nunca debe incluirse en código público ni en js/config.js)*.
