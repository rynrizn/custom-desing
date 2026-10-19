# ZAIREN — Diseñador de Poleras

Aplicación web interactiva para personalizar poleras (camisetas) en tiempo real, permitiendo previsualizar diseños en anverso y reverso, cambiar tallas y colores, ajustar cotas y exportar un paquete técnico en formato ZIP.

## Estructura del Proyecto

```text
custom-desing/
├── index.html              # Punto de entrada HTML limpio
├── css/
│   └── styles.css          # Estilos y variables del sistema visual Zenith Monochrome
├── js/
│   └── app.js              # Lógica de renderizado en canvas, interactividad y exportación ZIP
├── img/
│   ├── polera-anverso.png  # Fotografía base anverso (2000x2000)
│   └── polera-reverso.png  # Fotografía base reverso (2000x2000)
├── tasks/                  # Planes de implementación y seguimiento
├── LICENSE                 # Licencia del proyecto
└── README.md
```

## Características

- **Diseño interactivo sobre canvas:** Arrastra, rota y redimensiona tu diseño con guías magnéticas inteligentes.
- **Vistas Anverso / Reverso:** Edición independiente por cada lado con opción de diseño envolvente ("continuar por atrás").
- **Tallas y colores:** Selección de tallas (S, M, L, XL, XXL) con medidas en centímetros y paleta de colores o selector hexadecimal libre.
- **Exportación ZIP:** Genera un archivo ZIP con las vistas en alta resolución (2000px), cotas técnicas y hoja de especificaciones para taller de confección.

## Uso

No requiere instalación de dependencias, servidores ni bundlers. Simplemente abre `index.html` en cualquier navegador web moderno.
