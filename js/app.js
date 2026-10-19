    /**
     * ============================================================================
     * SECCIÓN 1: CALIBRACIÓN Y ARQUITECTURA EXTENSIBLE DE PRENDAS
     * ============================================================================
     * Puedes editar este bloque al inicio del código para ajustar medidas,
     * calibración fotográfica en píxeles o agregar nuevas prendas en el futuro.
     */
    const CONFIG_PRENDAS = {
      polera: {
        id: 'polera',
        nombre: 'Polera Básica',
        tallaBaseFoto: 'M',
        canvasBaseSize: 2000, // Fotos base 2000x2000 px

        // Tabla de tallas en centímetros (S, XL y XXL son estimadas; fáciles de reemplazar)
        tallas: {
          S:   { ancho: 50, largo: 69, manga: 14, estimada: true },
          M:   { ancho: 53, largo: 71, manga: 15, estimada: false },
          L:   { ancho: 54, largo: 72, manga: 17, estimada: false },
          XL:  { ancho: 57, largo: 74, manga: 18, estimada: true },
          XXL: { ancho: 60, largo: 76, manga: 19, estimada: true }
        },

        // Partes coloreables de la prenda (mangas y cuello preparadas para el futuro)
        partesColoreables: {
          cuerpo: { nombre: 'Cuerpo', habilitado: true },
          mangas: { nombre: 'Mangas', habilitado: false, vincularA: 'cuerpo' },
          cuello: { nombre: 'Cuello', habilitado: false, vincularA: 'cuerpo' }
        },

        // Calibración fotográfica independiente por lado (en píxeles sobre foto 2000x2000)
        lados: {
          anverso: {
            nombre: 'Anverso',
            src: 'img/polera-anverso.png',
            siluetaXMin: 216,
            siluetaXMax: 1783,
            siluetaYMin: 201,
            siluetaYMax: 1787,
            anchoCuerpoPx: 896,      // a y ≈ 1100, sin mangas
            hombroAltoY: 235,        // Punto más alto del hombro
            bordeInferiorY: 1787,    // Borde inferior de la prenda
            axilaY: 960,             // Altura de las axilas
            baseCuelloY: 440,        // Base del cuello en el centro
            hombroMangaIzqX: 548,    // Unión hombro-manga izquierda
            hombroMangaDerX: 1452,   // Unión hombro-manga derecha
            hombroMangaY: 345,       // Altura de unión hombro-manga
            bocaMangaDerX1: 1783,    // Punto superior exterior de la boca de la manga derecha
            bocaMangaDerY1: 695,
            bocaMangaDerX2: 1575,    // Punto inferior interior de la boca de la manga derecha
            bocaMangaDerY2: 905,
            factorAlto: 1.0,         // Proporción natural 1:1 de la foto original sin compresión
            offsetXCm: 0,            // Offset horizontal editable para continuidad lateral
            offsetYCm: 0             // Offset vertical editable para continuidad lateral
          },
          reverso: {
            nombre: 'Reverso',
            src: 'img/polera-reverso.png',
            siluetaXMin: 207,
            siluetaXMax: 1792,
            siluetaYMin: 191,
            siluetaYMax: 1792,
            anchoCuerpoPx: 918,      // Ancho de cuerpo en píxeles
            hombroAltoY: 230,        // Punto más alto del hombro
            bordeInferiorY: 1792,    // Borde inferior
            axilaY: 880,             // Altura de las axilas
            baseCuelloY: 275,        // Base del cuello en el centro (espalda)
            hombroMangaIzqX: 540,    // Unión hombro-manga izquierda
            hombroMangaDerX: 1460,   // Unión hombro-manga derecha
            hombroMangaY: 340,       // Altura de unión hombro-manga
            bocaMangaDerX1: 1792,    // Punto superior exterior de la boca de la manga derecha
            bocaMangaDerY1: 690,
            bocaMangaDerX2: 1580,    // Punto inferior interior de la boca de la manga derecha
            bocaMangaDerY2: 900,
            factorAlto: 1.0,         // Proporción natural 1:1 de la foto original sin compresión
            offsetXCm: 0,
            offsetYCm: 0
          }
        }
      }
    };

    // Paleta predefinida de colores de marca (Zenith Monochrome) + básicos textiles
    const PALETA_COLORES = [
      { nombre: 'Blanco Puro', hex: '#FFFFFF' },
      { nombre: 'Negro Zenith', hex: '#141416' },
      { nombre: 'Gris Vapor', hex: '#E2E2E4' },
      { nombre: 'Gris Carbón', hex: '#47474A' },
      { nombre: 'Carmesí Zairen', hex: '#BA002C' },
      { nombre: 'Verde Cromo', hex: '#2E4D32' },
      { nombre: 'Azul Marino', hex: '#1B2A4A' },
      { nombre: 'Arena Crudo', hex: '#E8DFD1' }
    ];

    /**
     * ============================================================================
     * SECCIÓN 2: ESTADO GLOBAL DE LA APLICACIÓN Y CACHÉ DE IMÁGENES
     * ============================================================================
     */
    const state = {
      prendaId: 'polera',
      talla: 'M',
      colorCuerpo: '#FFFFFF',
      ladoActivo: 'anverso', // 'anverso' | 'reverso'
      envolventeActivo: false,
      ladoOrigenEnvolvente: 'anverso', // Lado desde el que se proyecta si hay 1 diseño o el último editado
      bloquearProporcion: true,
      mostrarCuadricula: false,
      mostrarCotas: false, // Desactivadas por defecto para mantener la mesa limpia

      // Vista de cámara en la mesa de trabajo
      zoom: 1,
      panX: 0,
      panY: 0,

      // Diseños independientes por lado (soporta múltiples imágenes por lado)
      disenos: {
        anverso: [],
        reverso: []
      },
      disenoSeleccionadoId: {
        anverso: null,
        reverso: null
      },

      // Historial para Deshacer / Rehacer
      historial: [],
      indiceHistorial: -1
    };

    function obtenerDisenosLado(ladoKey = state.ladoActivo) {
      if (!state.disenos[ladoKey] || !Array.isArray(state.disenos[ladoKey])) {
        state.disenos[ladoKey] = [];
      }
      return state.disenos[ladoKey];
    }

    function obtenerDisenoSeleccionado(ladoKey = state.ladoActivo) {
      const list = obtenerDisenosLado(ladoKey);
      if (!list.length) return null;
      const selId = state.disenoSeleccionadoId[ladoKey];
      const encontrado = list.find(d => d.id === selId);
      return encontrado || list[list.length - 1];
    }

    function seleccionarDisenoPorId(id, ladoKey = state.ladoActivo) {
      state.disenoSeleccionadoId[ladoKey] = id;
      actualizarEstadoBotonesEdicion();
      sincronizarInputsEdicion();
      actualizarIndicadoresHUD();
      solicitarRender();
    }

    // Caché en memoria para teñido instantáneo en celulares y escritorio
    const imageCache = {
      anverso: {
        normalizedCanvas: null, // Imagen 2000x2000 con luminancia normalizada al percentil 98
        screenNormalized: null, // Versión reducida (900x900) para fluidez a 60fps en móviles
        tintedScreen: null,     // Canvas teñido de pantalla cacheado
        tintedColor: null,
        costadoIzqPx: null,     // Array [y] -> x del borde izquierdo real desde la máscara de transparencia
        costadoDerPx: null      // Array [y] -> x del borde derecho real desde la máscara de transparencia
      },
      reverso: {
        normalizedCanvas: null,
        screenNormalized: null,
        tintedScreen: null,
        tintedColor: null,
        costadoIzqPx: null,
        costadoDerPx: null
      }
    };

    const SCREEN_BUFFER_SIZE = 900; // Tamaño optimizado para renderizado en pantalla en móviles

    /**
     * ============================================================================
     * SECCIÓN 3: CARGA DE IMÁGENES BASE, NORMALIZACIÓN (PERCENTIL 98) Y TEÑIDO
     * ============================================================================
     */

    /**
     * Si el usuario abre el HTML sin haber copiado aún `img/polera-anverso.png`,
     * generamos una polera blanca 2000x2000 con pliegues, cuello y sombras realistas
     * que respeta exactamente las coordenadas de calibración dadas en el prompt.
     */
    function crearPoleraSinteticaFallback(ladoKey) {
      const cal = CONFIG_PRENDAS[state.prendaId].lados[ladoKey];
      const c = document.createElement('canvas');
      c.width = 2000;
      c.height = 2000;
      const ctx = c.getContext('2d');

      const cx = 1000;
      const bodyHalf = cal.anchoCuerpoPx / 2; // ~448 anverso, ~459 reverso
      const leftBodyX = cx - bodyHalf;
      const rightBodyX = cx + bodyHalf;

      ctx.save();
      ctx.beginPath();
      // Cuello superior
      const neckLeftX = 765;
      const neckRightX = 1235;
      const neckTopY = cal.siluetaYMin;
      ctx.moveTo(neckLeftX, neckTopY);
      ctx.quadraticCurveTo(cx, cal.baseCuelloY - (ladoKey === 'anverso' ? 95 : 25), neckRightX, neckTopY);
      // Hombro derecho a manga derecha
      ctx.lineTo(cal.hombroMangaDerX, cal.hombroMangaY);
      ctx.lineTo(cal.siluetaXMax, 695);
      ctx.lineTo(1575, 905);
      ctx.lineTo(rightBodyX + 6, cal.axilaY - 85);
      // Costado derecho con ligera curva orgánica
      ctx.bezierCurveTo(
        rightBodyX - 4, (cal.axilaY + cal.bordeInferiorY) * 0.48,
        rightBodyX + 5, (cal.axilaY + cal.bordeInferiorY) * 0.78,
        rightBodyX - 2, cal.bordeInferiorY - 12
      );
      // Borde inferior
      ctx.quadraticCurveTo(cx, cal.bordeInferiorY + 8, leftBodyX + 2, cal.bordeInferiorY - 12);
      // Costado izquierdo
      ctx.bezierCurveTo(
        leftBodyX - 5, (cal.axilaY + cal.bordeInferiorY) * 0.78,
        leftBodyX + 4, (cal.axilaY + cal.bordeInferiorY) * 0.48,
        leftBodyX - 6, cal.axilaY - 85
      );
      // Manga izquierda a hombro izquierdo
      ctx.lineTo(425, 905);
      ctx.lineTo(cal.siluetaXMin, 695);
      ctx.lineTo(cal.hombroMangaIzqX, cal.hombroMangaY);
      ctx.closePath();

      // Relleno base (~235/255 luminancia como en las fotos reales)
      const gradBase = ctx.createLinearGradient(200, 200, 1800, 1800);
      gradBase.addColorStop(0, 'rgb(240,240,242)');
      gradBase.addColorStop(0.5, 'rgb(234,234,236)');
      gradBase.addColorStop(1, 'rgb(224,224,227)');
      ctx.fillStyle = gradBase;
      ctx.fill();
      ctx.clip();

      // Sombras laterales y pliegues suaves de tela para que el modo 'multiply' luzca realista
      const sideShadowL = ctx.createLinearGradient(leftBodyX, 0, leftBodyX + 140, 0);
      sideShadowL.addColorStop(0, 'rgba(0,0,0,0.11)');
      sideShadowL.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sideShadowL;
      ctx.fillRect(leftBodyX, cal.axilaY - 100, 150, 950);

      const sideShadowR = ctx.createLinearGradient(rightBodyX, 0, rightBodyX - 140, 0);
      sideShadowR.addColorStop(0, 'rgba(0,0,0,0.12)');
      sideShadowR.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sideShadowR;
      ctx.fillRect(rightBodyX - 150, cal.axilaY - 100, 150, 950);

      // Pliegues verticales sutiles
      for (let i = 0; i < 6; i++) {
        const fx = 660 + i * 135;
        const g = ctx.createLinearGradient(fx - 35, 0, fx + 35, 0);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.5, 'rgba(0,0,0,0.035)');
        g.addColorStop(1, 'rgba(255,255,255,0.03)');
        ctx.fillStyle = g;
        ctx.fillRect(fx - 35, 350, 70, 1420);
      }

      // Costura del cuello ribeteado
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(neckLeftX - 18, neckTopY + 12);
      ctx.quadraticCurveTo(cx, cal.baseCuelloY + 25, neckRightX + 18, neckTopY + 12);
      ctx.stroke();

      ctx.restore();
      return c;
    }

    /**
     * Normaliza la imagen base calculando el percentil 98 de luminancia de los píxeles
     * opacos y llevándolo a blanco puro (255), además de extraer la curva real de los
     * costados para el diseño envolvente.
     */
    function procesarYNormalizarImagenBase(imgOrCanvas, ladoKey) {
      const cal = CONFIG_PRENDAS[state.prendaId].lados[ladoKey];
      const normCanvas = document.createElement('canvas');
      normCanvas.width = 2000;
      normCanvas.height = 2000;
      const ctx = normCanvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(imgOrCanvas, 0, 0, 2000, 2000);

      const costadoIzqPx = new Float32Array(2000);
      const costadoDerPx = new Float32Array(2000);
      let pudoLeerPixeles = false;

      try {
        const imgData = ctx.getImageData(0, 0, 2000, 2000);
        const data = imgData.data;

        // 1. Histograma de luminancia (0..255) sobre píxeles opacos (alfa > 128)
        // Muestreamos cada 4 píxeles para máxima velocidad en dispositivos móviles
        const hist = new Uint32Array(256);
        let totalOpaque = 0;

        for (let i = 0; i < data.length; i += 16) {
          const a = data[i + 3];
          if (a > 128) {
            const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            hist[lum]++;
            totalOpaque++;
          }
        }

        // Encontrar el percentil 98
        let refLum = 235;
        if (totalOpaque > 0) {
          const targetCount = totalOpaque * 0.98;
          let accum = 0;
          for (let l = 0; l < 256; l++) {
            accum += hist[l];
            if (accum >= targetCount) {
              refLum = Math.max(180, l);
              break;
            }
          }
        }

        const scale = 255 / refLum;

        // 2. Normalizar RGB llevando refLum -> 255 sin alterar el canal alfa original
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 0) {
            data[i]     = Math.min(255, Math.round(data[i] * scale));
            data[i + 1] = Math.min(255, Math.round(data[i + 1] * scale));
            data[i + 2] = Math.min(255, Math.round(data[i + 2] * scale));
          }
        }
        ctx.putImageData(imgData, 0, 0);

        // 3. Extraer el borde real de los costados del cuerpo para cada fila Y (0..1999)
        const encontrarBordesEnFila = (y) => {
          const rowOffset = y * 2000 * 4;
          let leftX = 1000 - cal.anchoCuerpoPx / 2;
          let rightX = 1000 + cal.anchoCuerpoPx / 2;

          for (let x = 380; x < 950; x++) {
            if (data[rowOffset + x * 4 + 3] > 64) {
              leftX = x;
              break;
            }
          }
          for (let x = 1620; x > 1050; x--) {
            if (data[rowOffset + x * 4 + 3] > 64) {
              rightX = x;
              break;
            }
          }
          return { leftX, rightX };
        };

        const axilaY = Math.min(1999, Math.max(0, Math.round(cal.axilaY)));
        const bordesAxila = encontrarBordesEnFila(axilaY);

        for (let y = 0; y < 2000; y++) {
          if (y >= axilaY && y <= cal.bordeInferiorY) {
            const b = encontrarBordesEnFila(y);
            costadoIzqPx[y] = b.leftX;
            costadoDerPx[y] = b.rightX;
          } else if (y < axilaY) {
            const t = Math.max(0, Math.min(1, (axilaY - y) / Math.max(1, axilaY - cal.hombroMangaY)));
            costadoIzqPx[y] = bordesAxila.leftX + t * (cal.hombroMangaIzqX - bordesAxila.leftX);
            costadoDerPx[y] = bordesAxila.rightX + t * (cal.hombroMangaDerX - bordesAxila.rightX);
          } else {
            costadoIzqPx[y] = bordesAxila.leftX;
            costadoDerPx[y] = bordesAxila.rightX;
          }
        }
        pudoLeerPixeles = true;
      } catch (errSecurity) {
        // En entorno local file:// los navegadores restringen getImageData.
        // Se utilizan los bordes geométricos pre-calibrados directamente.
      }

      if (!pudoLeerPixeles) {
        const bodyHalf = cal.anchoCuerpoPx / 2;
        const axilaY = Math.min(1999, Math.max(0, Math.round(cal.axilaY)));
        const leftAxilaX = 1000 - bodyHalf;
        const rightAxilaX = 1000 + bodyHalf;

        for (let y = 0; y < 2000; y++) {
          if (y >= axilaY && y <= cal.bordeInferiorY) {
            costadoIzqPx[y] = leftAxilaX;
            costadoDerPx[y] = rightAxilaX;
          } else if (y < axilaY) {
            const t = Math.max(0, Math.min(1, (axilaY - y) / Math.max(1, axilaY - cal.hombroMangaY)));
            costadoIzqPx[y] = leftAxilaX + t * (cal.hombroMangaIzqX - leftAxilaX);
            costadoDerPx[y] = rightAxilaX + t * (cal.hombroMangaDerX - rightAxilaX);
          } else {
            costadoIzqPx[y] = leftAxilaX;
            costadoDerPx[y] = rightAxilaX;
          }
        }
      }

      // 4. Crear versión reducida para pantalla (fluidez en móviles)
      const screenCanvas = document.createElement('canvas');
      screenCanvas.width = SCREEN_BUFFER_SIZE;
      screenCanvas.height = SCREEN_BUFFER_SIZE;
      const sCtx = screenCanvas.getContext('2d');
      sCtx.imageSmoothingEnabled = true;
      sCtx.imageSmoothingQuality = 'high';
      sCtx.drawImage(normCanvas, 0, 0, SCREEN_BUFFER_SIZE, SCREEN_BUFFER_SIZE);

      imageCache[ladoKey].normalizedCanvas = normCanvas;
      imageCache[ladoKey].screenNormalized = screenCanvas;
      imageCache[ladoKey].costadoIzqPx = costadoIzqPx;
      imageCache[ladoKey].costadoDerPx = costadoDerPx;
      imageCache[ladoKey].tintedColor = null; // Forzar regeneración de tinte
    }

    /**
     * Carga las dos imágenes base (`img/polera-anverso.png` y `img/polera-reverso.png`).
     * Si no existen en el entorno actual, utiliza el generador sintético de respaldo.
     */
    async function cargarImagenesPrenda() {
      const prenda = CONFIG_PRENDAS[state.prendaId];
      const promesas = ['anverso', 'reverso'].map((ladoKey) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              procesarYNormalizarImagenBase(img, ladoKey);
            } catch (err) {
              console.error('Error procesando imagen base:', err);
            }
            resolve();
          };
          img.onerror = () => {
            // Solo si el archivo no existe en disco, se utiliza el fallback sintético
            const fallback = crearPoleraSinteticaFallback(ladoKey);
            procesarYNormalizarImagenBase(fallback, ladoKey);
            resolve();
          };
          img.src = prenda.lados[ladoKey].src;
        });
      });

      await Promise.all(promesas);
      ajustarZoomInicial();
      solicitarRender();
    }

    /**
     * Genera un canvas teñido con mezcla 'multiply' y recorte 'destination-in'
     * conservando sombras, pliegues y bordes sin halos.
     */
    function obtenerPoleraTenida(ladoKey, colorHex, usarAltaResolucion = false) {
      const cache = imageCache[ladoKey];
      const sourceCanvas = usarAltaResolucion ? cache.normalizedCanvas : cache.screenNormalized;
      if (!sourceCanvas) return null;

      if (!usarAltaResolucion && cache.tintedScreen && cache.tintedColor === colorHex) {
        return cache.tintedScreen;
      }

      const size = sourceCanvas.width;
      const outCanvas = (!usarAltaResolucion && cache.tintedScreen)
        ? cache.tintedScreen
        : document.createElement('canvas');

      outCanvas.width = size;
      outCanvas.height = size;
      const ctx = outCanvas.getContext('2d');

      ctx.clearRect(0, 0, size, size);
      // 1. Dibujar polera normalizada a blanco puro
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(sourceCanvas, 0, 0);

      // 2. Multiplicar por el color elegido
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = colorHex;
      ctx.fillRect(0, 0, size, size);

      // 3. Recortar con el canal alfa original para evitar cualquier halo en bordes
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(sourceCanvas, 0, 0);

      ctx.globalCompositeOperation = 'source-over';

      if (!usarAltaResolucion) {
        cache.tintedScreen = outCanvas;
        cache.tintedColor = colorHex;
      }
      return outCanvas;
    }

    /**
     * ============================================================================
     * SECCIÓN 4: GEOMETRÍA EN CENTÍMETROS, ESCALAS POR TALLA Y DISEÑO ENVOLVENTE
     * ============================================================================
     */

    /**
     * Devuelve los parámetros geométricos del lado indicado según la talla actual.
     * La polera se comprime verticalmente por `factorAlto` y se escala según la relación
     * entre la talla elegida y la talla M base.
     */
    function obtenerGeometriaLado(ladoKey) {
      const prenda = CONFIG_PRENDAS[state.prendaId];
      const cal = prenda.lados[ladoKey];
      const tallaBase = prenda.tallas[prenda.tallaBaseFoto]; // M: 53 x 71 cm
      const tallaActual = prenda.tallas[state.talla];

      // Escala base en unidades de foto antes de aplicar talla
      // Ancho de cuerpo (ej. 896 px) equivale a 53 cm -> ~16.905 px/cm en X
      const pxPorCmBaseX = cal.anchoCuerpoPx / tallaBase.ancho;
      // IMPORTANTE: Para que las imágenes y logotipos del usuario se mantengan 100% fieles a su
      // proporción original (sin deformarse, alargarse ni achicarse verticalmente), 1 cm horizontal
      // debe tener exactamente la misma cantidad de píxeles que 1 cm vertical.
      const pxPorCmBaseY = pxPorCmBaseX;

      // Factores de reescalado de la prenda al cambiar de talla
      const escalaTallaX = tallaActual.ancho / tallaBase.ancho;
      const escalaTallaY = tallaActual.largo / tallaBase.largo;

      // En el espacio escénico ("espacio mundo" en unidades base M), 1 cm tiene un tamaño constante
      // para que al cambiar de talla la polera crezca/se achique y el diseño conserve sus cm reales.
      const unidadesMundoPorCmX = pxPorCmBaseX;
      const unidadesMundoPorCmY = pxPorCmBaseY;

      // Dimensiones totales del lienzo de la foto ya comprimido y escalado a la talla actual
      const fotoAnchoMundo = 2000 * escalaTallaX;
      const fotoAltoMundo = 2000 * cal.factorAlto * escalaTallaY;

      // Coordenadas clave en centímetros desde el punto más alto del hombro (y=0 cm) y centro (x=0 cm)
      const cuelloYCm = ((cal.baseCuelloY - cal.hombroAltoY) * cal.factorAlto * escalaTallaY) / unidadesMundoPorCmY;
      const axilaYCm = ((cal.axilaY - cal.hombroAltoY) * cal.factorAlto * escalaTallaY) / unidadesMundoPorCmY;
      const largoTotalCm = tallaActual.largo;
      const anchoCuerpoCm = tallaActual.ancho;

      // Función que devuelve el ancho del costado izquierdo y derecho en cm para una altura yCm dada
      const obtenerCostadosCmEnY = (yCm) => {
        const cache = imageCache[ladoKey];
        if (!cache.costadoIzqPx) {
          return { izqCm: -anchoCuerpoCm / 2, derCm: anchoCuerpoCm / 2 };
        }
        // Convertir yCm a fila Y (0..1999) de la foto original 2000x2000
        const yFoto = Math.round(
          cal.hombroAltoY + (yCm * unidadesMundoPorCmY) / (cal.factorAlto * escalaTallaY)
        );
        const yClamped = Math.max(0, Math.min(1999, yFoto));
        const izqPx = cache.costadoIzqPx[yClamped];
        const derPx = cache.costadoDerPx[yClamped];

        const izqCm = ((izqPx - 1000) * escalaTallaX) / unidadesMundoPorCmX;
        const derCm = ((derPx - 1000) * escalaTallaX) / unidadesMundoPorCmX;
        return { izqCm, derCm };
      };

      return {
        cal,
        tallaActual,
        escalaTallaX,
        escalaTallaY,
        unidadesMundoPorCmX,
        unidadesMundoPorCmY,
        fotoAnchoMundo,
        fotoAltoMundo,
        cuelloYCm,
        axilaYCm,
        largoTotalCm,
        anchoCuerpoCm,
        obtenerCostadosCmEnY
      };
    }

    /**
     * Convierte coordenadas en centímetros del cuerpo (xCm desde el centro, yCm desde hombro alto)
     * a coordenadas del espacio Mundo (donde el centro de la foto 2000x2000 está en 0,0).
     */
    function cmAMundo(ladoKey, xCm, yCm) {
      const g = obtenerGeometriaLado(ladoKey);
      const hombroTopMundoY = (g.cal.hombroAltoY - 1000) * g.cal.factorAlto * g.escalaTallaY;
      return {
        wx: xCm * g.unidadesMundoPorCmX,
        wy: hombroTopMundoY + yCm * g.unidadesMundoPorCmY
      };
    }

    function mundoACm(ladoKey, wx, wy) {
      const g = obtenerGeometriaLado(ladoKey);
      const hombroTopMundoY = (g.cal.hombroAltoY - 1000) * g.cal.factorAlto * g.escalaTallaY;
      return {
        xCm: wx / g.unidadesMundoPorCmX,
        yCm: (wy - hombroTopMundoY) / g.unidadesMundoPorCmY
      };
    }

    /**
     * Construye el trazado (Path2D) del cuerpo de la polera usando la curva real de los costados
     * (extraída de la máscara de transparencia bajo la axila y recta hacia hombro-manga arriba).
     * Se utiliza para calcular el punto exacto donde el diseño envolvente dobla hacia el otro lado.
     */
    function TrazarPoligonoCostadosCuerpo(ctx, ladoKey) {
      const g = obtenerGeometriaLado(ladoKey);
      ctx.beginPath();
      const pasos = 80;
      for (let i = 0; i <= pasos; i++) {
        const yCm = (i / pasos) * g.largoTotalCm;
        const { izqCm } = g.obtenerCostadosCmEnY(yCm);
        const pt = cmAMundo(ladoKey, izqCm, yCm);
        if (i === 0) ctx.moveTo(pt.wx, pt.wy);
        else ctx.lineTo(pt.wx, pt.wy);
      }
      for (let i = pasos; i >= 0; i--) {
        const yCm = (i / pasos) * g.largoTotalCm;
        const { derCm } = g.obtenerCostadosCmEnY(yCm);
        const pt = cmAMundo(ladoKey, derCm, yCm);
        ctx.lineTo(pt.wx, pt.wy);
      }
      ctx.closePath();
    }

    /**
     * Calcula las métricas en centímetros de un diseño respecto a la base del cuello,
     * borde inferior y costados reales a la altura del centro del diseño.
     */
    function calcularMetricasDisenoCm(ladoKey, diseno) {
      if (!diseno) return null;
      const g = obtenerGeometriaLado(ladoKey);

      // Caja envolvente considerando rotación
      const rad = (diseno.angleDeg * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const bboxW = diseno.widthCm * cos + diseno.heightCm * sin;
      const bboxH = diseno.widthCm * sin + diseno.heightCm * cos;

      const topEdgeCm = diseno.yCm - bboxH / 2;
      const bottomEdgeCm = diseno.yCm + bboxH / 2;
      const leftEdgeCm = diseno.xCm - bboxW / 2;
      const rightEdgeCm = diseno.xCm + bboxW / 2;

      const yRef = Math.max(0, Math.min(g.largoTotalCm, diseno.yCm));
      const { izqCm, derCm } = g.obtenerCostadosCmEnY(yRef);

      return {
        anchoCm: diseno.widthCm,
        altoCm: diseno.heightCm,
        distCuelloCm: topEdgeCm - g.cuelloYCm,
        distBordeInfCm: g.largoTotalCm - bottomEdgeCm,
        distCostadoIzqCm: leftEdgeCm - izqCm,
        distCostadoDerCm: derCm - rightEdgeCm,
        bboxW,
        bboxH
      };
    }

    /**
     * ============================================================================
     * SECCIÓN 5: MOTOR DE RENDERIZADO (PANTALLA Y EXPORTACIÓN ALTA RESOLUCIÓN)
     * ============================================================================
     */
    const canvas = document.getElementById('workbenchCanvas');
    const ctx = canvas.getContext('2d');
    let renderPendiente = false;
    let activeSnapGuides = []; // Guías magnéticas activas durante el arrastre

    // Canvas auxiliar reutilizable para componer el diseño recortado a la silueta de la polera
    const designLayerCanvas = document.createElement('canvas');
    const designLayerCtx = designLayerCanvas.getContext('2d');

    function solicitarRender() {
      if (!renderPendiente) {
        renderPendiente = true;
        requestAnimationFrame(() => {
          renderPendiente = false;
          renderizarMesaDeTrabajo();
        });
      }
    }

    /**
     * Dibuja un objeto de diseño en el contexto actual (que ya está en coordenadas Mundo).
     */
    function dibujarObjetoDisenoEnMundo(targetCtx, ladoKey, diseno, posXCm, posYCm, opacidad = 1) {
      if (!diseno || !diseno.imgElement) return;
      const g = obtenerGeometriaLado(ladoKey);
      const centro = cmAMundo(ladoKey, posXCm, posYCm);
      const wMundo = diseno.widthCm * g.unidadesMundoPorCmX;
      const hMundo = diseno.heightCm * g.unidadesMundoPorCmY;

      targetCtx.save();
      targetCtx.globalAlpha = opacidad;
      targetCtx.translate(centro.wx, centro.wy);
      targetCtx.rotate((diseno.angleDeg * Math.PI) / 180);
      targetCtx.drawImage(diseno.imgElement, -wMundo / 2, -hMundo / 2, wMundo, hMundo);
      targetCtx.restore();
    }

    /**
     * Dibuja la continuación de los diseños envolventes desde el otro lado ("continuar por atrás").
     * Lo que sobresale por el costado izquierdo del anverso entra por el costado derecho
     * del reverso (y viceversa), siguiendo la curva real de la máscara de transparencia.
     */
    function dibujarContinuacionEnvolvente(targetCtx, ladoActualKey) {
      if (!state.envolventeActivo) return;
      const otroLadoKey = ladoActualKey === 'anverso' ? 'reverso' : 'anverso';
      const disenosOrigen = obtenerDisenosLado(otroLadoKey);
      if (!disenosOrigen.length) return;

      const gOrigen = obtenerGeometriaLado(otroLadoKey);
      const gActual = obtenerGeometriaLado(ladoActualKey);

      for (const disenoOrigen of disenosOrigen) {
        if (!disenoOrigen || !disenoOrigen.imgElement) continue;

        // Evaluamos los costados reales a la altura del centro del diseño
        const yRefOrigen = Math.max(0, Math.min(gOrigen.largoTotalCm, disenoOrigen.yCm));
        const costadosOrigen = gOrigen.obtenerCostadosCmEnY(yRefOrigen);

        const yCmEnActual = disenoOrigen.yCm + (gActual.cal.offsetYCm - gOrigen.cal.offsetYCm);
        const yRefActual = Math.max(0, Math.min(gActual.largoTotalCm, yCmEnActual));
        const costadosActual = gActual.obtenerCostadosCmEnY(yRefActual);

        // 1. Si el diseño en el lado de origen sobresale por el costado DERECHO (x > derCm):
        // continúa entrando por el costado IZQUIERDO del lado actual.
        const deltaDerCm = disenoOrigen.xCm - costadosOrigen.derCm;
        if (deltaDerCm > -disenoOrigen.widthCm) {
          const nuevoXCmIzq = costadosActual.izqCm + deltaDerCm + gActual.cal.offsetXCm;
          dibujarObjetoDisenoEnMundo(targetCtx, ladoActualKey, disenoOrigen, nuevoXCmIzq, yCmEnActual, 0.96);
        }

        // 2. Si el diseño en el lado de origen sobresale por el costado IZQUIERDO (x < izqCm):
        // continúa entrando por el costado DERECHO del lado actual.
        const deltaIzqCm = disenoOrigen.xCm - costadosOrigen.izqCm;
        if (deltaIzqCm < disenoOrigen.widthCm) {
          const nuevoXCmDer = costadosActual.derCm + deltaIzqCm + gActual.cal.offsetXCm;
          dibujarObjetoDisenoEnMundo(targetCtx, ladoActualKey, disenoOrigen, nuevoXCmDer, yCmEnActual, 0.96);
        }
      }
    }

    /**
     * Renderiza la prenda completa (polera teñida + diseño envolvente + diseños propios recortados
     * a la silueta + cuadrícula opcional + cotas). Sirve tanto para la mesa interactiva como
     * para la exportación PNG de alta resolución.
     */
    function renderizarEscenaPrenda(targetCtx, ladoKey, opciones = {}) {
      const {
        altaResolucion = false,
        incluirCotas = state.mostrarCotas,
        incluirCuadricula = state.mostrarCuadricula,
        incluirControlesEdicion = false,
        zoomActual = 1
      } = opciones;

      const g = obtenerGeometriaLado(ladoKey);
      const poleraTenida = obtenerPoleraTenida(ladoKey, state.colorCuerpo, altaResolucion);
      if (!poleraTenida) return;

      const wMundo = g.fotoAnchoMundo;
      const hMundo = g.fotoAltoMundo;

      // 1. Dibujar polera base teñida
      targetCtx.save();
      targetCtx.drawImage(poleraTenida, -wMundo / 2, -hMundo / 2, wMundo, hMundo);

      // 2. Componer diseños (envolvente + propios) recortados estrictamente a la silueta de la polera
      const disenosPropios = obtenerDisenosLado(ladoKey);
      const otroLadoKey = ladoKey === 'anverso' ? 'reverso' : 'anverso';
      const disenosOtroLado = obtenerDisenosLado(otroLadoKey);
      const tieneDisenoPropio = disenosPropios.length > 0;
      const tieneEnvolvente = state.envolventeActivo && disenosOtroLado.length > 0;

      if (tieneDisenoPropio || tieneEnvolvente) {
        const bufferSize = altaResolucion ? 2000 : SCREEN_BUFFER_SIZE;
        if (designLayerCanvas.width !== bufferSize || designLayerCanvas.height !== bufferSize) {
          designLayerCanvas.width = bufferSize;
          designLayerCanvas.height = bufferSize;
        }
        designLayerCtx.clearRect(0, 0, bufferSize, bufferSize);
        designLayerCtx.save();
        // Transformar de espacio Mundo (-wMundo/2..wMundo/2) al buffer (0..bufferSize)
        designLayerCtx.scale(bufferSize / wMundo, bufferSize / hMundo);
        designLayerCtx.translate(wMundo / 2, hMundo / 2);

        // Primero la continuación del diseño envolvente (debajo del diseño propio y no editable desde aquí)
        if (tieneEnvolvente) {
          dibujarContinuacionEnvolvente(designLayerCtx, ladoKey);
        }

        // Luego los diseños propios de este lado en su orden
        if (tieneDisenoPropio) {
          for (const d of disenosPropios) {
            dibujarObjetoDisenoEnMundo(designLayerCtx, ladoKey, d, d.xCm, d.yCm, 1);
          }
        }
        designLayerCtx.restore();

        // Recortar ('destination-in') usando el canal alfa de la silueta de la polera
        designLayerCtx.globalCompositeOperation = 'destination-in';
        const maskSource = altaResolucion
          ? imageCache[ladoKey].normalizedCanvas
          : imageCache[ladoKey].screenNormalized;
        designLayerCtx.drawImage(maskSource, 0, 0, bufferSize, bufferSize);
        designLayerCtx.globalCompositeOperation = 'source-over';

        // Volcar la capa de diseño ya recortada sobre la polera
        targetCtx.drawImage(designLayerCanvas, -wMundo / 2, -hMundo / 2, wMundo, hMundo);
      }

      // 3. Cuadrícula métrica opcional (cada 5 cm)
      if (incluirCuadricula) {
        targetCtx.save();
        TrazarPoligonoCostadosCuerpo(targetCtx, ladoKey);
        targetCtx.clip();
        targetCtx.strokeStyle = esColorOscuro(state.colorCuerpo)
          ? 'rgba(255, 255, 255, 0.16)'
          : 'rgba(0, 0, 0, 0.12)';
        targetCtx.lineWidth = 1 / zoomActual;

        const halfW = Math.ceil(g.anchoCuerpoCm / 2);
        for (let xCm = -halfW; xCm <= halfW; xCm += 5) {
          const p1 = cmAMundo(ladoKey, xCm, 0);
          const p2 = cmAMundo(ladoKey, xCm, g.largoTotalCm);
          targetCtx.beginPath();
          targetCtx.moveTo(p1.wx, p1.wy);
          targetCtx.lineTo(p2.wx, p2.wy);
          targetCtx.stroke();
        }
        for (let yCm = 0; yCm <= g.largoTotalCm; yCm += 5) {
          const p1 = cmAMundo(ladoKey, -halfW, yCm);
          const p2 = cmAMundo(ladoKey, halfW, yCm);
          targetCtx.beginPath();
          targetCtx.moveTo(p1.wx, p1.wy);
          targetCtx.lineTo(p2.wx, p2.wy);
          targetCtx.stroke();
        }
        targetCtx.restore();
      }

      // 4. Cotas técnicas visibles: ancho de cuerpo, largo total y largo de manga
      if (incluirCotas) {
        dibujarCotasTecnicasPrenda(targetCtx, ladoKey, zoomActual);
      }

      // 5. Guías magnéticas inteligentes y manijas de edición (solo en pantalla interactiva)
      if (incluirControlesEdicion) {
        dibujarGuiasMagneticas(targetCtx, ladoKey, zoomActual);
        const disenoSel = obtenerDisenoSeleccionado(ladoKey);
        if (disenoSel) {
          dibujarManijasEdicion(targetCtx, ladoKey, disenoSel, zoomActual);
        }
      }

      targetCtx.restore();
    }

    /**
     * Dibuja las cotas visibles de la prenda: Ancho de cuerpo, Largo total y Boca de manga.
     */
    function dibujarCotasTecnicasPrenda(targetCtx, ladoKey, zoomActual) {
      const g = obtenerGeometriaLado(ladoKey);
      const invZoom = 1 / zoomActual;
      const fontPx = Math.max(11, Math.round(12 * invZoom));

      targetCtx.save();
      targetCtx.strokeStyle = '#ba002c';
      targetCtx.fillStyle = '#ba002c';
      targetCtx.lineWidth = 1.4 * invZoom;
      targetCtx.font = `600 ${fontPx}px "JetBrains Mono", monospace`;
      targetCtx.textAlign = 'center';
      targetCtx.textBaseline = 'middle';

      // A) Cota de ANCHO DE CUERPO (a la altura del pecho, bajo las axilas)
      const yAnchoCm = g.axilaYCm + 6;
      const pIzq = cmAMundo(ladoKey, -g.anchoCuerpoCm / 2, yAnchoCm);
      const pDer = cmAMundo(ladoKey, g.anchoCuerpoCm / 2, yAnchoCm);
      dibujarLineaCotaConEtiqueta(
        targetCtx,
        pIzq.wx, pIzq.wy,
        pDer.wx, pDer.wy,
        `ANCHO ${g.tallaActual.ancho} cm`,
        invZoom
      );

      // B) Cota de LARGO TOTAL (desde el punto más alto del hombro hasta el borde inferior)
      const xLargoCm = -g.anchoCuerpoCm / 2 - 7;
      const pTop = cmAMundo(ladoKey, xLargoCm, 0);
      const pBot = cmAMundo(ladoKey, xLargoCm, g.largoTotalCm);
      dibujarLineaCotaConEtiqueta(
        targetCtx,
        pTop.wx, pTop.wy,
        pBot.wx, pBot.wy,
        `LARGO ${g.tallaActual.largo} cm`,
        invZoom
      );

      // C) Cota de BOCA DE MANGA (los 15 cm en talla M van en la abertura/boca de la manga)
      const bocaX1 = (g.cal.bocaMangaDerX1 - 1000) * g.escalaTallaX;
      const bocaY1 = (g.cal.bocaMangaDerY1 - 1000) * g.cal.factorAlto * g.escalaTallaY;
      const bocaX2 = (g.cal.bocaMangaDerX2 - 1000) * g.escalaTallaX;
      const bocaY2 = (g.cal.bocaMangaDerY2 - 1000) * g.cal.factorAlto * g.escalaTallaY;

      // Desplazamos ligeramente hacia afuera siguiendo la normal de la boca de la manga para no tapar el borde
      const dxBoca = bocaX2 - bocaX1;
      const dyBoca = bocaY2 - bocaY1;
      const lenBoca = Math.max(1, Math.hypot(dxBoca, dyBoca));
      const offsetNormX = (-dyBoca / lenBoca) * (22 * invZoom);
      const offsetNormY = (dxBoca / lenBoca) * (22 * invZoom);

      dibujarLineaCotaConEtiqueta(
        targetCtx,
        bocaX1 + offsetNormX, bocaY1 + offsetNormY,
        bocaX2 + offsetNormX, bocaY2 + offsetNormY,
        `MANGA ${g.tallaActual.manga} cm`,
        invZoom
      );

      targetCtx.restore();
    }

    function dibujarLineaCotaConEtiqueta(targetCtx, x1, y1, x2, y2, texto, invZoom) {
      targetCtx.save();
      targetCtx.beginPath();
      targetCtx.setLineDash([5 * invZoom, 4 * invZoom]);
      targetCtx.moveTo(x1, y1);
      targetCtx.lineTo(x2, y2);
      targetCtx.stroke();
      targetCtx.setLineDash([]);

      // Topes perpendiculares en los extremos
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const tick = 6 * invZoom;
      const perpX = -Math.sin(ang) * tick;
      const perpY = Math.cos(ang) * tick;

      targetCtx.beginPath();
      targetCtx.moveTo(x1 - perpX, y1 - perpY);
      targetCtx.lineTo(x1 + perpX, y1 + perpY);
      targetCtx.moveTo(x2 - perpX, y2 - perpY);
      targetCtx.lineTo(x2 + perpX, y2 + perpY);
      targetCtx.stroke();

      // Etiqueta rectangular formal sin bordes redondeados
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const padX = 6 * invZoom;
      const padY = 3 * invZoom;
      const metrics = targetCtx.measureText(texto);
      const boxW = metrics.width + padX * 2;
      const boxH = 17 * invZoom + padY;

      targetCtx.fillStyle = 'rgba(20, 22, 24, 0.92)';
      targetCtx.fillRect(mx - boxW / 2, my - boxH / 2, boxW, boxH);

      targetCtx.fillStyle = '#ffffff';
      targetCtx.fillText(texto, mx, my);
      targetCtx.restore();
    }

    /**
     * Dibuja las guías inteligentes magnéticas activas (centro vertical, centro horizontal,
     * costados del cuerpo, base del cuello y borde inferior).
     */
    function dibujarGuiasMagneticas(targetCtx, ladoKey, zoomActual) {
      if (!activeSnapGuides.length) return;
      const g = obtenerGeometriaLado(ladoKey);
      const invZoom = 1 / zoomActual;

      targetCtx.save();
      targetCtx.strokeStyle = '#ba002c';
      targetCtx.lineWidth = 1.5 * invZoom;
      targetCtx.setLineDash([4 * invZoom, 4 * invZoom]);

      for (const guide of activeSnapGuides) {
        targetCtx.beginPath();
        if (guide.tipo === 'vertical') {
          const p1 = cmAMundo(ladoKey, guide.xCm, -4);
          const p2 = cmAMundo(ladoKey, guide.xCm, g.largoTotalCm + 4);
          targetCtx.moveTo(p1.wx, p1.wy);
          targetCtx.lineTo(p2.wx, p2.wy);
        } else if (guide.tipo === 'horizontal') {
          const p1 = cmAMundo(ladoKey, -g.anchoCuerpoCm / 2 - 6, guide.yCm);
          const p2 = cmAMundo(ladoKey, g.anchoCuerpoCm / 2 + 6, guide.yCm);
          targetCtx.moveTo(p1.wx, p1.wy);
          targetCtx.lineTo(p2.wx, p2.wy);
        }
        targetCtx.stroke();
      }
      targetCtx.restore();
    }

    /**
     * Dibuja el recuadro de selección, las 4 esquinas de redimensionamiento y la manija de rotación.
     */
    function dibujarManijasEdicion(targetCtx, ladoKey, diseno, zoomActual) {
      const g = obtenerGeometriaLado(ladoKey);
      const centro = cmAMundo(ladoKey, diseno.xCm, diseno.yCm);
      const wMundo = diseno.widthCm * g.unidadesMundoPorCmX;
      const hMundo = diseno.heightCm * g.unidadesMundoPorCmY;
      const invZoom = 1 / zoomActual;
      const handleRadius = 7 * invZoom;
      const rotHandleOffset = 28 * invZoom;

      targetCtx.save();
      targetCtx.translate(centro.wx, centro.wy);
      targetCtx.rotate((diseno.angleDeg * Math.PI) / 180);

      // Marco del diseño
      targetCtx.strokeStyle = '#ba002c';
      targetCtx.lineWidth = 1.8 * invZoom;
      targetCtx.strokeRect(-wMundo / 2, -hMundo / 2, wMundo, hMundo);

      // Línea y círculo de la manija de rotación superior
      targetCtx.beginPath();
      targetCtx.moveTo(0, -hMundo / 2);
      targetCtx.lineTo(0, -hMundo / 2 - rotHandleOffset);
      targetCtx.stroke();

      targetCtx.fillStyle = '#ba002c';
      targetCtx.strokeStyle = '#ffffff';
      targetCtx.lineWidth = 2 * invZoom;
      targetCtx.beginPath();
      targetCtx.arc(0, -hMundo / 2 - rotHandleOffset, handleRadius * 1.15, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.stroke();

      // 4 manijas de esquina para redimensionar
      const corners = [
        [-wMundo / 2, -hMundo / 2],
        [wMundo / 2, -hMundo / 2],
        [wMundo / 2, hMundo / 2],
        [-wMundo / 2, hMundo / 2]
      ];
      targetCtx.fillStyle = '#ffffff';
      targetCtx.strokeStyle = '#000000';
      for (const [cx, cy] of corners) {
        targetCtx.beginPath();
        targetCtx.arc(cx, cy, handleRadius, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.stroke();
      }

      targetCtx.restore();
    }

    /**
     * Dibuja las reglas graduadas en centímetros en los 4 bordes (arriba, abajo, izquierda, derecha)
     * con un diseño minimalista, delgado y discreto para no estorbar visualmente.
     */
    function dibujarReglas4Lados(targetCtx, viewW, viewH, ladoKey, transform) {
      const g = obtenerGeometriaLado(ladoKey);
      const rulerThick = 16; // Regla delgada y discreta (16 px)
      const styles = getComputedStyle(document.documentElement);
      const rulerBg = styles.getPropertyValue('--ruler-bg').trim() || 'rgba(255,255,255,0.72)';
      const tickColor = styles.getPropertyValue('--ruler-tick').trim() || 'rgba(126,117,118,0.45)';
      const textColor = styles.getPropertyValue('--text-muted').trim() || '#7e7576';

      targetCtx.save();
      targetCtx.fillStyle = rulerBg;
      // Arriba y Abajo
      targetCtx.fillRect(0, 0, viewW, rulerThick);
      targetCtx.fillRect(0, viewH - rulerThick, viewW, rulerThick);
      // Izquierda y Derecha
      targetCtx.fillRect(0, rulerThick, rulerThick, viewH - rulerThick * 2);
      targetCtx.fillRect(viewW - rulerThick, rulerThick, rulerThick, viewH - rulerThick * 2);

      // Línea divisoria ultra fina
      targetCtx.strokeStyle = tickColor;
      targetCtx.lineWidth = 0.75;
      targetCtx.strokeRect(rulerThick, rulerThick, viewW - rulerThick * 2, viewH - rulerThick * 2);

      targetCtx.fillStyle = textColor;
      targetCtx.font = '500 8.5px "JetBrains Mono", monospace';

      // Marcas horizontales (Arriba y Abajo)
      const halfW = g.anchoCuerpoCm / 2;
      const minCmX = -Math.ceil(halfW + 20);
      const maxCmX = Math.ceil(halfW + 20);

      targetCtx.textAlign = 'center';
      for (let cmFromCenter = minCmX; cmFromCenter <= maxCmX; cmFromCenter++) {
        const { wx } = cmAMundo(ladoKey, cmFromCenter, 0);
        const sx = transform.cx + wx * transform.scale;
        if (sx < rulerThick + 4 || sx > viewW - rulerThick - 4) continue;

        const isTen = cmFromCenter % 10 === 0;
        const isFive = cmFromCenter % 5 === 0;
        const tickLen = isTen ? 5 : (isFive ? 3.5 : 2);

        targetCtx.strokeStyle = tickColor;
        targetCtx.beginPath();
        targetCtx.moveTo(sx, rulerThick);
        targetCtx.lineTo(sx, rulerThick - tickLen);
        targetCtx.moveTo(sx, viewH - rulerThick);
        targetCtx.lineTo(sx, viewH - rulerThick + tickLen);
        targetCtx.stroke();

        if (isTen) {
          const label = `${cmFromCenter}`;
          targetCtx.fillText(label, sx, 9);
          targetCtx.fillText(label, sx, viewH - 5);
        }
      }

      // Marcas verticales (Izquierda y Derecha)
      for (let yCm = -10; yCm <= Math.ceil(g.largoTotalCm + 15); yCm++) {
        const { wy } = cmAMundo(ladoKey, 0, yCm);
        const sy = transform.cy + wy * transform.scale;
        if (sy < rulerThick + 4 || sy > viewH - rulerThick - 4) continue;

        const isTen = yCm % 10 === 0;
        const isFive = yCm % 5 === 0;
        const tickLen = isTen ? 5 : (isFive ? 3.5 : 2);

        targetCtx.strokeStyle = tickColor;
        targetCtx.beginPath();
        targetCtx.moveTo(rulerThick, sy);
        targetCtx.lineTo(rulerThick - tickLen, sy);
        targetCtx.moveTo(viewW - rulerThick, sy);
        targetCtx.lineTo(viewW - rulerThick + tickLen, sy);
        targetCtx.stroke();

        if (isTen) {
          targetCtx.save();
          targetCtx.translate(8, sy);
          targetCtx.rotate(-Math.PI / 2);
          targetCtx.fillText(`${yCm}`, 0, 0);
          targetCtx.restore();

          targetCtx.save();
          targetCtx.translate(viewW - 8, sy);
          targetCtx.rotate(Math.PI / 2);
          targetCtx.fillText(`${yCm}`, 0, 0);
          targetCtx.restore();
        }
      }

      // Esquinas discretas
      targetCtx.fillStyle = rulerBg;
      targetCtx.fillRect(0, 0, rulerThick, rulerThick);
      targetCtx.fillRect(viewW - rulerThick, 0, rulerThick, rulerThick);
      targetCtx.fillRect(0, viewH - rulerThick, rulerThick, rulerThick);
      targetCtx.fillRect(viewW - rulerThick, viewH - rulerThick, rulerThick, rulerThick);

      targetCtx.fillStyle = textColor;
      targetCtx.font = '600 8px "JetBrains Mono", monospace';
      targetCtx.fillText('cm', rulerThick / 2, rulerThick / 2 + 3);

      targetCtx.restore();
    }

    /**
     * Calcula la transformación de cámara para pasar de espacio Mundo a píxeles del canvas en pantalla.
     */
    function obtenerTransformacionCamara() {
      const rect = canvas.getBoundingClientRect();
      const baseScale = Math.min(rect.width - 70, rect.height - 70) / 1950;
      const scale = Math.max(0.08, baseScale * state.zoom);
      return {
        width: rect.width,
        height: rect.height,
        cx: rect.width / 2 + state.panX,
        cy: rect.height / 2 + state.panY,
        scale,
        baseScale
      };
    }

    function renderizarMesaDeTrabajo() {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const cam = obtenerTransformacionCamara();

      ctx.save();
      ctx.translate(cam.cx, cam.cy);
      ctx.scale(cam.scale, cam.scale);

      renderizarEscenaPrenda(ctx, state.ladoActivo, {
        altaResolucion: false,
        incluirCotas: state.mostrarCotas,
        incluirCuadricula: state.mostrarCuadricula,
        incluirControlesEdicion: true,
        zoomActual: cam.scale
      });

      ctx.restore();

      // Reglas en cm arriba, abajo, izquierda y derecha
      dibujarReglas4Lados(ctx, rect.width, rect.height, state.ladoActivo, cam);

      ctx.restore();
      actualizarIndicadoresHUD();
    }

    /**
     * ============================================================================
     * SECCIÓN 6: INTERACCIÓN EN MESA DE TRABAJO (POINTER EVENTS, GESTOS Y TECLADO)
     * ============================================================================
     */
    const activePointers = new Map();
    let interactionMode = null; // 'move-design' | 'resize-design' | 'rotate-design' | 'pan-stage' | 'pinch'
    let dragStartInfo = null;

    function pantallaAMundo(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const cam = obtenerTransformacionCamara();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return {
        wx: (sx - cam.cx) / cam.scale,
        wy: (sy - cam.cy) / cam.scale
      };
    }

    /**
     * Determina si el usuario tocó la manija de rotación, una esquina de redimensionamiento
     * o el cuerpo de un diseño en el lado activo.
     */
    function detectarZonaTocada(wx, wy) {
      const disenos = obtenerDisenosLado(state.ladoActivo);
      if (!disenos.length) return null;

      const g = obtenerGeometriaLado(state.ladoActivo);
      const cam = obtenerTransformacionCamara();
      const hitRadius = 18 / cam.scale; // Radio amplio táctil (>= 44px equivalentes)
      const rotOffset = 28 / cam.scale;

      const disenoSel = obtenerDisenoSeleccionado(state.ladoActivo);

      // 1. Probar manijas de rotación y esquinas del diseño seleccionado actualmente
      if (disenoSel) {
        const centro = cmAMundo(state.ladoActivo, disenoSel.xCm, disenoSel.yCm);
        const wMundo = disenoSel.widthCm * g.unidadesMundoPorCmX;
        const hMundo = disenoSel.heightCm * g.unidadesMundoPorCmY;

        const dx = wx - centro.wx;
        const dy = wy - centro.wy;
        const rad = (-disenoSel.angleDeg * Math.PI) / 180;
        const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

        // Manija de rotación superior
        if (Math.hypot(lx - 0, ly - (-hMundo / 2 - rotOffset)) <= hitRadius) {
          return { action: 'rotate-design', diseno: disenoSel };
        }

        // Esquinas de redimensionamiento
        const corners = [
          [-wMundo / 2, -hMundo / 2],
          [wMundo / 2, -hMundo / 2],
          [wMundo / 2, hMundo / 2],
          [-wMundo / 2, hMundo / 2]
        ];
        for (const [cx, cy] of corners) {
          if (Math.hypot(lx - cx, ly - cy) <= hitRadius) {
            return { action: 'resize-design', diseno: disenoSel };
          }
        }

        // Interior del seleccionado
        if (Math.abs(lx) <= wMundo / 2 && Math.abs(ly) <= hMundo / 2) {
          return { action: 'move-design', diseno: disenoSel };
        }
      }

      // 2. Probar si tocó el interior de algún otro diseño del lado activo (del superior al inferior)
      for (let i = disenos.length - 1; i >= 0; i--) {
        const d = disenos[i];
        if (d === disenoSel) continue;
        const centro = cmAMundo(state.ladoActivo, d.xCm, d.yCm);
        const wMundo = d.widthCm * g.unidadesMundoPorCmX;
        const hMundo = d.heightCm * g.unidadesMundoPorCmY;

        const dx = wx - centro.wx;
        const dy = wy - centro.wy;
        const rad = (-d.angleDeg * Math.PI) / 180;
        const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

        if (Math.abs(lx) <= wMundo / 2 && Math.abs(ly) <= hMundo / 2) {
          return { action: 'move-design', diseno: d };
        }
      }

      return null;
    }

    /**
     * Aplica las guías inteligentes magnéticas al mover el diseño cerca de:
     * centro vertical del cuerpo, centro horizontal, bordes del cuerpo, base del cuello y borde inferior.
     */
    function aplicarImanGuiasInteligentes(ladoKey, xCm, yCm, widthCm, heightCm) {
      const g = obtenerGeometriaLado(ladoKey);
      const SNAP_TOLERANCE_CM = 0.85;
      const guias = [];

      let finalXCm = xCm;
      let finalYCm = yCm;

      const yRef = Math.max(0, Math.min(g.largoTotalCm, yCm));
      const { izqCm, derCm } = g.obtenerCostadosCmEnY(yRef);

      // 1. Guías verticales: Centro (0 cm), Costado Izquierdo, Costado Derecho
      if (Math.abs(xCm - 0) <= SNAP_TOLERANCE_CM) {
        finalXCm = 0;
        guias.push({ tipo: 'vertical', xCm: 0 });
      } else if (Math.abs((xCm - widthCm / 2) - izqCm) <= SNAP_TOLERANCE_CM) {
        finalXCm = izqCm + widthCm / 2;
        guias.push({ tipo: 'vertical', xCm: izqCm });
      } else if (Math.abs((xCm + widthCm / 2) - derCm) <= SNAP_TOLERANCE_CM) {
        finalXCm = derCm - widthCm / 2;
        guias.push({ tipo: 'vertical', xCm: derCm });
      }

      // 2. Guías horizontales: Centro del torso, Base del cuello y Borde inferior
      const centroTorsoYCm = (g.cuelloYCm + g.largoTotalCm) / 2;
      if (Math.abs(yCm - centroTorsoYCm) <= SNAP_TOLERANCE_CM) {
        finalYCm = centroTorsoYCm;
        guias.push({ tipo: 'horizontal', yCm: centroTorsoYCm });
      } else if (Math.abs((yCm - heightCm / 2) - g.cuelloYCm) <= SNAP_TOLERANCE_CM) {
        finalYCm = g.cuelloYCm + heightCm / 2;
        guias.push({ tipo: 'horizontal', yCm: g.cuelloYCm });
      } else if (Math.abs((yCm + heightCm / 2) - g.largoTotalCm) <= SNAP_TOLERANCE_CM) {
        finalYCm = g.largoTotalCm - heightCm / 2;
        guias.push({ tipo: 'horizontal', yCm: g.largoTotalCm });
      }

      activeSnapGuides = guias;
      return { xCm: finalXCm, yCm: finalYCm };
    }

    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Si hay 2 dedos en móvil: iniciar pellizco (pinch-to-zoom) y arrastre
      if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        interactionMode = 'pinch';
        dragStartInfo = {
          startDist: Math.max(10, dist),
          startZoom: state.zoom,
          startPanX: state.panX,
          startPanY: state.panY,
          startMidX: midX,
          startMidY: midY
        };
        return;
      }

      const { wx, wy } = pantallaAMundo(e.clientX, e.clientY);
      const hit = detectarZonaTocada(wx, wy);

      if (hit && hit.diseno) {
        state.disenoSeleccionadoId[state.ladoActivo] = hit.diseno.id;
        actualizarEstadoBotonesEdicion();
        sincronizarInputsEdicion();
        actualizarIndicadoresHUD();
        solicitarRender();

        const diseno = hit.diseno;
        interactionMode = hit.action;
        canvas.classList.add('dragging-design');
        const centro = cmAMundo(state.ladoActivo, diseno.xCm, diseno.yCm);
        dragStartInfo = {
          disenoId: diseno.id,
          startWx: wx,
          startWy: wy,
          origXCm: diseno.xCm,
          origYCm: diseno.yCm,
          origWidthCm: diseno.widthCm,
          origHeightCm: diseno.heightCm,
          origAngleDeg: diseno.angleDeg,
          centroWx: centro.wx,
          centroWy: centro.wy,
          startDistFromCenter: Math.max(5, Math.hypot(wx - centro.wx, wy - centro.wy)),
          startPointerAngle: Math.atan2(wy - centro.wy, wx - centro.wx)
        };
      } else {
        interactionMode = 'pan-stage';
        dragStartInfo = {
          startClientX: e.clientX,
          startClientY: e.clientY,
          startPanX: state.panX,
          startPanY: state.panY
        };
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (interactionMode === 'pinch' && activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;

        const factor = dist / dragStartInfo.startDist;
        state.zoom = Math.max(0.4, Math.min(4.5, dragStartInfo.startZoom * factor));
        state.panX = dragStartInfo.startPanX + (midX - dragStartInfo.startMidX);
        state.panY = dragStartInfo.startPanY + (midY - dragStartInfo.startMidY);
        solicitarRender();
        return;
      }

      if (!interactionMode || !dragStartInfo) return;

      if (interactionMode === 'pan-stage') {
        state.panX = dragStartInfo.startPanX + (e.clientX - dragStartInfo.startClientX);
        state.panY = dragStartInfo.startPanY + (e.clientY - dragStartInfo.startClientY);
        solicitarRender();
        return;
      }

      const diseno = obtenerDisenoSeleccionado(state.ladoActivo);
      if (!diseno || (dragStartInfo.disenoId && dragStartInfo.disenoId !== diseno.id)) return;
      const { wx, wy } = pantallaAMundo(e.clientX, e.clientY);
      const g = obtenerGeometriaLado(state.ladoActivo);

      if (interactionMode === 'move-design') {
        const deltaXCm = (wx - dragStartInfo.startWx) / g.unidadesMundoPorCmX;
        const deltaYCm = (wy - dragStartInfo.startWy) / g.unidadesMundoPorCmY;
        const rawXCm = dragStartInfo.origXCm + deltaXCm;
        const rawYCm = dragStartInfo.origYCm + deltaYCm;

        const snapped = aplicarImanGuiasInteligentes(
          state.ladoActivo,
          rawXCm,
          rawYCm,
          diseno.widthCm,
          diseno.heightCm
        );
        diseno.xCm = Number(snapped.xCm.toFixed(2));
        diseno.yCm = Number(snapped.yCm.toFixed(2));
        sincronizarInputsEdicion();
        solicitarRender();
      } else if (interactionMode === 'resize-design') {
        const currentDist = Math.max(5, Math.hypot(wx - dragStartInfo.centroWx, wy - dragStartInfo.centroWy));
        const ratio = currentDist / dragStartInfo.startDistFromCenter;
        const newW = Math.max(2, Math.min(95, dragStartInfo.origWidthCm * ratio));
        diseno.widthCm = Number(newW.toFixed(2));
        if (state.bloquearProporcion) {
          diseno.heightCm = Number((newW / diseno.aspectRatio).toFixed(2));
        } else {
          diseno.heightCm = Number(Math.max(2, dragStartInfo.origHeightCm * ratio).toFixed(2));
        }
        sincronizarInputsEdicion();
        solicitarRender();
      } else if (interactionMode === 'rotate-design') {
        const currentAngle = Math.atan2(wy - dragStartInfo.centroWy, wx - dragStartInfo.centroWx);
        let deg = dragStartInfo.origAngleDeg + ((currentAngle - dragStartInfo.startPointerAngle) * 180) / Math.PI;
        // Imán de ángulo cada 45 grados si se acerca a 3°
        const snapAngles = [-180, -135, -90, -45, 0, 45, 90, 135, 180];
        for (const sa of snapAngles) {
          if (Math.abs(deg - sa) < 3) {
            deg = sa;
            break;
          }
        }
        diseno.angleDeg = Math.round(deg);
        sincronizarInputsEdicion();
        solicitarRender();
      }
    });

    function finalizarInteraccionPointer(e) {
      activePointers.delete(e.pointerId);
      if ( (interactionMode === 'move-design' || interactionMode === 'resize-design' || interactionMode === 'rotate-design') && activePointers.size === 0 ) {
        guardarEstadoEnHistorial();
      }
      if (activePointers.size === 0) {
        interactionMode = null;
        dragStartInfo = null;
        activeSnapGuides = [];
        canvas.classList.remove('dragging-design');
        solicitarRender();
      }
    }

    canvas.addEventListener('pointerup', finalizarInteraccionPointer);
    canvas.addEventListener('pointercancel', finalizarInteraccionPointer);

    // Zoom con rueda del mouse en escritorio
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      state.zoom = Math.max(0.4, Math.min(4.5, state.zoom * factor));
      document.getElementById('zoomResetBtn').textContent = `${Math.round(state.zoom * 100)}%`;
      solicitarRender();
    }, { passive: false });

    // Movimiento con flechas del teclado (Shift = paso mayor de 1 cm, normal = 0.2 cm) y Ctrl+Z / Ctrl+Y
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement ? document.activeElement.tagName : '';
      const enInput = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) rehacerAccion();
        else deshacerAccion();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        rehacerAccion();
        return;
      }

      if (enInput) return;
      const diseno = obtenerDisenoSeleccionado(state.ladoActivo);
      if (!diseno) return;

      const pasoCm = e.shiftKey ? 1.0 : 0.2;
      let movio = false;

      if (e.key === 'ArrowLeft') { diseno.xCm = Number((diseno.xCm - pasoCm).toFixed(2)); movio = true; }
      else if (e.key === 'ArrowRight') { diseno.xCm = Number((diseno.xCm + pasoCm).toFixed(2)); movio = true; }
      else if (e.key === 'ArrowUp') { diseno.yCm = Number((diseno.yCm - pasoCm).toFixed(2)); movio = true; }
      else if (e.key === 'ArrowDown') { diseno.yCm = Number((diseno.yCm + pasoCm).toFixed(2)); movio = true; }
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        eliminarDisenoActivo();
        return;
      }

      if (movio) {
        e.preventDefault();
        sincronizarInputsEdicion();
        guardarEstadoEnHistorial();
        solicitarRender();
      }
    });

    /**
     * ============================================================================
     * SECCIÓN 7: SUBIDA DE DISEÑOS, HISTORIAL DESHACER/REHACER Y CONTROLES UI
     * ============================================================================
     */
    const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    const PESO_MAXIMO_BYTES = 25 * 1024 * 1024; // 25 MB

    function mostrarNotificacion(mensaje) {
      const toast = document.getElementById('toastBanner');
      toast.textContent = mensaje;
      toast.classList.add('visible');
      clearTimeout(mostrarNotificacion._timer);
      mostrarNotificacion._timer = setTimeout(() => {
        toast.classList.remove('visible');
      }, 3600);
    }

    function validarYCargarArchivoDiseno(file) {
      if (!file) return;
      if (!TIPOS_PERMITIDOS.includes(file.type)) {
        mostrarNotificacion('Formato no válido. Usa una imagen PNG, JPG, SVG o WEBP.');
        return;
      }
      if (file.size > PESO_MAXIMO_BYTES) {
        mostrarNotificacion('El archivo supera el límite permitido de 25 MB.');
        return;
      }

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const aspect = (img.naturalWidth || 500) / (img.naturalHeight || 500);
        const g = obtenerGeometriaLado(state.ladoActivo);
        const anchoInicialCm = 24;
        const altoInicialCm = Number((anchoInicialCm / aspect).toFixed(2));

        const disenosExistentes = obtenerDisenosLado(state.ladoActivo);
        const offsetExtra = disenosExistentes.length * 3;
        // Colocar centrado con ligero offset escalonado si ya hay otros diseños
        const yInicialCm = Number((g.cuelloYCm + 10 + altoInicialCm / 2 + offsetExtra).toFixed(2));
        const ext = (file.name.split('.').pop() || 'png').toLowerCase();

        const nuevoDiseno = {
          id: 'des_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
          imgElement: img,
          originalFile: file,
          fileName: file.name,
          fileExt: ext,
          xCm: 0,
          yCm: yInicialCm,
          widthCm: anchoInicialCm,
          heightCm: altoInicialCm,
          angleDeg: 0,
          aspectRatio: aspect
        };

        state.disenos[state.ladoActivo].push(nuevoDiseno);
        state.disenoSeleccionadoId[state.ladoActivo] = nuevoDiseno.id;
        state.ladoOrigenEnvolvente = state.ladoActivo;

        actualizarEstadoBotonesEdicion();
        sincronizarInputsEdicion();
        guardarEstadoEnHistorial();
        solicitarRender();
        mostrarNotificacion(`Diseño cargado en ${state.ladoActivo.toUpperCase()} (${anchoInicialCm} × ${altoInicialCm} cm).`);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        mostrarNotificacion('No se pudo decodificar la imagen seleccionada.');
      };
      img.src = url;
    }

    /**
     * Genera un gráfico vectorial de demostración ("ZAIREN LAB") por si el usuario desea probar
     * de inmediato el diseño envolvente y las cotas sin buscar un archivo en su dispositivo.
     */
    function cargarGraficoDemoZairen() {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="540" viewBox="0 0 900 540">
        <rect x="18" y="18" width="864" height="504" rx="24" fill="#141416" stroke="#BA002C" stroke-width="10"/>
        <text x="450" y="215" text-anchor="middle" fill="#FFFFFF" font-family="monospace" font-weight="700" font-size="112" letter-spacing="10">ZAIREN</text>
        <text x="450" y="325" text-anchor="middle" fill="#BA002C" font-family="sans-serif" font-weight="700" font-size="68">ザイレン · STUDIO</text>
        <line x1="120" y1="385" x2="780" y2="385" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="12 10"/>
        <text x="450" y="445" text-anchor="middle" fill="#C6C6C8" font-family="monospace" font-size="28" letter-spacing="6">ZENITH MONOCHROME ARCHIVE</text>
      </svg>`;
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const demoFile = new File([blob], 'zairen-demo-graphic.svg', { type: 'image/svg+xml' });
      validarYCargarArchivoDiseno(demoFile);
    }

    /**
     * Historial de Deshacer / Rehacer (Ctrl+Z / Ctrl+Y)
     */
    function clonarListaDisenos(lista) {
      if (!Array.isArray(lista)) return [];
      return lista.map((d) => ({ ...d }));
    }

    function guardarEstadoEnHistorial() {
      const snapshot = {
        talla: state.talla,
        colorCuerpo: state.colorCuerpo,
        envolventeActivo: state.envolventeActivo,
        anverso: clonarListaDisenos(state.disenos.anverso),
        reverso: clonarListaDisenos(state.disenos.reverso),
        disenoSeleccionadoId: { ...state.disenoSeleccionadoId }
      };

      state.historial = state.historial.slice(0, state.indiceHistorial + 1);
      state.historial.push(snapshot);
      if (state.historial.length > 35) state.historial.shift();
      state.indiceHistorial = state.historial.length - 1;
      actualizarBotonesHistorial();
    }

    function restaurarSnapshot(snap) {
      if (!snap) return;
      state.talla = snap.talla;
      state.colorCuerpo = snap.colorCuerpo;
      state.envolventeActivo = snap.envolventeActivo;
      state.disenos.anverso = clonarListaDisenos(snap.anverso);
      state.disenos.reverso = clonarListaDisenos(snap.reverso);
      if (snap.disenoSeleccionadoId) {
        state.disenoSeleccionadoId = { ...snap.disenoSeleccionadoId };
      }

      document.getElementById('sizeSelect').value = state.talla;
      document.getElementById('wrapAroundToggle').checked = state.envolventeActivo;
      document.getElementById('wrapCardContainer').classList.toggle('active', state.envolventeActivo);
      actualizarUIInfoTalla();
      actualizarUIColorSeleccionado();
      actualizarEstadoBotonesEdicion();
      sincronizarInputsEdicion();
      actualizarBotonesHistorial();
      solicitarRender();
    }

    function deshacerAccion() {
      if (state.indiceHistorial > 0) {
        state.indiceHistorial--;
        restaurarSnapshot(state.historial[state.indiceHistorial]);
      }
    }

    function rehacerAccion() {
      if (state.indiceHistorial < state.historial.length - 1) {
        state.indiceHistorial++;
        restaurarSnapshot(state.historial[state.indiceHistorial]);
      }
    }

    function actualizarBotonesHistorial() {
      document.getElementById('undoBtn').disabled = state.indiceHistorial <= 0;
      document.getElementById('redoBtn').disabled = state.indiceHistorial >= state.historial.length - 1;
    }

    function actualizarIndicadoresHUD() {
      const diseno = obtenerDisenoSeleccionado(state.ladoActivo);
      const dotAnverso = document.getElementById('dotAnverso');
      const dotReverso = document.getElementById('dotReverso');

      const tieneAnverso = state.disenos.anverso.length > 0 || (state.envolventeActivo && state.disenos.reverso.length > 0);
      const tieneReverso = state.disenos.reverso.length > 0 || (state.envolventeActivo && state.disenos.anverso.length > 0);
      dotAnverso.classList.toggle('has-content', tieneAnverso);
      dotReverso.classList.toggle('has-content', tieneReverso);

      if (!diseno) {
        document.getElementById('hudSizeCm').textContent = 'Sin diseño seleccionado';
        document.getElementById('hudNeckCm').textContent = '—';
        document.getElementById('hudBottomCm').textContent = '—';
        document.getElementById('hudLeftCm').textContent = '—';
        document.getElementById('hudRightCm').textContent = '—';
        return;
      }

      const m = calcularMetricasDisenoCm(state.ladoActivo, diseno);
      document.getElementById('hudSizeCm').textContent = `${m.anchoCm.toFixed(1)} × ${m.altoCm.toFixed(1)} cm`;
      document.getElementById('hudNeckCm').textContent = `${m.distCuelloCm.toFixed(1)} cm`;
      document.getElementById('hudBottomCm').textContent = `${m.distBordeInfCm.toFixed(1)} cm`;
      document.getElementById('hudLeftCm').textContent = `${m.distCostadoIzqCm.toFixed(1)} cm`;
      document.getElementById('hudRightCm').textContent = `${m.distCostadoDerCm.toFixed(1)} cm`;
    }

    function sincronizarInputsEdicion() {
      const diseno = obtenerDisenoSeleccionado(state.ladoActivo);
      const inputW = document.getElementById('inputWidthCm');
      const inputAng = document.getElementById('inputAngleDeg');
      if (!diseno) {
        inputW.value = '';
        inputAng.value = '';
        return;
      }
      inputW.value = diseno.widthCm;
      inputAng.value = diseno.angleDeg;
    }

    function actualizarEstadoBotonesEdicion() {
      const tieneDiseno = Boolean(obtenerDisenoSeleccionado(state.ladoActivo));
      document.getElementById('inputWidthCm').disabled = !tieneDiseno;
      document.getElementById('inputAngleDeg').disabled = !tieneDiseno;
      document.getElementById('centerDesignBtn').disabled = !tieneDiseno;
      document.getElementById('deleteDesignBtn').disabled = !tieneDiseno;
      document.querySelectorAll('[data-align]').forEach((btn) => {
        btn.disabled = !tieneDiseno;
      });
    }

    function eliminarDisenoActivo() {
      const list = obtenerDisenosLado(state.ladoActivo);
      const disenoSel = obtenerDisenoSeleccionado(state.ladoActivo);
      if (!disenoSel || !list.length) return;

      const idx = list.findIndex(d => d.id === disenoSel.id);
      if (idx !== -1) {
        list.splice(idx, 1);
      }
      const remaining = obtenerDisenosLado(state.ladoActivo);
      state.disenoSeleccionadoId[state.ladoActivo] = remaining.length ? remaining[remaining.length - 1].id : null;

      actualizarEstadoBotonesEdicion();
      sincronizarInputsEdicion();
      guardarEstadoEnHistorial();
      solicitarRender();
      mostrarNotificacion(`Diseño eliminado del ${state.ladoActivo}.`);
    }

    /**
     * ============================================================================
     * SECCIÓN 8: EXPORTACIÓN DE ALTA RESOLUCIÓN Y GENERACIÓN DEL PAQUETE ZIP
     * ============================================================================
     */

    /**
     * Determina si un lado ("anverso" o "reverso") tiene contenido que deba exportarse
     * (ya sea diseño propio o continuación activa del diseño envolvente del otro lado).
     */
    function ladoTieneContenido(ladoKey) {
      if (state.disenos[ladoKey] && state.disenos[ladoKey].length > 0) return true;
      const otroLado = ladoKey === 'anverso' ? 'reverso' : 'anverso';
      if (state.envolventeActivo && state.disenos[otroLado] && state.disenos[otroLado].length > 0) return true;
      return false;
    }

    /**
     * Genera la imagen PNG de alta resolución (base 2000 px + margen de reglas graduadas en cm)
     * sin manijas de edición ni guías interactivas, con cotas y medidas legibles.
     */
    function generarImagenExportacionLado(ladoKey) {
      const MARGIN = 120; // Margen exterior para reglas graduadas en cm (total 2240 x 2240 px)
      const EXPORT_SIZE = 2000 + MARGIN * 2;
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = EXPORT_SIZE;
      exportCanvas.height = EXPORT_SIZE;
      const eCtx = exportCanvas.getContext('2d');

      // Fondo limpio de ficha técnica
      eCtx.fillStyle = '#F5F5F7';
      eCtx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);

      const g = obtenerGeometriaLado(ladoKey);
      // Ajustamos la escala para que quepa holgadamente incluso en talla XXL
      const maxDimMundo = Math.max(g.fotoAnchoMundo, g.fotoAltoMundo, 2000);
      const exportScale = 1920 / maxDimMundo;
      const cx = EXPORT_SIZE / 2;
      const cy = EXPORT_SIZE / 2;

      eCtx.save();
      eCtx.translate(cx, cy);
      eCtx.scale(exportScale, exportScale);

      renderizarEscenaPrenda(eCtx, ladoKey, {
        altaResolucion: true,
        incluirCotas: true,
        incluirCuadricula: false,
        incluirControlesEdicion: false,
        zoomActual: exportScale
      });

      // Si tiene diseños propios, dibujamos cotas de los diseños
      const disenos = obtenerDisenosLado(ladoKey);
      for (const diseno of disenos) {
        const m = calcularMetricasDisenoCm(ladoKey, diseno);
        const centro = cmAMundo(ladoKey, diseno.xCm, diseno.yCm);
        const wMundo = diseno.widthCm * g.unidadesMundoPorCmX;
        const hMundo = diseno.heightCm * g.unidadesMundoPorCmY;
        const cuelloPt = cmAMundo(ladoKey, diseno.xCm, g.cuelloYCm);

        dibujarLineaCotaConEtiqueta(
          eCtx,
          centro.wx - wMundo / 2, centro.wy + hMundo / 2 + 28 / exportScale,
          centro.wx + wMundo / 2, centro.wy + hMundo / 2 + 28 / exportScale,
          `${m.anchoCm.toFixed(1)} × ${m.altoCm.toFixed(1)} cm`,
          1 / exportScale
        );
        dibujarLineaCotaConEtiqueta(
          eCtx,
          cuelloPt.wx, cuelloPt.wy,
          centro.wx, centro.wy - hMundo / 2,
          `Cuello: ${m.distCuelloCm.toFixed(1)} cm`,
          1 / exportScale
        );
      }

      eCtx.restore();

      // Dibujar reglas graduadas en cm en los 4 bordes del lienzo de exportación
      dibujarReglas4Lados(eCtx, EXPORT_SIZE, EXPORT_SIZE, ladoKey, {
        cx,
        cy,
        scale: exportScale
      });

      // Encabezado técnico discreto
      eCtx.fillStyle = '#1A1C1D';
      eCtx.font = '700 20px "JetBrains Mono", monospace';
      eCtx.fillText(
        `ZAIREN | FICHA ${ladoKey.toUpperCase()} · TALLA ${state.talla} (${g.tallaActual.ancho}×${g.tallaActual.largo} cm) · COLOR ${state.colorCuerpo.toUpperCase()}`,
        48,
        54
      );

      return new Promise((resolve) => {
        try {
          exportCanvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
        } catch (e) {
          console.warn('Advertencia al generar blob de exportación:', e);
          resolve(null);
        }
      });
    }

    /**
     * Genera el contenido detallado de `especificaciones.txt` para el taller de confección.
     */
    function generarTextoEspecificaciones() {
      const prenda = CONFIG_PRENDAS[state.prendaId];
      const datosTalla = prenda.tallas[state.talla];
      const fechaISO = obtenerFechaActualISO();

      const lineas = [
        '====================================================================',
        'ZAIREN | ザイレン — ESPECIFICACIONES TÉCNICAS DE CONFECCIÓN Y ESTAMPADO',
        '====================================================================',
        `Fecha de generación : ${fechaISO}`,
        `Prenda              : ${prenda.nombre} (Corte básico, no oversize)`,
        `Talla seleccionada  : ${state.talla}`,
        `Medidas de la prenda: Ancho de cuerpo ${datosTalla.ancho} cm | Largo total ${datosTalla.largo} cm | Manga ${datosTalla.manga} cm`,
        `Color del cuerpo    : ${state.colorCuerpo.toUpperCase()}`,
        `Color de mangas     : ${state.colorCuerpo.toUpperCase()} (Igual al cuerpo)`,
        `Color de cuello     : ${state.colorCuerpo.toUpperCase()} (Igual al cuerpo)`,
        `Diseño envolvente   : ${state.envolventeActivo ? 'SÍ (Continúa por el otro lado a través de los costados)' : 'NO'}`,
        '',
        'AVISO IMPORTANTE SOBRE TALLAS:',
        'Las medidas de la talla M (53 x 71 cm, manga 15 cm) y L (54 x 72 cm, manga 17 cm)',
        'son medidas físicas de referencia. Las medidas de las tallas S, XL y XXL son',
        'estimadas y deben verificarse con la tabla de moldería del taller.',
        ''
      ];

      ['anverso', 'reverso'].forEach((ladoKey) => {
        lineas.push('--------------------------------------------------------------------');
        lineas.push(`LADO: ${ladoKey.toUpperCase()}`);
        lineas.push('--------------------------------------------------------------------');

        const disenosPropios = obtenerDisenosLado(ladoKey);
        const otroLado = ladoKey === 'anverso' ? 'reverso' : 'anverso';
        const recibeEnvolvente = state.envolventeActivo && obtenerDisenosLado(otroLado).length > 0;

        if (disenosPropios.length === 0 && !recibeEnvolvente) {
          lineas.push('Estado: Sin diseño en este lado.');
        } else {
          if (disenosPropios.length > 0) {
            disenosPropios.forEach((disenoPropio, idx) => {
              const m = calcularMetricasDisenoCm(ladoKey, disenoPropio);
              const numStr = disenosPropios.length > 1 ? ` #${idx + 1}` : '';
              const nombreArchivo = disenosPropios.length > 1
                ? `diseno_${ladoKey}_${idx + 1}.${disenoPropio.fileExt}`
                : `diseno_${ladoKey}.${disenoPropio.fileExt}`;

              lineas.push(`[Diseño${numStr}]`);
              lineas.push(`Archivo original           : ${nombreArchivo}`);
              lineas.push(`Tamaño del diseño (An×Al)  : ${m.anchoCm.toFixed(2)} cm × ${m.altoCm.toFixed(2)} cm`);
              lineas.push(`Posición del centro (X, Y) : X = ${disenoPropio.xCm.toFixed(2)} cm (desde centro) | Y = ${disenoPropio.yCm.toFixed(2)} cm (desde hombro alto)`);
              lineas.push(`Rotación                   : ${disenoPropio.angleDeg}°`);
              lineas.push(`Distancia a base de cuello : ${m.distCuelloCm.toFixed(2)} cm`);
              lineas.push(`Distancia a borde inferior : ${m.distBordeInfCm.toFixed(2)} cm`);
              lineas.push(`Distancia a costado izq.   : ${m.distCostadoIzqCm.toFixed(2)} cm`);
              lineas.push(`Distancia a costado der.   : ${m.distCostadoDerCm.toFixed(2)} cm`);
              lineas.push('');
            });
          }
          if (recibeEnvolvente) {
            lineas.push(`Continuación envolvente    : Incluye continuación plana del diseño ubicado en ${otroLado.toUpperCase()}.`);
          }
        }
        lineas.push('');
      });

      return lineas.join('\n');
    }

    function obtenerFechaActualISO() {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    /**
     * Construye la lista de archivos que se incluirán en el ZIP para mostrar el resumen previo.
     */
    function obtenerResumenArchivosExportacion() {
      const archivos = [];
      const hayAnverso = ladoTieneContenido('anverso');
      const hayReverso = ladoTieneContenido('reverso');

      if (hayAnverso) {
        archivos.push({ nombre: 'anverso.png', desc: 'Vista frontal 2000px + reglas y cotas en cm' });
      }
      if (hayReverso) {
        archivos.push({ nombre: 'reverso.png', desc: 'Vista posterior 2000px + reglas y cotas en cm' });
      }

      ['anverso', 'reverso'].forEach((ladoKey) => {
        const disenos = obtenerDisenosLado(ladoKey);
        disenos.forEach((d, idx) => {
          const suffix = disenos.length > 1 ? `_${idx + 1}` : '';
          archivos.push({
            nombre: `diseno_${ladoKey}${suffix}.${d.fileExt}`,
            desc: `Diseño ${ladoKey.toUpperCase()}${suffix ? ' #' + (idx + 1) : ''} en calidad nativa`,
            ladoOrigen: ladoKey
          });
        });
      });

      if (hayAnverso || hayReverso) {
        archivos.push({ nombre: 'especificaciones.txt', desc: 'Ficha técnica para taller en cm y HEX' });
      }
      return archivos;
    }

    function abrirModalExportacion() {
      const backdrop = document.getElementById('exportModalBackdrop');
      const listEl = document.getElementById('exportFilesList');
      const noticeEl = document.getElementById('exportModalNotice');
      const confirmBtn = document.getElementById('confirmDownloadZipBtn');

      const archivos = obtenerResumenArchivosExportacion();
      listEl.innerHTML = '';

      if (archivos.length === 0) {
        noticeEl.innerHTML = `<strong style="color:var(--accent-crimson)">Aviso:</strong> Aún no has cargado ningún diseño en el anverso ni en el reverso. Sube una imagen o pulsa "+ Gráfico Demo" en el Paso 2 para poder exportar.`;
        const li = document.createElement('li');
        li.textContent = 'Ningún archivo disponible para exportar.';
        listEl.appendChild(li);
        confirmBtn.disabled = true;
      } else {
        const zipName = `polera-talla-${state.talla}-${obtenerFechaActualISO()}.zip`;
        noticeEl.innerHTML = `Paquete listo: <strong>${zipName}</strong>. Las vistas se exportan en alta resolución sin manijas de edición.`;
        for (const item of archivos) {
          const li = document.createElement('li');
          li.innerHTML = `<span><strong>${item.nombre}</strong></span><span class="file-tag">${item.desc}</span>`;
          listEl.appendChild(li);
        }
        confirmBtn.disabled = false;
      }

      backdrop.classList.add('open');
    }

    async function generarYDescargarZIP() {
      if (typeof JSZip === 'undefined') {
        mostrarNotificacion('Error: La librería JSZip no pudo cargarse desde cdnjs.');
        return;
      }
      const confirmBtn = document.getElementById('confirmDownloadZipBtn');
      const textoOriginal = confirmBtn.textContent;
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Generando paquete de alta resolución...';

      try {
        const zip = new JSZip();
        const hayAnverso = ladoTieneContenido('anverso');
        const hayReverso = ladoTieneContenido('reverso');

        if (hayAnverso) {
          const blobAnverso = await generarImagenExportacionLado('anverso');
          if (blobAnverso) zip.file('anverso.png', blobAnverso);
        }
        if (hayReverso) {
          const blobReverso = await generarImagenExportacionLado('reverso');
          if (blobReverso) zip.file('reverso.png', blobReverso);
        }

        ['anverso', 'reverso'].forEach((ladoKey) => {
          const disenos = obtenerDisenosLado(ladoKey);
          disenos.forEach((d, idx) => {
            if (d && d.originalFile) {
              const suffix = disenos.length > 1 ? `_${idx + 1}` : '';
              zip.file(`diseno_${ladoKey}${suffix}.${d.fileExt}`, d.originalFile);
            }
          });
        });

        zip.file('especificaciones.txt', generarTextoEspecificaciones());

        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        const zipName = `polera-talla-${state.talla}-${obtenerFechaActualISO()}.zip`;

        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = zipName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 5000);

        document.getElementById('exportModalBackdrop').classList.remove('open');
        mostrarNotificacion(`¡Descarga completada! (${zipName})`);
      } catch (err) {
        mostrarNotificacion('Ocurrió un problema al empaquetar el archivo ZIP.');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = textoOriginal;
      }
    }

    /**
     * ============================================================================
     * SECCIÓN 9: TEMA CLARO/OSCURO, CONTROLES DE UI Y ARRANQUE
     * ============================================================================
     */
    function esColorOscuro(hex) {
      const clean = hex.replace('#', '');
      const r = parseInt(clean.substring(0, 2), 16) || 0;
      const g = parseInt(clean.substring(2, 4), 16) || 0;
      const b = parseInt(clean.substring(4, 6), 16) || 0;
      return (0.299 * r + 0.587 * g + 0.114 * b) < 120;
    }

    function inicializarTema() {
      let temaGuardado = null;
      try {
        temaGuardado = localStorage.getItem('zairen_theme');
      } catch (e) {
        // Si localStorage falla o está bloqueado, funciona igual
      }

      if (temaGuardado === 'dark' || temaGuardado === 'light') {
        document.documentElement.setAttribute('data-theme', temaGuardado);
      } else {
        const prefiereOscuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefiereOscuro ? 'dark' : 'light');
      }

      document.getElementById('themeToggleBtn').addEventListener('click', () => {
        const actual = document.documentElement.getAttribute('data-theme');
        const nuevo = actual === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nuevo);
        try {
          localStorage.setItem('zairen_theme', nuevo);
        } catch (e) {}
        solicitarRender();
      });
    }

    function renderizarPaletaColores() {
      const container = document.getElementById('colorSwatchesContainer');
      container.innerHTML = '';
      PALETA_COLORES.forEach((c) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'color-swatch';
        btn.style.backgroundColor = c.hex;
        btn.title = `${c.nombre} (${c.hex})`;
        btn.setAttribute('aria-label', `Color ${c.nombre}`);
        btn.dataset.hex = c.hex;
        btn.addEventListener('click', () => seleccionarColorPrenda(c.hex));
        container.appendChild(btn);
      });
      actualizarUIColorSeleccionado();
    }

    function seleccionarColorPrenda(hex) {
      state.colorCuerpo = hex.toUpperCase();
      actualizarUIColorSeleccionado();
      guardarEstadoEnHistorial();
      solicitarRender();
    }

    function actualizarUIColorSeleccionado() {
      document.getElementById('currentColorHexLabel').textContent = state.colorCuerpo.toUpperCase();
      document.getElementById('customColorPicker').value = state.colorCuerpo;
      document.getElementById('sleeveColorPreview').style.backgroundColor = state.colorCuerpo;
      document.getElementById('collarColorPreview').style.backgroundColor = state.colorCuerpo;

      document.querySelectorAll('.color-swatch').forEach((sw) => {
        sw.classList.toggle('active', sw.dataset.hex.toUpperCase() === state.colorCuerpo.toUpperCase());
      });
    }

    function actualizarUIInfoTalla() {
      const datos = CONFIG_PRENDAS[state.prendaId].tallas[state.talla];
      const infoEl = document.getElementById('sizeDimensionsInfo');
      const badgeEl = document.getElementById('sizeEstBadge');

      infoEl.innerHTML = `
        <span>ANCHO: <strong>${datos.ancho} cm</strong></span>
        <span>LARGO: <strong>${datos.largo} cm</strong></span>
        <span>BOCA MANGA: <strong>${datos.manga} cm</strong></span>
      `;
      badgeEl.textContent = datos.estimada ? '*ESTIMADA' : 'BASE REAL';
    }

    function cambiarLadoActivo(nuevoLado) {
      if (nuevoLado !== 'anverso' && nuevoLado !== 'reverso') return;
      state.ladoActivo = nuevoLado;
      document.getElementById('tabAnverso').classList.toggle('active', nuevoLado === 'anverso');
      document.getElementById('tabAnverso').setAttribute('aria-selected', String(nuevoLado === 'anverso'));
      document.getElementById('tabReverso').classList.toggle('active', nuevoLado === 'reverso');
      document.getElementById('tabReverso').setAttribute('aria-selected', String(nuevoLado === 'reverso'));

      document.getElementById('activeSideLabelText').textContent = nuevoLado.toUpperCase();
      actualizarEstadoBotonesEdicion();
      sincronizarInputsEdicion();
      solicitarRender();
    }

    function alinearDisenoRespectoAlCuerpo(tipoAlineacion) {
      const diseno = obtenerDisenoSeleccionado(state.ladoActivo);
      if (!diseno) return;
      const g = obtenerGeometriaLado(state.ladoActivo);
      const m = calcularMetricasDisenoCm(state.ladoActivo, diseno);
      const yRef = Math.max(0, Math.min(g.largoTotalCm, diseno.yCm));
      const { izqCm, derCm } = g.obtenerCostadosCmEnY(yRef);

      switch (tipoAlineacion) {
        case 'left':
          diseno.xCm = Number((izqCm + m.bboxW / 2).toFixed(2));
          break;
        case 'center-h':
          diseno.xCm = 0;
          break;
        case 'right':
          diseno.xCm = Number((derCm - m.bboxW / 2).toFixed(2));
          break;
        case 'top':
          diseno.yCm = Number((g.cuelloYCm + m.bboxH / 2).toFixed(2));
          break;
        case 'center-v':
          diseno.yCm = Number(((g.cuelloYCm + g.largoTotalCm) / 2).toFixed(2));
          break;
        case 'bottom':
          diseno.yCm = Number((g.largoTotalCm - m.bboxH / 2).toFixed(2));
          break;
      }
      sincronizarInputsEdicion();
      guardarEstadoEnHistorial();
      solicitarRender();
    }

    function ajustarZoomInicial() {
      state.zoom = 1;
      state.panX = 0;
      state.panY = 0;
      const btn = document.getElementById('zoomResetBtn');
      if (btn) btn.textContent = '100%';
    }

    function activarSeccionMovilYPaso(numStr) {
      document.querySelectorAll('[data-goto-step]').forEach((b) => {
        b.classList.toggle('active', b.dataset.gotoStep === numStr);
      });
      document.querySelectorAll('[data-mobile-tab]').forEach((b) => {
        b.classList.toggle('active', b.dataset.mobileTab === numStr);
      });
      document.querySelectorAll('.bento-section').forEach((sec) => {
        sec.classList.toggle('mobile-active', sec.id === `stepSection${numStr}`);
      });
    }

    function conectarEventosInterfaz() {
      // Navegación por pasos en escritorio y pestañas inferiores en móvil
      document.querySelectorAll('[data-goto-step]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const num = btn.dataset.gotoStep;
          activarSeccionMovilYPaso(num);
          const target = document.getElementById(`stepSection${num}`);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (num === '3') abrirModalExportacion();
        });
      });

      document.querySelectorAll('[data-mobile-tab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const num = btn.dataset.mobileTab;
          activarSeccionMovilYPaso(num);
        });
      });

      // Selector de talla (el diseño conserva su tamaño real en cm, la polera se reescala)
      document.getElementById('sizeSelect').addEventListener('change', (e) => {
        state.talla = e.target.value;
        actualizarUIInfoTalla();
        guardarEstadoEnHistorial();
        solicitarRender();
      });

      // Selector libre de color
      document.getElementById('customColorPicker').addEventListener('input', (e) => {
        state.colorCuerpo = e.target.value.toUpperCase();
        actualizarUIColorSeleccionado();
        solicitarRender();
      });
      document.getElementById('customColorPicker').addEventListener('change', () => {
        guardarEstadoEnHistorial();
      });

      // Pestañas Anverso / Reverso
      document.getElementById('tabAnverso').addEventListener('click', () => cambiarLadoActivo('anverso'));
      document.getElementById('tabReverso').addEventListener('click', () => cambiarLadoActivo('reverso'));

      // Subida de archivos (clic y arrastrar y soltar con soporte de múltiples imágenes)
      const dropzone = document.getElementById('uploadDropzone');
      const fileInput = document.getElementById('fileInput');
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fileInput.click();
        }
      });
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          Array.from(e.target.files).forEach((file) => validarYCargarArchivoDiseno(file));
          e.target.value = '';
        }
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          Array.from(e.dataTransfer.files).forEach((file) => validarYCargarArchivoDiseno(file));
        }
      });

      document.getElementById('loadSampleGraphicBtn').addEventListener('click', cargarGraficoDemoZairen);

      // Diseño envolvente ("continuar por atrás")
      const wrapToggle = document.getElementById('wrapAroundToggle');
      wrapToggle.addEventListener('change', (e) => {
        state.envolventeActivo = e.target.checked;
        document.getElementById('wrapCardContainer').classList.toggle('active', state.envolventeActivo);
        guardarEstadoEnHistorial();
        solicitarRender();
      });

      // Botones de alineación
      document.querySelectorAll('[data-align]').forEach((btn) => {
        btn.addEventListener('click', () => alinearDisenoRespectoAlCuerpo(btn.dataset.align));
      });

      // Inputs numéricos de ancho en cm y ángulo
      document.getElementById('inputWidthCm').addEventListener('input', (e) => {
        const d = obtenerDisenoSeleccionado(state.ladoActivo);
        const val = parseFloat(e.target.value);
        if (!d || isNaN(val) || val < 1 || val > 120) return;
        d.widthCm = Number(val.toFixed(2));
        if (state.bloquearProporcion) {
          d.heightCm = Number((val / d.aspectRatio).toFixed(2));
        }
        solicitarRender();
      });
      document.getElementById('inputWidthCm').addEventListener('change', guardarEstadoEnHistorial);

      document.getElementById('inputAngleDeg').addEventListener('input', (e) => {
        const d = obtenerDisenoSeleccionado(state.ladoActivo);
        const val = parseFloat(e.target.value);
        if (!d || isNaN(val)) return;
        d.angleDeg = Math.max(-180, Math.min(180, Math.round(val)));
        solicitarRender();
      });
      document.getElementById('inputAngleDeg').addEventListener('change', guardarEstadoEnHistorial);

      document.getElementById('lockAspectBtn').addEventListener('click', (e) => {
        state.bloquearProporcion = !state.bloquearProporcion;
        e.currentTarget.setAttribute('aria-pressed', String(state.bloquearProporcion));
        e.currentTarget.classList.toggle('active', state.bloquearProporcion);
        e.currentTarget.innerHTML = `<span>${state.bloquearProporcion ? 'PROP.' : 'LIBRE'}</span>`;
      });

      document.getElementById('resetAngleBtn').addEventListener('click', () => {
        const d = obtenerDisenoSeleccionado(state.ladoActivo);
        if (!d) return;
        d.angleDeg = 0;
        sincronizarInputsEdicion();
        guardarEstadoEnHistorial();
        solicitarRender();
      });

      document.getElementById('centerDesignBtn').addEventListener('click', () => {
        alinearDisenoRespectoAlCuerpo('center-h');
      });
      document.getElementById('deleteDesignBtn').addEventListener('click', eliminarDisenoActivo);

      // Deshacer / Rehacer / Cuadrícula / Cotas
      document.getElementById('undoBtn').addEventListener('click', deshacerAccion);
      document.getElementById('redoBtn').addEventListener('click', rehacerAccion);

      document.getElementById('toggleGridBtn').addEventListener('click', (e) => {
        state.mostrarCuadricula = !state.mostrarCuadricula;
        e.currentTarget.classList.toggle('active', state.mostrarCuadricula);
        e.currentTarget.setAttribute('aria-pressed', String(state.mostrarCuadricula));
        solicitarRender();
      });

      document.getElementById('toggleCotasBtn').addEventListener('click', (e) => {
        state.mostrarCotas = !state.mostrarCotas;
        e.currentTarget.classList.toggle('active', state.mostrarCotas);
        e.currentTarget.setAttribute('aria-pressed', String(state.mostrarCotas));
        solicitarRender();
      });

      // Controles de Zoom
      document.getElementById('zoomInBtn').addEventListener('click', () => {
        state.zoom = Math.min(4.5, state.zoom * 1.2);
        document.getElementById('zoomResetBtn').textContent = `${Math.round(state.zoom * 100)}%`;
        solicitarRender();
      });
      document.getElementById('zoomOutBtn').addEventListener('click', () => {
        state.zoom = Math.max(0.4, state.zoom / 1.2);
        document.getElementById('zoomResetBtn').textContent = `${Math.round(state.zoom * 100)}%`;
        solicitarRender();
      });
      document.getElementById('zoomResetBtn').addEventListener('click', () => {
        ajustarZoomInicial();
        solicitarRender();
      });

      // Modal de exportación
      document.getElementById('openExportModalBtn').addEventListener('click', abrirModalExportacion);
      document.getElementById('openExportModalBtnTop').addEventListener('click', abrirModalExportacion);
      document.getElementById('closeExportModalBtn').addEventListener('click', () => {
        document.getElementById('exportModalBackdrop').classList.remove('open');
      });
      document.getElementById('cancelExportBtn').addEventListener('click', () => {
        document.getElementById('exportModalBackdrop').classList.remove('open');
      });
      document.getElementById('confirmDownloadZipBtn').addEventListener('click', generarYDescargarZIP);

      window.addEventListener('resize', () => solicitarRender());
    }

    // Inicialización al cargar la ventana
    window.onload = function () {
      inicializarTema();
      renderizarPaletaColores();
      actualizarUIInfoTalla();
      conectarEventosInterfaz();
      guardarEstadoEnHistorial();
      cargarImagenesPrenda();
    };
