/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Configuración y Constantes de Negocio
 * ============================================================================
 * Todos los valores editables de negocio, calibración, WhatsApp,
 * dimensiones de prendas y clave pública de cifrado residen aquí.
 */

export const CONFIG = {
  // Información de Marca y Negocio
  APP_NAME: 'ZAIREN CAD Textil',
  APP_VERSION: 'v2.0',
  WHATSAPP_NEGOCIO: '+591XXXXXXXX', // Número del taller para recibir pedidos

  // Clave Pública RSA-OAEP 3072 bits (SHA-256) en formato SPKI Base64.
  // Puede ser pública de forma segura; solo el administrador con su frase secreta
  // puede descifrar los pedidos .zrn generados con ella.
  // Reemplazar con la clave generada en /lector/configurar
  RSA_PUBLIC_KEY: '',

  // Tabla de Tallas del Cuerpo (en centímetros reales para la polera base)
  // Medidas: ancho de sisa a sisa / largo desde el punto alto del hombro al ruedo
  TALLAS_CUERPO: {
    S:   { ancho: 50, largo: 69, estimada: true },
    M:   { ancho: 53, largo: 71, estimada: false }, // Talla M es la base de referencia (53 x 71 cm)
    L:   { ancho: 54, largo: 72, estimada: false },
    XL:  { ancho: 57, largo: 74, estimada: true },
    XXL: { ancho: 60, largo: 76, estimada: true }
  },

  // Dimensiones Paramétricas de las Mangas Planas (en centímetros)
  // alto: largo de la manga desde la sisa al puño
  // boca: ancho de la abertura de la manga (puño plano)
  // union: ancho en la costura de unión con el cuerpo
  TALLAS_MANGAS: {
    S:   { alto: 18, boca: 15.5, union: 17.5 },
    M:   { alto: 19, boca: 16.5, union: 18.5 },
    L:   { alto: 21, boca: 18.5, union: 20.5 },
    XL:  { alto: 22, boca: 19.5, union: 21.5 },
    XXL: { alto: 23, boca: 20.5, union: 22.5 }
  },

  // Zonas Máximas de Estampado Recomendadas (en centímetros)
  ZONAS_IMPRESION: {
    anverso:         { ancho: 30, alto: 40, label: '30 × 40 cm (Pecho)' },
    reverso:         { ancho: 30, alto: 40, label: '30 × 40 cm (Espalda)' },
    manga_izquierda: { ancho: 10, alto: 12, label: '10 × 12 cm (Manga Izq)' },
    manga_derecha:   { ancho: 10, alto: 12, label: '10 × 12 cm (Manga Der)' }
  },

  // Calibración visual del cuello para la silueta SVG (en centímetros)
  CUELLO: {
    anchoAberturaCm: 18.0,
    anchoBandaCm: 1.5,
    caidaAnversoCm: 8.0, // Caída del borde interior desde y=0
    caidaReversoCm: 2.0  // Caída del borde interior desde y=0
  },

  // Paleta de Colores Oficial (Zenith Monochrome de DESIGN.md + Básicos Textiles)
  PALETA_COLORES: [
    { nombre: 'Blanco Zairen',   hex: '#FAF9F6' },
    { nombre: 'Negro Zairen',    hex: '#0A0A0A' },
    { nombre: 'Gris Grafito',    hex: '#4A4A4A' },
    { nombre: 'Gris Neutro N2',  hex: '#D6D6D3' },
    { nombre: 'Carmesí Zairen',  hex: '#BA002C' },
    { nombre: 'Azul Grafito',    hex: '#3A4A5C' },
    { nombre: 'Terracota Cine',  hex: '#8B5E4A' },
    { nombre: 'Verde Tarija',    hex: '#5C6650' },
    { nombre: 'Azul Marino',     hex: '#1B2A4A' },
    { nombre: 'Arena Crudo',     hex: '#E8DFD1' }
  ],

  // Tipografías Disponibles para el Motor de Texto
  // Incluye las fuentes de marca Zenith Monochrome y las 10 fuentes OFL adicionales
  TIPOGRAFIAS: [
    { id: 'Poppins',          nombre: 'Poppins (Titular)',      categoria: 'marca',  fallback: 'sans-serif' },
    { id: 'Inter',            nombre: 'Inter (Cuerpo)',          categoria: 'marca',  fallback: 'sans-serif' },
    { id: 'Cormorant Garamond', nombre: 'Cormorant (Editorial)', categoria: 'marca', fallback: 'serif' },
    { id: 'JetBrains Mono',   nombre: 'JetBrains Mono (Técnico)',categoria: 'marca', fallback: 'monospace' },
    { id: 'Anton',            nombre: 'Anton (Impacto)',         categoria: 'display',fallback: 'sans-serif' },
    { id: 'Bebas Neue',       nombre: 'Bebas Neue (Condensada)', categoria: 'display',fallback: 'sans-serif' },
    { id: 'Oswald',           nombre: 'Oswald (Firme)',          categoria: 'sans',   fallback: 'sans-serif' },
    { id: 'Montserrat',       nombre: 'Montserrat (Geométrica)', categoria: 'sans',   fallback: 'sans-serif' },
    { id: 'Playfair Display', nombre: 'Playfair Display (Elegante)', categoria: 'serif', fallback: 'serif' },
    { id: 'Lobster',          nombre: 'Lobster (Cursiva Retro)', categoria: 'script', fallback: 'cursive' },
    { id: 'Pacifico',         nombre: 'Pacifico (Brush)',        categoria: 'script', fallback: 'cursive' },
    { id: 'Permanent Marker', nombre: 'Permanent Marker (Marcador)', categoria: 'display', fallback: 'cursive' },
    { id: 'Bangers',          nombre: 'Bangers (Cómic)',         categoria: 'display',fallback: 'cursive' },
    { id: 'Caveat',           nombre: 'Caveat (Manuscrita)',     categoria: 'handwriting', fallback: 'cursive' }
  ],

  // Parámetros Técnicos de Exportación
  RESOLUCION_DPI_ESTAMPADO: 300,
  RESOLUCION_DPI_MINIMA_ALERTA: 150,
  PIXELES_MAX_LADO_ESTAMPADO: 6000,
  RESOLUCION_MOCKUP_PX: 2240,

  // Límites de Archivos
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB
  FORMATOS_SOPORTADOS: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
};
