# ZAIREN — Diseñador de Poleras

🌐 **Sitio Web en Vivo:** [https://customytee.pages.dev/](https://customytee.pages.dev/)

Aplicación web interactiva para personalizar poleras (camisetas) en tiempo real, permitiendo previsualizar diseños en anverso y reverso, cambiar tallas y colores, ajustar cotas y exportar un paquete técnico en formato ZIP.

## Estructura del Proyecto

```text
custom-desing/
├── index.html              # Punto de entrada HTML
├── favicon.ico             # Favicon oficial de la aplicación
├── css/
│   └── styles.css          # Estilos y variables del sistema visual Zenith Monochrome
├── js/
│   ├── app.js              # Lógica de renderizado en canvas, interactividad y exportación ZIP
│   └── polera-assets.js    # Activos de alta resolución de la polera para despliegue sin restricciones
├── img/
│   ├── polera-anverso.png  # Fotografía base anverso (2000x2000)
│   └── polera-reverso.png  # Fotografía base reverso (2000x2000)
├── LICENSE                 # Licencia del proyecto
└── README.md               # Documentación del proyecto
```

## Características

- **Diseño interactivo sobre canvas:** Arrastra, rota y redimensiona múltiples imágenes por lado con guías magnéticas inteligentes y proporción 1:1 exacta.
- **Vistas Anverso / Reverso:** Edición independiente por cada lado con opción de diseño envolvente ("continuar por atrás").
- **Tallas y colores:** Selección de tallas (S, M, L, XL, XXL) con medidas físicas en centímetros y paleta de colores o selector hexadecimal libre.
- **Exportación ZIP completa:** Genera un archivo ZIP con los mockups de las poleras en alta resolución (2240px con cotas y reglas), las imágenes originales de los diseños en calidad nativa y la hoja técnica `especificaciones.txt` para confección/estampado.

## Acceso y Despliegue

- **Producción:** Accede directamente desde [https://customytee.pages.dev/](https://customytee.pages.dev/).
- **Local:** No requiere instalación de dependencias, servidores ni bundlers. Simplemente abre `index.html` en cualquier navegador web moderno.
