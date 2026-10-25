/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Tour Guiado Interactivo con Driver.js
 * ============================================================================
 * Provee un recorrido de 5 pasos cortos:
 * 1. Mesa de trabajo
 * 2. Superficies (anverso, reverso, mangas)
 * 3. Talla y color
 * 4. Subir diseño y texto
 * 5. Pedido y exportación
 * En móvil, abre automáticamente la hoja correspondiente en cada paso.
 */

const TOUR_STORAGE_KEY = 'zairen_tour_v2_completado';

export class TourGuiado {
  constructor() {
    this.driverObj = null;
  }

  iniciar(forzar = false) {
    if (!forzar) {
      const yaVisto = localStorage.getItem(TOUR_STORAGE_KEY);
      if (yaVisto === 'true') return;
    }

    if (typeof window.driver === 'undefined' && typeof window.driver?.js?.driver === 'undefined') {
      console.warn('Driver.js no está disponible en la página.');
      return;
    }

    const driverFn = window.driver?.js?.driver || window.driver;

    const esMovil = window.innerWidth <= 960;

    this.driverObj = driverFn({
      showProgress: true,
      animate: true,
      allowClose: true,
      doneBtnText: '¡Listo!',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Atrás',
      onDestroyStarted: () => {
        localStorage.setItem(TOUR_STORAGE_KEY, 'true');
        if (esMovil && window.appUI) {
          window.appUI.cerrarTodasLasHojas();
        }
        this.driverObj.destroy();
      },
      onHighlightStarted: (element, step) => {
        // En móvil, sincronizar apertura de la hoja inferior según el paso
        if (esMovil && window.appUI) {
          if (step.id === 'paso-prenda') window.appUI.abrirHoja('prenda');
          else if (step.id === 'paso-diseno') window.appUI.abrirHoja('diseno');
          else if (step.id === 'paso-capas') window.appUI.abrirHoja('capas');
          else if (step.id === 'paso-pedido') window.appUI.abrirHoja('pedido');
          else window.appUI.cerrarTodasLasHojas();
        }
      },
      steps: [
        {
          element: '#canvasViewport',
          id: 'paso-mesa',
          popover: {
            title: '1. Mesa CAD y Gestos Táctiles',
            description: 'Con 1 dedo: arrastra un elemento para moverlo de inmediato o la mesa para desplazarte. Con 2 dedos: pellizca para zoom fluido (30% a 800%) y paneo simultáneo. Doble toque en vacío encuadra la prenda a pantalla.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '#surfaceSwitcher',
          id: 'paso-superficies',
          popover: {
            title: '2. Superficies y Patrón Plano de Mangas',
            description: 'Cambia entre Anverso, Reverso y Mangas. Ambas mangas abren de forma predeterminada en su patrón plano técnico al 75% de zoom, con cotas de costura y puño, y opción de no invertir texto al reflejar en espejo.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: esMovil ? '#mobileTabPrenda' : '#panelSectionPrenda',
          id: 'paso-prenda',
          popover: {
            title: '3. Talla y Color de Prenda',
            description: 'Elige la talla (S a XXL) con siluetas reales escaladas ancladas a medidas de taller. Cambia el color oficial de la tela con la paleta Zenith Monochrome.',
            side: esMovil ? 'top' : 'right',
            align: 'start'
          }
        },
        {
          element: esMovil ? '#mobileTabDiseno' : '#panelSectionDiseno',
          id: 'paso-diseno',
          popover: {
            title: '4. Subir Diseño y Añadir Texto',
            description: 'Arrastra tus gráficos (PNG, JPG, SVG, WEBP) o escribe textos con más de 10 tipografías oficiales. El texto es ágil y estable (mover, rotar y editar), y las imágenes cuentan con aviso de calidad < 150 DPI.',
            side: esMovil ? 'top' : 'right',
            align: 'start'
          }
        },
        {
          element: esMovil ? '#controlsPanel' : '#panelSectionCapas',
          id: 'paso-capas',
          popover: {
            title: esMovil ? '5. Hoja Deslizable en 3 Posiciones' : '5. Gestión de Capas',
            description: esMovil
              ? 'La hoja cuenta con 3 posiciones: cerrada, media (donde la mesa se reduce para mantener tu diseño visible arriba sin taparlo) y completa. Además incluye barra de ajuste fino con pasos de 1 mm.'
              : 'Ordena, bloquea, visualiza y elimina capas con botones directos y barra flotante contextual fuera de la silueta.',
            side: esMovil ? 'top' : 'right',
            align: 'start'
          }
        },
        {
          element: esMovil ? '#mobileTabPedido' : '#panelSectionPedido',
          id: 'paso-pedido',
          popover: {
            title: '6. Múltiples Poleras y Envío Cifrado',
            description: 'Crea varias poleras por pedido, desglosa cantidades por talla, descarga vistas previas con marca de agua y genera el paquete técnico cifrado .zrn.',
            side: esMovil ? 'top' : 'right',
            align: 'start'
          }
        }
      ]
    });

    this.driverObj.drive();
  }
}

export const tourGuiado = new TourGuiado();
