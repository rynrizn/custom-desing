/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Módulo de Gestión de Pedidos y Múltiples Poleras
 * ============================================================================
 * Permite gestionar múltiples prendas independientes dentro del mismo pedido,
 * asociar a cada polera una matriz de tallas y cantidades (ej. 2 en M, 1 en XL),
 * color de tela, teléfono WhatsApp de contacto y notas libres para taller.
 */

import { CONFIG } from './config.js';
import { estado } from './estado.js';
import { gestorAlmacenamiento } from './almacenamiento.js';

export class GestorPedido {
  constructor() {}

  /**
   * Agrega una fila de talla y cantidad a la polera activa.
   */
  agregarFilaTallaCantidad(talla = 'M', cantidad = 1) {
    const polera = estado.poleraActiva;
    if (!polera.cantidades) polera.cantidades = [];

    // Si ya existe la talla en la lista, incrementa la cantidad
    const existente = polera.cantidades.find(f => f.talla === talla);
    if (existente) {
      existente.cantidad += cantidad;
    } else {
      polera.cantidades.push({ talla, cantidad: Math.max(1, cantidad) });
    }

    estado.guardarSnapshotHistorial(`Agregar talla ${talla}`);
    estado.notificar('pedido-actualizado');
  }

  /**
   * Modifica la cantidad de una fila específica.
   */
  actualizarCantidad(index, nuevaCantidad) {
    const polera = estado.poleraActiva;
    if (!polera.cantidades || !polera.cantidades[index]) return;

    const cant = parseInt(nuevaCantidad, 10);
    if (isNaN(cant) || cant <= 0) {
      polera.cantidades.splice(index, 1);
    } else {
      polera.cantidades[index].cantidad = cant;
    }

    // Asegurar que quede al menos una fila
    if (polera.cantidades.length === 0) {
      polera.cantidades.push({ talla: polera.tallaVista || 'M', cantidad: 1 });
    }

    estado.guardarSnapshotHistorial('Cambiar cantidad');
    estado.notificar('pedido-actualizado');
  }

  /**
   * Elimina una fila de talla/cantidad.
   */
  eliminarFila(index) {
    const polera = estado.poleraActiva;
    if (!polera.cantidades) return;
    polera.cantidades.splice(index, 1);

    if (polera.cantidades.length === 0) {
      polera.cantidades.push({ talla: polera.tallaVista || 'M', cantidad: 1 });
    }

    estado.guardarSnapshotHistorial('Eliminar fila talla');
    estado.notificar('pedido-actualizado');
  }

  /**
   * Calcula el total acumulado de prendas de todo el pedido.
   */
  calcularTotalPrendas() {
    let total = 0;
    for (const p of estado.datos.poleras) {
      if (p.cantidades && Array.isArray(p.cantidades)) {
        for (const fila of p.cantidades) {
          total += (fila.cantidad || 0);
        }
      }
    }
    return total;
  }

  /**
   * Genera el objeto JSON formal del pedido con todas sus poleras y metadatos.
   */
  generarObjetoPedidoJSON(codigoPedido = null) {
    const codigo = codigoPedido || gestorAlmacenamiento.generarCodigoPedido();
    return {
      version: '2.0',
      codigoPedido: codigo,
      creadoEn: new Date().toISOString(),
      cliente: {
        whatsapp: estado.datos.clienteWhatsApp || '',
        indicaciones: estado.datos.indicaciones || ''
      },
      resumen: {
        totalPolerasDistintas: estado.datos.poleras.length,
        totalUnidadesPrenda: this.calcularTotalPrendas()
      },
      poleras: estado.datos.poleras.map((p, idx) => ({
        indice: idx + 1,
        id: p.id,
        nombre: p.nombre,
        colorHex: p.color,
        tallaVista: p.tallaVista,
        cantidadesPorTalla: p.cantidades,
        superficiesConContenido: Object.keys(p.superficies).filter(s => p.superficies[s]?.capas?.length > 0),
        mangasEspejo: p.mangasEspejo,
        mangasVoltear: p.mangasVoltear,
        envolvente: p.envolvente
      }))
    };
  }

  /**
   * Genera el texto legible `especificaciones.txt` de confección para el taller.
   */
  generarTextoEspecificaciones(polera, indicePolera = 1) {
    const p = polera || estado.poleraActiva;
    const lineas = [];
    lineas.push(`======================================================================`);
    lineas.push(`ZAIREN CAD TEXTIL v2 — FICHA TÉCNICA DE CONFECCIÓN`);
    lineas.push(`Polera #${indicePolera}: ${p.nombre}`);
    lineas.push(`Fecha: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`);
    lineas.push(`======================================================================\n`);

    lineas.push(`[1. DATOS DE PRENDA Y TALLAS]`);
    lineas.push(`Color base tela: ${p.color}`);
    lineas.push(`Talla de maqueta: ${p.tallaVista}`);
    lineas.push(`Desglose de unidades a fabricar:`);
    if (p.cantidades && p.cantidades.length) {
      for (const fila of p.cantidades) {
        const infoT = CONFIG.TALLAS_CUERPO[fila.talla];
        const marca = infoT?.estimada ? ' (estimada)' : ' (medida real de taller)';
        lineas.push(`  - Talla ${fila.talla} (${infoT?.ancho || 53} × ${infoT?.largo || 71} cm): ${fila.cantidad} unidad(es)${marca}`);
      }
    } else {
      const infoT = CONFIG.TALLAS_CUERPO[p.tallaVista];
      const marca = infoT?.estimada ? ' (estimada)' : ' (medida real de taller)';
      lineas.push(`  - Talla ${p.tallaVista} (${infoT?.ancho || 53} × ${infoT?.largo || 71} cm): 1 unidad${marca}`);
    }
    lineas.push(`Continuidad envolvente lateral: ${p.envolvente ? 'SÍ' : 'NO'}`);
    lineas.push(`Sincronización espejo de mangas: ${p.mangasEspejo ? 'SÍ' : 'NO'}\n`);

    lineas.push(`[2. DETALLE DE ESTAMPADOS POR SUPERFICIE]`);
    const superficies = ['anverso', 'reverso', 'manga_izquierda', 'manga_derecha'];

    for (const sup of superficies) {
      const capas = p.superficies[sup]?.capas || [];
      lineas.push(`\n--- SUPERFICIE: ${sup.toUpperCase().replace('_', ' ')} (${capas.length} elemento(s)) ---`);

      if (!capas.length) {
        lineas.push(`(Sin estampados configurados en esta superficie)`);
        continue;
      }

      capas.forEach((c, idx) => {
        lineas.push(`  Elemento #${idx + 1}: [${c.tipo.toUpperCase()}] "${c.nombre}"`);
        lineas.push(`    - Posición centro: x=${c.xCm.toFixed(1)} cm, y=${c.yCm.toFixed(1)} cm`);
        lineas.push(`    - Dimensiones estampadas: ${c.widthCm.toFixed(1)} cm ancho × ${c.heightCm.toFixed(1)} cm alto`);
        lineas.push(`    - Rotación: ${c.angleDeg}° | Opacidad: ${Math.round(c.opacity * 100)}%`);

        if (c.tipo === 'imagen') {
          const dpi = Math.round(c.anchoOriginalPx / (c.widthCm / 2.54));
          lineas.push(`    - Resolución nativa archivo: ${c.anchoOriginalPx} × ${c.altoOriginalPx} px`);
          lineas.push(`    - Densidad calculada: ${dpi} DPI ${dpi < 150 ? '(! AVISO: CALIDAD BAJA PARA IMPRESIÓN)' : '(ÓPTIMA)'}`);
        } else if (c.tipo === 'texto') {
          lineas.push(`    - Tipografía: ${c.fuente} (${c.bold ? 'Negrita' : 'Normal'}, ${c.italic ? 'Cursiva' : 'Normal'})`);
          lineas.push(`    - Color: ${c.color}`);
          lineas.push(`    - Contenido: "${c.texto.replace(/\n/g, ' ')}"`);
        }
      });
    }

    lineas.push(`\n[3. CONTACTO Y TALLER]`);
    lineas.push(`WhatsApp Cliente: ${estado.datos.clienteWhatsApp || 'No especificado'}`);
    lineas.push(`Indicaciones especiales: ${estado.datos.indicaciones || 'Sin indicaciones adicionales'}`);
    lineas.push(`\n======================================================================`);
    return lineas.join('\n');
  }
}

export const gestorPedido = new GestorPedido();
