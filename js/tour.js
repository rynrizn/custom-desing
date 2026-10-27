/**
 * ============================================================================
 * CustomyTee — Tour Guiado Interactivo con Driver.js (Fase 6)
 * ============================================================================
 * Proporciona un recorrido ágil de máximo 8 pasos:
 * 1. Barra superior (Proyecto, Ajustes, Tema, Pedido)
 * 2. Mesa CAD Textil y navegación
 * 3. Selector de superficies (Torso y Mangas en patrón plano)
 * 4. Añadir arte (Imágenes y tipografías)
 * 5. Gestión y transformación de capas
 * 6. Configurar prenda, tallas reales y colores
 * 7. Mockup y generación de pedido (.zrp / .zrn)
 * 8. Agradecimiento y soporte directo en Instagram
 *
 * En móvil, abre y cierra automáticamente las hojas inferiores según el paso.
 */

import { CONFIG } from './config.js';

export const TOUR_STORAGE_KEY = 'customytee_tour_completado';

export class TourGuiado {
  constructor() {
    this.driverObj = null;
  }

  iniciar(forzar = false) {
    if (!forzar) {
      const yaVisto = (typeof localStorage !== 'undefined') ? localStorage.getItem(TOUR_STORAGE_KEY) : null;
      if (yaVisto === 'true') return;
    }

    if (typeof window === 'undefined') return;

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
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(TOUR_STORAGE_KEY, 'true');
        }
        if (esMovil && window.appUI) {
          window.appUI.cerrarTodasLasHojas();
        }
        this.driverObj?.destroy?.();
      },
      onHighlightStarted: (element, step) => {
        if (window.appUI) {
          if (step.id === 'paso-prenda') {
            window.appUI.abrirHoja('prenda');
          } else if (step.id === 'paso-diseno') {
            window.appUI.abrirHoja('diseno');
          } else if (step.id === 'paso-capas') {
            window.appUI.abrirHoja('capas');
          } else if (step.id === 'paso-pedido') {
            window.appUI.abrirHoja('pedido');
          } else if (esMovil) {
            window.appUI.cerrarTodasLasHojas();
          }
        }
      },
      steps: [
        {
          element: '.top-navbar',
          id: 'paso-barra-superior',
          popover: {
            title: '1. Barra Superior y Acciones',
            description: 'Gestiona tu proyecto (guardar .zrp, abrir y descargar vista previa), ajustes técnicos, alternancia de tema claro/oscuro y el botón directo de confirmación de PEDIDO.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#canvasViewport',
          id: 'paso-mesa',
          popover: {
            title: '2. Mesa CAD Textil',
            description: 'Con 1 dedo: arrastra un elemento para moverlo o la mesa para desplazarte. Con 2 dedos: pellizca para zoom fluido (30% a 800%) y paneo simultáneo. Doble toque en espacio vacío encuadra la prenda completa.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '#surfaceSwitcher',
          id: 'paso-superficies',
          popover: {
            title: '3. Selector de Superficies',
            description: 'Personaliza de forma aislada Torso Anverso, Reverso y Mangas. Ambas mangas inician en patrón plano al 75% con cotas milimétricas y opción de no invertir texto al espejar.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: esMovil ? '#mobileTabDiseno' : '#panelSectionDiseno',
          id: 'paso-diseno',
          popover: {
            title: '4. Añadir Gráficos y Texto',
            description: 'Sube gráficos en alta definición (PNG, JPG, SVG, WEBP con aviso de calidad < 150 DPI) o escribe textos con 14 fuentes tipográficas oficiales seleccionables.',
            side: esMovil ? 'top' : 'right',
            align: 'start'
          }
        },
        {
          element: esMovil ? '#mobileTabCapas' : '#panelSectionCapas',
          id: 'paso-capas',
          popover: {
            title: '5. Transformar y Ordenar Capas',
            description: 'Alinea al instante, bloquea, sube o baja capas y ajusta posiciones con precisión milimétrica usando la barra de ajuste fino (1 mm y 1°).',
            side: esMovil ? 'top' : 'right',
            align: 'start'
          }
        },
        {
          element: esMovil ? '#mobileTabPrenda' : '#panelSectionPrenda',
          id: 'paso-prenda',
          popover: {
            title: '6. Talla Real y Colores',
            description: 'Elige la talla en vista (S a XXL anclada a medidas reales de confección), cambia el color de la tela con la paleta Zenith y añade múltiples prendas si lo deseas.',
            side: esMovil ? 'top' : 'right',
            align: 'start'
          }
        },
        {
          element: esMovil ? '#mobileTabPedido' : '#panelSectionPedido',
          id: 'paso-pedido',
          popover: {
            title: '7. Resumen y Exportación',
            description: 'Desglosa cantidades por talla, revisa la cotización técnica al instante y descarga tu paquete de cliente .zrp editable junto con el paquete de taller .zrn.',
            side: esMovil ? 'top' : 'right',
            align: 'start'
          }
        },
        {
          element: '.brand-group',
          id: 'paso-final-agradecimiento',
          popover: {
            title: '8. ¡Gracias por usar CustomyTee!',
            description: `<div>Tu editor CAD textil está listo. Para consultas de confección o pedidos por mayor, conéctate con nuestro taller:</div><div style="margin-top:10px;"><a href="${CONFIG.INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:6px; background:var(--primary); color:var(--on-primary); padding:6px 14px; text-decoration:none; font-family:var(--font-headline); font-size:11px; font-weight:600; border-radius:2px;">Soporte en Instagram (@zairen.lab)</a></div>`,
            side: 'bottom',
            align: 'start'
          }
        }
      ]
    });

    this.driverObj.drive();
  }
}

export const tourGuiado = new TourGuiado();
