/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Motor de Almacenamiento, Autoguardado y Proyecto
 * ============================================================================
 * - Autoguardado con debounce de 800 ms en IndexedDB nativo (imágenes como Blob).
 * - Detección de sesión previa: diálogo "Continuar donde lo dejaste" o "Empezar de cero".
 * - Gestión de QuotaExceededError y modo privado con avisos claros en español.
 * - Guardar y Abrir proyecto en formato .json sin cifrar.
 * - Generador de Código de Pedido Único en formato ZRN-AAAAMMDD-XXXX.
 */

const DB_NAME = 'zairen_cad_textil_db';
const DB_VERSION = 1;
const STORE_SESION = 'sesion';
const STORE_IMAGENES = 'imagenes';
const CLAVE_ESTADO = 'estado_actual';

export class GestorAlmacenamiento {
  constructor() {
    this.db = null;
    this.timerAutoguardado = null;
    this.debounceMs = 800;
    this.bloquearAutoguardado = false;
  }

  /**
   * Genera un código de pedido único formal: ZRN-AAAAMMDD-XXXX
   * Donde XXXX son 4 caracteres alfanuméricos en mayúsculas sin ambigüedad visual.
   */
  generarCodigoPedido(fecha = new Date()) {
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let aleatorio = '';
    for (let i = 0; i < 4; i++) {
      aleatorio += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `ZRN-${yyyy}${mm}${dd}-${aleatorio}`;
  }

  /**
   * Abre o inicializa la base de datos IndexedDB.
   */
  async abrirDB() {
    if (this.db) return this.db;
    if (typeof window === 'undefined' || !window.indexedDB) {
      throw new Error('IndexedDB no está disponible en este entorno.');
    }

    return new Promise((resolve, reject) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_SESION)) {
            db.createObjectStore(STORE_SESION, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_IMAGENES)) {
            db.createObjectStore(STORE_IMAGENES, { keyPath: 'idCapa' });
          }
        };

        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve(this.db);
        };

        req.onerror = (e) => {
          reject(e.target.error || new Error('Error al abrir IndexedDB'));
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Programa el autoguardado del estado con debounce de 800 ms.
   */
  programarAutoguardado(estadoApp, ui = null) {
    if (this.bloquearAutoguardado) return;
    clearTimeout(this.timerAutoguardado);
    this.timerAutoguardado = setTimeout(() => {
      this.guardarSesion(estadoApp, ui).catch(err => {
        console.warn('Autoguardado en IndexedDB omitido o fallido:', err);
      });
    }, this.debounceMs);
  }

  /**
   * Guarda el estado completo en IndexedDB, extrayendo las imágenes como Blobs nativos.
   */
  async guardarSesion(estadoApp, ui = null) {
    if (this.bloquearAutoguardado) return;
    try {
      const db = await this.abrirDB();
      const polerasClonadas = [];
      const blobsAGuardar = [];

      for (const polera of estadoApp.datos.poleras) {
        const poleraClon = {
          ...polera,
          superficies: {}
        };

        for (const [supKey, supData] of Object.entries(polera.superficies)) {
          const capasClonadas = [];
          for (const c of (supData.capas || [])) {
            if (c.tipo === 'imagen' && c.dataUrl) {
              // Convertir dataUrl a Blob para almacenamiento eficiente
              const blob = this.dataUrlABlob(c.dataUrl);
              if (blob) {
                blobsAGuardar.push({
                  idCapa: c.id,
                  blob: blob,
                  mimeType: blob.type
                });
              }
              // Clonar capa sin elementos DOM
              const { imgElement, originalFile, ...resto } = c;
              capasClonadas.push(resto);
            } else {
              const { imgElement, originalFile, ...resto } = c;
              capasClonadas.push(resto);
            }
          }
          poleraClon.superficies[supKey] = { capas: capasClonadas };
        }
        polerasClonadas.push(poleraClon);
      }

      const registroSesion = {
        id: CLAVE_ESTADO,
        fecha: Date.now(),
        poleras: polerasClonadas,
        poleraActivaIndex: estadoApp.datos.poleraActivaIndex,
        superficieActiva: estadoApp.datos.superficieActiva,
        unidades: estadoApp.datos.unidades,
        mostrarCuadricula: estadoApp.datos.mostrarCuadricula,
        imanesGuias: estadoApp.datos.imanesGuias,
        mostrarCotas: estadoApp.datos.mostrarCotas,
        fondoMesa: estadoApp.datos.fondoMesa,
        tema: estadoApp.datos.tema,
        clienteWhatsApp: estadoApp.datos.clienteWhatsApp,
        indicaciones: estadoApp.datos.indicaciones
      };

      const tx = db.transaction([STORE_SESION, STORE_IMAGENES], 'readwrite');
      const storeSesion = tx.objectStore(STORE_SESION);
      const storeImagenes = tx.objectStore(STORE_IMAGENES);

      storeSesion.put(registroSesion);
      for (const b of blobsAGuardar) {
        storeImagenes.put(b);
      }

      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
        tx.onabort = (e) => reject(e.target.error);
      });
    } catch (err) {
      if (err.name === 'QuotaExceededError') {
        if (ui) {
          ui.mostrarNotificacion('Almacenamiento del navegador lleno. Descarga tu proyecto con "Guardar proyecto" para asegurar tus avances.', 'warning');
        }
      } else if (err.name === 'SecurityError' || err.message?.includes('IndexedDB')) {
        console.warn('IndexedDB bloqueado en modo navegación privada o restringido:', err);
      }
    }
  }

  /**
   * Comprueba si existe una sesión previa guardada con contenido personalizado.
   */
  async comprobarSesionPrevia() {
    try {
      const db = await this.abrirDB();
      const tx = db.transaction(STORE_SESION, 'readonly');
      const store = tx.objectStore(STORE_SESION);
      const req = store.get(CLAVE_ESTADO);

      return new Promise((resolve) => {
        req.onsuccess = () => {
          const res = req.result;
          if (!res || !res.poleras || !res.poleras.length) {
            resolve(false);
            return;
          }
          // Verificar si tiene al menos un diseño o modificación
          let tieneContenido = false;
          for (const p of res.poleras) {
            for (const s of Object.values(p.superficies || {})) {
              if (s.capas && s.capas.length > 0) {
                tieneContenido = true;
                break;
              }
            }
          }
          resolve(tieneContenido);
        };
        req.onerror = () => resolve(false);
      });
    } catch (err) {
      return false;
    }
  }

  /**
   * Restaura la sesión guardada desde IndexedDB, reconstruyendo los elementos Image DOM.
   */
  async restaurarSesion(estadoApp) {
    try {
      const db = await this.abrirDB();
      const tx = db.transaction([STORE_SESION, STORE_IMAGENES], 'readonly');
      const storeSesion = tx.objectStore(STORE_SESION);
      const storeImagenes = tx.objectStore(STORE_IMAGENES);

      const sesionData = await new Promise((resolve, reject) => {
        const req = storeSesion.get(CLAVE_ESTADO);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
      });

      if (!sesionData || !sesionData.poleras) return false;

      // Reconstruir imágenes a partir de Blobs o dataUrls
      for (const polera of sesionData.poleras) {
        for (const sup of Object.values(polera.superficies || {})) {
          for (const capa of (sup.capas || [])) {
            if (capa.tipo === 'imagen') {
              let blob = null;
              try {
                blob = await new Promise((resolve) => {
                  const reqImg = storeImagenes.get(capa.id);
                  reqImg.onsuccess = () => resolve(reqImg.result?.blob || null);
                  reqImg.onerror = () => resolve(null);
                });
              } catch (_) {}

              if (blob) {
                capa.dataUrl = URL.createObjectURL(blob);
              }

              if (capa.dataUrl && typeof Image !== 'undefined') {
                const imgEl = new Image();
                imgEl.src = capa.dataUrl;
                capa.imgElement = imgEl;
              }
            }
          }
        }
      }

      // Aplicar al estado reactivo
      this.bloquearAutoguardado = true;
      estadoApp.datos.poleras = sesionData.poleras;
      estadoApp.datos.poleraActivaIndex = sesionData.poleraActivaIndex || 0;
      if (sesionData.superficieActiva) estadoApp.datos.superficieActiva = sesionData.superficieActiva;
      if (sesionData.unidades) estadoApp.datos.unidades = sesionData.unidades;
      if (sesionData.mostrarCuadricula !== undefined) estadoApp.datos.mostrarCuadricula = sesionData.mostrarCuadricula;
      if (sesionData.imanesGuias !== undefined) estadoApp.datos.imanesGuias = sesionData.imanesGuias;
      if (sesionData.mostrarCotas !== undefined) estadoApp.datos.mostrarCotas = sesionData.mostrarCotas;
      if (sesionData.fondoMesa) estadoApp.datos.fondoMesa = sesionData.fondoMesa;
      if (sesionData.tema) estadoApp.datos.tema = sesionData.tema;
      if (sesionData.clienteWhatsApp) estadoApp.datos.clienteWhatsApp = sesionData.clienteWhatsApp;
      if (sesionData.indicaciones) estadoApp.datos.indicaciones = sesionData.indicaciones;

      this.bloquearAutoguardado = false;
      estadoApp.notificar('sesion-restaurada');
      return true;
    } catch (err) {
      console.warn('Error al restaurar sesión desde IndexedDB:', err);
      this.bloquearAutoguardado = false;
      return false;
    }
  }

  /**
   * Limpia la sesión de autoguardado en IndexedDB para "Empezar de cero".
   */
  async limpiarSesion() {
    try {
      const db = await this.abrirDB();
      const tx = db.transaction([STORE_SESION, STORE_IMAGENES], 'readwrite');
      tx.objectStore(STORE_SESION).clear();
      tx.objectStore(STORE_IMAGENES).clear();
      await new Promise(resolve => { tx.oncomplete = resolve; });
    } catch (err) {
      console.warn('Error al limpiar sesión de IndexedDB:', err);
    }
  }

  /**
   * Exporta el proyecto completo en archivo .json sin cifrar descargable.
   */
  guardarProyectoJSON(estadoApp) {
    const fecha = new Date();
    const codigo = this.generarCodigoPedido(fecha);
    const proyecto = {
      tipo: 'zairen_proyecto_cad',
      version: '2.0',
      codigoReferencia: codigo,
      exportadoEn: fecha.toISOString(),
      datos: {
        poleras: estadoApp.datos.poleras.map(p => {
          const clonP = { ...p, superficies: {} };
          for (const [sKey, sVal] of Object.entries(p.superficies)) {
            clonP.superficies[sKey] = {
              capas: (sVal.capas || []).map(c => {
                const { imgElement, originalFile, ...resto } = c;
                return resto;
              })
            };
          }
          return clonP;
        }),
        poleraActivaIndex: estadoApp.datos.poleraActivaIndex,
        unidades: estadoApp.datos.unidades,
        mostrarCuadricula: estadoApp.datos.mostrarCuadricula,
        imanesGuias: estadoApp.datos.imanesGuias,
        mostrarCotas: estadoApp.datos.mostrarCotas,
        fondoMesa: estadoApp.datos.fondoMesa,
        tema: estadoApp.datos.tema,
        clienteWhatsApp: estadoApp.datos.clienteWhatsApp,
        indicaciones: estadoApp.datos.indicaciones
      }
    };

    const blob = new Blob([JSON.stringify(proyecto, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proyecto-${codigo}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /**
   * Carga un archivo .json de proyecto y lo restaura en el estado reactivo.
   */
  async abrirProyectoJSON(archivo, estadoApp, ui = null) {
    if (!archivo) return false;
    try {
      const texto = await archivo.text();
      const parsed = JSON.parse(texto);

      if (parsed.tipo !== 'zairen_proyecto_cad' || !parsed.datos || !Array.isArray(parsed.datos.poleras)) {
        throw new Error('El archivo no tiene el formato de proyecto válido de ZAIREN CAD.');
      }

      this.bloquearAutoguardado = true;
      const datos = parsed.datos;

      // Reconstruir elementos Image DOM
      for (const polera of datos.poleras) {
        for (const sup of Object.values(polera.superficies || {})) {
          for (const capa of (sup.capas || [])) {
            if (capa.tipo === 'imagen' && capa.dataUrl && typeof Image !== 'undefined') {
              const img = new Image();
              img.src = capa.dataUrl;
              capa.imgElement = img;
            }
          }
        }
      }

      estadoApp.datos.poleras = datos.poleras;
      estadoApp.datos.poleraActivaIndex = Math.min(datos.poleraActivaIndex || 0, datos.poleras.length - 1);
      if (datos.unidades) estadoApp.datos.unidades = datos.unidades;
      if (datos.mostrarCuadricula !== undefined) estadoApp.datos.mostrarCuadricula = datos.mostrarCuadricula;
      if (datos.imanesGuias !== undefined) estadoApp.datos.imanesGuias = datos.imanesGuias;
      if (datos.mostrarCotas !== undefined) estadoApp.datos.mostrarCotas = datos.mostrarCotas;
      if (datos.fondoMesa) estadoApp.datos.fondoMesa = datos.fondoMesa;
      if (datos.tema) estadoApp.datos.tema = datos.tema;
      if (datos.clienteWhatsApp) estadoApp.datos.clienteWhatsApp = datos.clienteWhatsApp;
      if (datos.indicaciones) estadoApp.datos.indicaciones = datos.indicaciones;

      this.bloquearAutoguardado = false;
      estadoApp.guardarSnapshotHistorial('Abrir proyecto');
      estadoApp.notificar('proyecto-cargado');

      if (ui) {
        ui.mostrarNotificacion(`Proyecto cargado exitosamente (${parsed.codigoReferencia || 'V2'}).`);
      }
      return true;
    } catch (err) {
      this.bloquearAutoguardado = false;
      if (ui) {
        ui.mostrarNotificacion(`Error al abrir proyecto: ${err.message}`, 'error');
      }
      throw err;
    }
  }

  /**
   * Helper utilitario: convierte una Data URL Base64 a un objeto Blob nativo.
   */
  dataUrlABlob(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
    try {
      const partes = dataUrl.split(',');
      const mime = partes[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(partes[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      return null;
    }
  }
}

export const gestorAlmacenamiento = new GestorAlmacenamiento();
