/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Módulo de Estado Global y Persistencia
 * ============================================================================
 * Maneja el estado reactivo, la colección de poleras independientes,
 * el historial de deshacer/rehacer y el almacenamiento en localStorage.
 */

import { CONFIG } from './config.js';

const STORAGE_KEY = 'zairen_cad_v2_proyecto';
const MAX_HISTORIAL = 30;


function limpiarPolerasParaSerializar(poleras, paraLocalStorage = false) {
  return poleras.map(p => {
    const clonP = { ...p, superficies: {} };
    for (const [supKey, supVal] of Object.entries(p.superficies || {})) {
      clonP.superficies[supKey] = {
        capas: (supVal.capas || []).map(c => {
          const { imgElement, originalFile, ...resto } = c;
          // Las URLs blob: son temporales del documento de la pestaña.
          // Al recargar expiran, por lo que no se persisten en localStorage.
          if (paraLocalStorage && resto.dataUrl && resto.dataUrl.startsWith('blob:')) {
            resto.dataUrl = null;
          }
          return resto;
        })
      };
    }
    return clonP;
  });
}

function crearPoleraInicial(id = 'polera-1', nombre = 'Polera 1') {
  return {
    id,
    nombre,
    color: CONFIG.PALETA_COLORES[0].hex, // Blanco Zairen #FAF9F6
    tallaVista: 'M',
    cantidades: [
      { talla: 'M', cantidad: 1 }
    ],
    superficies: {
      anverso: { capas: [] },
      reverso: { capas: [] },
      manga_izquierda: { capas: [] },
      manga_derecha: { capas: [] }
    },
    mangasEspejo: false,
    mangasVoltear: true,
    envolvente: false
  };
}

class EstadoApp {
  constructor() {
    this.listeners = new Set();
    this.historial = [];
    this.indiceHistorial = -1;
    this.bloquearHistorial = false;
    this.cacheRecursos = new Map();

    // Estado principal
    this.datos = {
      poleras: [crearPoleraInicial()],
      poleraActivaIndex: 0,
      superficieActiva: 'anverso', // 'anverso' | 'reverso' | 'manga_izquierda' | 'manga_derecha'
      capaSeleccionadaId: null,

      // Preferencias y visualización
      unidades: 'cm', // 'cm' | 'mm' | 'in'
      mostrarCuadricula: false,
      imanesGuias: true,
      mostrarCotas: false,
      fondoMesa: 'cuadros', // 'oscuro' | 'claro' | 'cuadros'
      tema: 'sistema', // 'claro' | 'oscuro' | 'sistema'

      // Datos de Orden
      clienteWhatsApp: '+591',
      indicaciones: '',

      // Viewport de cámara
      zoom: 1,
      panX: 0,
      panY: 0
    };

    this.cargarDesdeLocalStorage();
    this.guardarSnapshotHistorial('Estado inicial');
  }

  // --- Subscripción a cambios ---
  suscribir(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notificar(tipo = 'cambio', detalle = null) {
    for (const cb of this.listeners) {
      try {
        cb(tipo, detalle, this.datos);
      } catch (err) {
        console.error('Error en listener de estado:', err);
      }
    }
    this.guardarEnLocalStorage();
  }

  // --- Getters y utilidades de acceso rápido ---
  get poleraActiva() {
    return this.datos.poleras[this.datos.poleraActivaIndex] || this.datos.poleras[0];
  }

  get superficieActivaKey() {
    return this.datos.superficieActiva;
  }

  get capasSuperficieActiva() {
    const p = this.poleraActiva;
    if (!p.superficies[this.datos.superficieActiva]) {
      p.superficies[this.datos.superficieActiva] = { capas: [] };
    }
    return p.superficies[this.datos.superficieActiva].capas;
  }

  get capaSeleccionada() {
    const capas = this.capasSuperficieActiva;
    return capas.find(c => c.id === this.datos.capaSeleccionadaId) || null;
  }

  // --- Manejo de Superficie y Polera ---
  setSuperficieActiva(superficieKey) {
    if (['anverso', 'reverso', 'manga_izquierda', 'manga_derecha'].includes(superficieKey)) {
      this.datos.superficieActiva = superficieKey;
      this.datos.capaSeleccionadaId = null;
      this.notificar('cambio-superficie', superficieKey);
    }
  }

  setPoleraActiva(index) {
    if (index >= 0 && index < this.datos.poleras.length) {
      this.datos.poleraActivaIndex = index;
      this.datos.capaSeleccionadaId = null;
      this.notificar('cambio-polera', index);
    }
  }

  agregarPolera() {
    const nuevoNumero = this.datos.poleras.length + 1;
    const nueva = crearPoleraInicial(`polera-${Date.now()}`, `Polera ${nuevoNumero}`);
    this.datos.poleras.push(nueva);
    this.datos.poleraActivaIndex = this.datos.poleras.length - 1;
    this.guardarSnapshotHistorial('Añadir nueva polera');
    this.notificar('polera-agregada');
  }

  duplicarPolera(index) {
    const original = this.datos.poleras[index];
    if (!original) return;
    const copia = JSON.parse(JSON.stringify(original));
    copia.id = `polera-${Date.now()}`;
    copia.nombre = `${original.nombre} (Copia)`;
    for (const [supKey, supVal] of Object.entries(copia.superficies || {})) {
      const origCapas = original.superficies?.[supKey]?.capas || [];
      (supVal.capas || []).forEach((c, idx) => {
        if (c.tipo === 'imagen' && origCapas[idx]?.imgElement) {
          c.imgElement = origCapas[idx].imgElement;
          c.originalFile = origCapas[idx].originalFile;
          this.cacheRecursos.set(c.id, {
            imgElement: c.imgElement,
            originalFile: c.originalFile,
            dataUrl: c.dataUrl
          });
        }
      });
    }
    this.datos.poleras.splice(index + 1, 0, copia);
    this.datos.poleraActivaIndex = index + 1;
    this.guardarSnapshotHistorial(`Duplicar ${original.nombre}`);
    this.notificar('polera-duplicada');
  }

  eliminarPolera(index) {
    if (this.datos.poleras.length <= 1) return; // Mínimo 1 polera
    this.datos.poleras.splice(index, 1);
    if (this.datos.poleraActivaIndex >= this.datos.poleras.length) {
      this.datos.poleraActivaIndex = this.datos.poleras.length - 1;
    }
    this.guardarSnapshotHistorial('Eliminar polera');
    this.notificar('polera-eliminada');
  }

  // --- Gestión de Capas ---
  agregarCapa(capa) {
    const capas = this.capasSuperficieActiva;
    capas.push(capa);
    this.datos.capaSeleccionadaId = capa.id;

    if (capa.tipo === 'imagen' && capa.imgElement) {
      this.cacheRecursos.set(capa.id, {
        imgElement: capa.imgElement,
        originalFile: capa.originalFile,
        dataUrl: capa.dataUrl
      });
    }

    // Si la superficie actual es manga y está en modo espejo, sincronizar
    this.sincronizarMangasSiAplica();

    this.guardarSnapshotHistorial(`Añadir ${capa.tipo}`);
    this.notificar('capa-agregada', capa);
  }

  seleccionarCapa(id) {
    this.datos.capaSeleccionadaId = id;
    this.notificar('capa-seleccionada', id);
  }

  actualizarCapa(id, propiedades, registrarHistorial = true) {
    const capa = this.capasSuperficieActiva.find(c => c.id === id);
    if (!capa || capa.locked) return;

    Object.assign(capa, propiedades);
    this.sincronizarMangasSiAplica();

    if (registrarHistorial) {
      this.guardarSnapshotHistorial('Modificar capa');
    }
    this.notificar('capa-modificada', capa);
  }

  eliminarCapa(id) {
    const capas = this.capasSuperficieActiva;
    const idx = capas.findIndex(c => c.id === id);
    if (idx !== -1) {
      const eliminada = capas.splice(idx, 1)[0];
      if (this.datos.capaSeleccionadaId === id) {
        this.datos.capaSeleccionadaId = capas.length ? capas[capas.length - 1].id : null;
      }
      this.sincronizarMangasSiAplica();
      this.guardarSnapshotHistorial('Eliminar capa');
      this.notificar('capa-eliminada', eliminada);
    }
  }

  duplicarCapa(id) {
    const capa = this.capasSuperficieActiva.find(c => c.id === id);
    if (!capa) return;
    const copia = JSON.parse(JSON.stringify(capa));
    copia.id = `capa-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    copia.nombre = `${capa.nombre} (Copia)`;
    copia.xCm += 1.5;
    copia.yCm += 1.5;
    if (capa.imgElement) {
      copia.imgElement = capa.imgElement;
      copia.originalFile = capa.originalFile;
      this.cacheRecursos.set(copia.id, {
        imgElement: copia.imgElement,
        originalFile: copia.originalFile,
        dataUrl: copia.dataUrl
      });
    }
    this.capasSuperficieActiva.push(copia);
    this.datos.capaSeleccionadaId = copia.id;
    this.sincronizarMangasSiAplica();
    this.guardarSnapshotHistorial('Duplicar capa');
    this.notificar('capa-agregada', copia);
  }

  reordenarCapa(id, direccion) { // 'subir' | 'bajar' | 'tope' | 'fondo'
    const capas = this.capasSuperficieActiva;
    const idx = capas.findIndex(c => c.id === id);
    if (idx === -1) return;

    const capa = capas.splice(idx, 1)[0];
    if (direccion === 'subir') capas.splice(Math.min(capas.length, idx + 1), 0, capa);
    else if (direccion === 'bajar') capas.splice(Math.max(0, idx - 1), 0, capa);
    else if (direccion === 'tope') capas.push(capa);
    else if (direccion === 'fondo') capas.unshift(capa);

    this.sincronizarMangasSiAplica();
    this.guardarSnapshotHistorial('Reordenar capas');
    this.notificar('capas-reordenadas');
  }

  // --- Sincronización de Mangas (Espejo y Volteo) ---
  sincronizarMangasSiAplica() {
    const p = this.poleraActiva;
    if (!p.mangasEspejo) return;

    const supActual = this.datos.superficieActiva;
    if (supActual !== 'manga_izquierda' && supActual !== 'manga_derecha') return;

    const supDestino = supActual === 'manga_izquierda' ? 'manga_derecha' : 'manga_izquierda';
    const capasOrigen = p.superficies[supActual].capas;

    // Duplicar capas en posición simétrica
    p.superficies[supDestino].capas = capasOrigen.map(c => {
      const clon = JSON.parse(JSON.stringify(c));
      clon.id = `espejo-${c.id}`;
      // Invertir posición horizontal respecto al eje central
      clon.xCm = -c.xCm;
      if (p.mangasVoltear) {
        clon.flipH = c.flipH;
      } else {
        clon.flipH = !c.flipH;
      }
      if (c.imgElement) {
        clon.imgElement = c.imgElement;
        clon.originalFile = c.originalFile;
        this.cacheRecursos.set(clon.id, {
          imgElement: clon.imgElement,
          originalFile: clon.originalFile,
          dataUrl: clon.dataUrl
        });
      }
      return clon;
    });
  }

  // --- Historial Deshacer / Rehacer ---
  guardarSnapshotHistorial(descripcion = '') {
    if (this.bloquearHistorial) return;

    // Indexar recursos de imágenes antes del snapshot
    for (const p of this.datos.poleras) {
      for (const sup of Object.values(p.superficies || {})) {
        for (const c of (sup.capas || [])) {
          if (c.tipo === 'imagen' && c.imgElement) {
            this.cacheRecursos.set(c.id, {
              imgElement: c.imgElement,
              originalFile: c.originalFile,
              dataUrl: c.dataUrl
            });
          }
        }
      }
    }

    // Descartar rehacer futuros
    if (this.indiceHistorial < this.historial.length - 1) {
      this.historial = this.historial.slice(0, this.indiceHistorial + 1);
    }

    const snapshot = JSON.stringify(limpiarPolerasParaSerializar(this.datos.poleras));
    this.historial.push({ snapshot, descripcion });
    if (this.historial.length > MAX_HISTORIAL) {
      this.historial.shift();
    }
    this.indiceHistorial = this.historial.length - 1;
    this.notificar('historial-cambio');
  }

  _reacoplarRecursosTrasHistorial() {
    for (const p of this.datos.poleras) {
      for (const sup of Object.values(p.superficies || {})) {
        for (const c of (sup.capas || [])) {
          if (c.tipo === 'imagen') {
            const recurso = this.cacheRecursos.get(c.id);
            if (recurso?.imgElement && (recurso.imgElement.naturalWidth > 0 || recurso.imgElement.complete)) {
              c.imgElement = recurso.imgElement;
              c.originalFile = recurso.originalFile || c.originalFile;
            } else if (c.dataUrl && typeof Image !== 'undefined') {
              c.imgElement = null;
              const img = new Image();
              img.onload = () => {
                c.imgElement = img;
                this.cacheRecursos.set(c.id, {
                  imgElement: img,
                  originalFile: c.originalFile,
                  dataUrl: c.dataUrl
                });
                this.notificar('capas-actualizadas');
              };
              img.src = c.dataUrl;
            } else {
              c.imgElement = null;
            }
          }
        }
      }
    }
  }

  deshacer() {
    if (this.indiceHistorial > 0) {
      this.bloquearHistorial = true;
      this.indiceHistorial--;
      this.datos.poleras = JSON.parse(this.historial[this.indiceHistorial].snapshot);
      this._reacoplarRecursosTrasHistorial();
      this.bloquearHistorial = false;
      this.notificar('deshacer');
    }
  }

  rehacer() {
    if (this.indiceHistorial < this.historial.length - 1) {
      this.bloquearHistorial = true;
      this.indiceHistorial++;
      this.datos.poleras = JSON.parse(this.historial[this.indiceHistorial].snapshot);
      this._reacoplarRecursosTrasHistorial();
      this.bloquearHistorial = false;
      this.notificar('rehacer');
    }
  }

  get puedeDeshacer() {
    return this.indiceHistorial > 0;
  }

  get puedeRehacer() {
    return this.indiceHistorial < this.historial.length - 1;
  }

  // --- Persistencia localStorage con try/catch ---
  guardarEnLocalStorage() {
    try {
      const serializado = JSON.stringify({
        poleras: limpiarPolerasParaSerializar(this.datos.poleras, true),
        poleraActivaIndex: this.datos.poleraActivaIndex,
        unidades: this.datos.unidades,
        mostrarCuadricula: this.datos.mostrarCuadricula,
        imanesGuias: this.datos.imanesGuias,
        mostrarCotas: this.datos.mostrarCotas,
        fondoMesa: this.datos.fondoMesa,
        tema: this.datos.tema,
        clienteWhatsApp: this.datos.clienteWhatsApp,
        indicaciones: this.datos.indicaciones
      });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, serializado);
      }
    } catch (err) {
      console.warn('No se pudo guardar automáticamente en localStorage:', err);
    }
  }

  cargarDesdeLocalStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (parsed.poleras && Array.isArray(parsed.poleras) && parsed.poleras.length > 0) {
          for (const p of parsed.poleras) {
            for (const s of Object.values(p.superficies || {})) {
              for (const c of (s.capas || [])) {
                if (c.tipo === 'imagen') {
                  c.imgElement = null;
                  c.originalFile = null;
                  if (c.dataUrl?.startsWith('blob:')) {
                    c.dataUrl = null;
                  }
                  if (c.dataUrl && typeof Image !== 'undefined') {
                    const img = new Image();
                    img.onload = () => {
                      c.imgElement = img;
                      this.cacheRecursos.set(c.id, {
                        imgElement: img,
                        originalFile: null,
                        dataUrl: c.dataUrl
                      });
                      this.notificar('capas-actualizadas');
                    };
                    img.src = c.dataUrl;
                  }
                }
              }
            }
          }
          this.datos.poleras = parsed.poleras;
          this.datos.poleraActivaIndex = Math.min(parsed.poleraActivaIndex || 0, parsed.poleras.length - 1);
        }
        if (parsed.unidades) this.datos.unidades = parsed.unidades;
        if (parsed.mostrarCuadricula !== undefined) this.datos.mostrarCuadricula = parsed.mostrarCuadricula;
        if (parsed.imanesGuias !== undefined) this.datos.imanesGuias = parsed.imanesGuias;
        if (parsed.mostrarCotas !== undefined) this.datos.mostrarCotas = parsed.mostrarCotas;
        if (parsed.fondoMesa) this.datos.fondoMesa = parsed.fondoMesa;
        if (parsed.tema) this.datos.tema = parsed.tema;
        if (parsed.clienteWhatsApp) this.datos.clienteWhatsApp = parsed.clienteWhatsApp;
        if (parsed.indicaciones) this.datos.indicaciones = parsed.indicaciones;
      }
    } catch (err) {
      console.warn('No se pudo restaurar estado desde localStorage:', err);
    }
  }

  reiniciarEstado() {
    this.datos.poleras = [crearPoleraInicial()];
    this.datos.poleraActivaIndex = 0;
    this.datos.superficieActiva = 'anverso';
    this.datos.capaSeleccionadaId = null;
    this.historial = [];
    this.indiceHistorial = -1;
    this.cacheRecursos.clear();
    this.guardarSnapshotHistorial('Estado inicial');
    this.guardarEnLocalStorage();
    this.notificar('reinicio-completo');
  }
}

export const estado = new EstadoApp();
