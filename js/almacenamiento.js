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
            if (c.tipo === 'imagen') {
              let blob = null;
              if (c.originalFile instanceof Blob) {
                blob = c.originalFile;
              } else if (c.dataUrl && c.dataUrl.startsWith('data:')) {
                blob = this.dataUrlABlob(c.dataUrl);
              } else if (c.dataUrl && c.dataUrl.startsWith('blob:') && typeof fetch !== 'undefined') {
                try {
                  blob = await fetch(c.dataUrl).then(r => r.blob());
                } catch (_) {}
              }
              if (blob) {
                blobsAGuardar.push({
                  idCapa: c.id,
                  blob: blob,
                  mimeType: blob.type || 'image/png'
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
      const promesasCargaSesion = [];
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
                capa.originalFile = blob;
                capa.dataUrl = URL.createObjectURL(blob);
              }

              if (capa.dataUrl && typeof Image !== 'undefined') {
                const prom = new Promise(resolve => {
                  const imgEl = new Image();
                  imgEl.onload = () => {
                    capa.imgElement = imgEl;
                    if (estadoApp.cacheRecursos) {
                      estadoApp.cacheRecursos.set(capa.id, {
                        imgElement: imgEl,
                        originalFile: capa.originalFile,
                        dataUrl: capa.dataUrl
                      });
                    }
                    resolve();
                  };
                  imgEl.onerror = () => {
                    capa.imgElement = null;
                    resolve();
                  };
                  imgEl.src = capa.dataUrl;
                });
                promesasCargaSesion.push(prom);
              } else {
                capa.imgElement = null;
              }
            }
          }
        }
      }
      await Promise.all(promesasCargaSesion);

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
  /**
   * Guarda el proyecto completo en formato .zrp (ZIP sin cifrar con JSZip).
   * Contiene proyecto.json y carpeta imagenes/ con los artes originales.
   * Funciona tanto con imágenes como con diseños de solo texto.
   */
  async guardarProyectoZRP(estadoApp, codigoPedidoParam = null, descargar = true) {
    const ZipClass = (typeof JSZip !== 'undefined' ? JSZip : (typeof window !== 'undefined' ? window.JSZip : null));
    if (!ZipClass) {
      throw new Error('La librería JSZip no está disponible.');
    }
    const zip = new ZipClass();
    const codigo = codigoPedidoParam || this.generarCodigoPedido();
    const fecha = new Date();

    const imagenesFolder = zip.folder('imagenes');
    const polerasSerializadas = [];

    for (let pIdx = 0; pIdx < estadoApp.datos.poleras.length; pIdx++) {
      const p = estadoApp.datos.poleras[pIdx];
      const poleraObj = {
        id: p.id || `polera-${pIdx + 1}`,
        nombre: p.nombre || `Polera ${pIdx + 1}`,
        color: p.color || '#FAF9F6',
        tallaVista: p.tallaVista || 'M',
        cantidades: p.cantidades || [{ talla: p.tallaVista || 'M', cantidad: 1 }],
        opciones: {
          envolvente: !!p.envolvente,
          mangasEspejo: !!p.mangasEspejo,
          mangasVoltear: p.mangasVoltear !== false
        },
        superficies: {}
      };

      const superficiesKeys = ['anverso', 'reverso', 'manga_izquierda', 'manga_derecha'];

      for (const supKey of superficiesKeys) {
        const supOriginal = p.superficies?.[supKey] || { capas: [] };
        const capasSerializadas = [];

        for (const capa of (supOriginal.capas || [])) {
          if (capa.tipo === 'texto') {
            capasSerializadas.push({
              id: capa.id,
              tipo: 'texto',
              nombre: capa.nombre || 'Texto',
              texto: capa.texto,
              fuente: capa.fuente || 'Poppins',
              tamanoPt: capa.tamanoPt || 28,
              color: capa.color || '#0A0A0A',
              bold: !!capa.bold,
              italic: !!capa.italic,
              align: capa.align || 'center',
              lineHeight: capa.lineHeight || 1.25,
              strokeWidth: capa.strokeWidth || 0,
              strokeColor: capa.strokeColor || '#000000',
              shadowBlur: capa.shadowBlur || 0,
              shadowColor: capa.shadowColor || 'transparent',
              shadowOffsetX: capa.shadowOffsetX || 0,
              shadowOffsetY: capa.shadowOffsetY || 0,
              xCm: capa.xCm || 0,
              yCm: capa.yCm || 0,
              widthCm: capa.widthCm || 10,
              heightCm: capa.heightCm || 4,
              scaleX: capa.scaleX || 1.0,
              scaleY: capa.scaleY || 1.0,
              angleDeg: capa.angleDeg || 0,
              opacity: capa.opacity != null ? capa.opacity : 1.0,
              flipH: !!capa.flipH,
              flipV: !!capa.flipV,
              locked: !!capa.locked,
              visible: capa.visible !== false
            });
          } else if (capa.tipo === 'imagen') {
            let imgBlob = null;
            if (capa.originalFile instanceof Blob) {
              imgBlob = capa.originalFile;
            } else if (capa.dataUrl && capa.dataUrl.startsWith('data:')) {
              imgBlob = this.dataUrlABlob(capa.dataUrl);
            } else if (capa.dataUrl && capa.dataUrl.startsWith('blob:') && typeof fetch !== 'undefined') {
              try {
                imgBlob = await fetch(capa.dataUrl).then(r => r.blob());
              } catch (_) {}
            }

            // Fallback mediante canvas offscreen si no se obtuvo blob directamente
            if (!imgBlob && capa.imgElement && typeof document !== 'undefined') {
              try {
                const cTemp = document.createElement('canvas');
                cTemp.width = capa.imgElement.naturalWidth || capa.anchoOriginalPx || 400;
                cTemp.height = capa.imgElement.naturalHeight || capa.altoOriginalPx || 400;
                const ctxTemp = cTemp.getContext('2d');
                ctxTemp.drawImage(capa.imgElement, 0, 0);
                imgBlob = await new Promise(res => cTemp.toBlob(res, 'image/png'));
              } catch (_) {}
            }

            const ext = (capa.fileExt || 'png').replace(/^\./, '').toLowerCase();
            const nombreArchivo = `img_${capa.id}.${ext}`;
            const rutaEnZip = `imagenes/${nombreArchivo}`;

            if (imgBlob && imagenesFolder) {
              const dataParaZip = typeof imgBlob.arrayBuffer === 'function' ? await imgBlob.arrayBuffer() : imgBlob;
              imagenesFolder.file(nombreArchivo, dataParaZip);
            }

            capasSerializadas.push({
              id: capa.id,
              tipo: 'imagen',
              nombre: capa.nombre || 'Imagen',
              archivo: rutaEnZip,
              fileExt: ext,
              widthCm: capa.widthCm,
              heightCm: capa.heightCm,
              anchoOriginalPx: capa.anchoOriginalPx,
              altoOriginalPx: capa.altoOriginalPx,
              xCm: capa.xCm || 0,
              yCm: capa.yCm || 0,
              scaleX: capa.scaleX || 1.0,
              scaleY: capa.scaleY || 1.0,
              angleDeg: capa.angleDeg || 0,
              opacity: capa.opacity != null ? capa.opacity : 1.0,
              flipH: !!capa.flipH,
              flipV: !!capa.flipV,
              locked: !!capa.locked,
              visible: capa.visible !== false
            });
          }
        }

        poleraObj.superficies[supKey] = { capas: capasSerializadas };
      }

      polerasSerializadas.push(poleraObj);
    }

    const proyectoJSON = {
      formato: 'zrp',
      version: 1,
      app: 'CustomyTee',
      fecha: fecha.toISOString(),
      codigoPedido: codigo,
      whatsapp: estadoApp.datos.clienteWhatsApp || '',
      indicaciones: estadoApp.datos.indicaciones || '',
      configuracion: {
        unidades: estadoApp.datos.unidades || 'cm',
        tema: estadoApp.datos.tema || 'dark'
      },
      poleras: polerasSerializadas
    };

    zip.file('proyecto.json', JSON.stringify(proyectoJSON, null, 2));

    const uint8Zip = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    const blobZip = new Blob([uint8Zip], { type: 'application/zip' });

    if (descargar && typeof document !== 'undefined') {
      const url = URL.createObjectURL(blobZip);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proyecto-${codigo}.zrp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    return { blob: blobZip, codigo, proyectoJSON };
  }

  /**
   * Abre e importa un archivo de proyecto (.zrp o .json antiguo).
   * Valida límites de seguridad (60 MB total, 25 MB/imagen, máx 50 capas).
   * Rechaza archivos .zrn con mensaje explicativo para el cliente.
   */
  async abrirProyecto(archivo, estadoApp, ui = null, modoImportacion = 'preguntar') {
    if (!archivo) return false;

    // 1. Límite de tamaño total: 60 MB
    const LIMITE_TOTAL_BYTES = 60 * 1024 * 1024;
    if (archivo.size > LIMITE_TOTAL_BYTES) {
      const err = new Error('El archivo supera el límite máximo permitido de 60 MB.');
      err.codigo = 'LIMITE_TAMANO_EXCEDIDO';
      if (ui) ui.mostrarNotificacion(err.message, 'error');
      throw err;
    }

    // 2. Rechazo explícito de archivos .zrn cifrados para el taller
    const nombreLower = (archivo.name || '').toLowerCase();
    if (nombreLower.endsWith('.zrn')) {
      const err = new Error('Este archivo (.zrn) es un paquete cifrado exclusivo para el taller ZAIRENLAB. Para continuar editando tu diseño en CustomyTee, por favor abre tu archivo de proyecto (.zrp).');
      err.codigo = 'ZRN_RECHAZADO';
      if (ui && typeof ui.mostrarModalAvisoZrn === 'function') {
        ui.mostrarModalAvisoZrn();
      } else if (ui) {
        ui.mostrarNotificacion(err.message, 'error');
      }
      throw err;
    }

    // 3. Inspección de cabecera de archivo para detectar ZIP vs JSON
    let esZip = false;
    let esJson = false;

    try {
      const cabeceraBuffer = await archivo.slice(0, 4).arrayBuffer();
      const bytes = new Uint8Array(cabeceraBuffer);
      if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
        esZip = true;
      } else {
        const inicioTexto = await archivo.slice(0, 30).text();
        if (inicioTexto.trim().startsWith('{')) {
          esJson = true;
        } else if (inicioTexto.startsWith('ZRN') || inicioTexto.includes('ZRN')) {
          const err = new Error('Este archivo (.zrn) es un paquete cifrado exclusivo para el taller ZAIRENLAB. Para continuar editando tu diseño en CustomyTee, por favor abre tu archivo de proyecto (.zrp).');
          err.codigo = 'ZRN_RECHAZADO';
          if (ui && typeof ui.mostrarModalAvisoZrn === 'function') {
            ui.mostrarModalAvisoZrn();
          } else if (ui) {
            ui.mostrarNotificacion(err.message, 'error');
          }
          throw err;
        }
      }
    } catch (e) {
      if (e.codigo === 'ZRN_RECHAZADO') throw e;
    }

    if (esZip || nombreLower.endsWith('.zrp')) {
      return this.procesarZipZRP(archivo, estadoApp, ui, modoImportacion);
    } else if (esJson || nombreLower.endsWith('.json')) {
      return this.procesarJsonAntiguo(archivo, estadoApp, ui, modoImportacion);
    } else {
      const err = new Error('Formato de archivo no reconocido. Sube un archivo .zrp o .json válido.');
      if (ui) ui.mostrarNotificacion(err.message, 'error');
      throw err;
    }
  }

  /**
   * Descomprime y restaura un proyecto en formato .zrp.
   */
  async procesarZipZRP(archivo, estadoApp, ui, modoImportacion) {
    const ZipClass = (typeof JSZip !== 'undefined' ? JSZip : (typeof window !== 'undefined' ? window.JSZip : null));
    if (!ZipClass) {
      throw new Error('La librería JSZip no está disponible.');
    }

    let zip;
    try {
      const buffer = typeof archivo.arrayBuffer === 'function' ? await archivo.arrayBuffer() : archivo;
      zip = await ZipClass.loadAsync(buffer);
    } catch (e) {
      const err = new Error('El archivo .zrp está dañado o no es un ZIP válido.');
      err.codigo = 'ARCHIVO_CORRUPTO';
      if (ui) ui.mostrarNotificacion(err.message, 'error');
      throw err;
    }

    const archivoJSON = zip.file('proyecto.json');
    if (!archivoJSON) {
      const err = new Error('El archivo .zrp no contiene un proyecto.json válido.');
      err.codigo = 'PROYECTO_JSON_FALTANTE';
      if (ui) ui.mostrarNotificacion(err.message, 'error');
      throw err;
    }

    let parsed;
    try {
      const texto = await archivoJSON.async('text');
      parsed = JSON.parse(texto);
    } catch (e) {
      const err = new Error('El archivo proyecto.json contiene errores de sintaxis.');
      err.codigo = 'JSON_CORRUPTO';
      throw err;
    }

    if (parsed.formato !== 'zrp') {
      const err = new Error('El archivo no tiene el formato de proyecto zrp esperado.');
      err.codigo = 'FORMATO_DESCONOCIDO';
      throw err;
    }

    if (parsed.version > 1) {
      const err = new Error(`El archivo fue creado con la versión ${parsed.version} de CustomyTee, más reciente que la actual (1).`);
      err.codigo = 'VERSION_DESCONOCIDA';
      if (ui) ui.mostrarNotificacion(err.message, 'error');
      throw err;
    }

    if (!Array.isArray(parsed.poleras) || parsed.poleras.length === 0) {
      throw new Error('El proyecto no contiene prendas válidas.');
    }

    // Contar total de capas (límite: 50)
    let totalCapas = 0;
    for (const p of parsed.poleras) {
      for (const sup of Object.values(p.superficies || {})) {
        totalCapas += (sup.capas || []).length;
      }
    }
    if (totalCapas > 50) {
      const err = new Error(`El proyecto contiene ${totalCapas} capas, superando el límite máximo de 50.`);
      err.codigo = 'LIMITE_CAPAS_EXCEDIDO';
      if (ui) ui.mostrarNotificacion(err.message, 'error');
      throw err;
    }

    // Carga segura de imágenes
    const LIMITE_IMAGEN_BYTES = 25 * 1024 * 1024;
    const promesasCargaZRP = [];

    for (const p of parsed.poleras) {
      for (const sup of Object.values(p.superficies || {})) {
        for (const capa of (sup.capas || [])) {
          if (capa.tipo === 'imagen' && capa.archivo) {
            const rutaLimpia = capa.archivo.replace(/\\/g, '/');
            if (rutaLimpia.includes('..') || rutaLimpia.startsWith('/') || !rutaLimpia.startsWith('imagenes/')) {
              console.warn(`Ruta omitida por seguridad: ${capa.archivo}`);
              continue;
            }

            const imgEntry = zip.file(rutaLimpia);
            if (!imgEntry) continue;

            const imgBuffer = await imgEntry.async('arraybuffer');
            if (imgBuffer.byteLength > LIMITE_IMAGEN_BYTES) {
              const err = new Error(`La imagen "${capa.nombre || rutaLimpia}" supera el límite de 25 MB.`);
              err.codigo = 'IMAGEN_DEMASIADO_GRANDE';
              if (ui) ui.mostrarNotificacion(err.message, 'error');
              throw err;
            }

            let mime = 'image/png';
            if (capa.fileExt === 'svg' || rutaLimpia.endsWith('.svg')) {
              mime = 'image/svg+xml';
            } else if (capa.fileExt === 'jpg' || capa.fileExt === 'jpeg' || rutaLimpia.match(/\.jpe?g$/i)) {
              mime = 'image/jpeg';
            } else if (capa.fileExt === 'webp' || rutaLimpia.endsWith('.webp')) {
              mime = 'image/webp';
            }

            // SEGURIDAD: Tratar imágenes SVG exclusivamente como Blob ObjectURL, jamás HTML inyectado
            if (typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
              const blob = new Blob([imgBuffer], { type: mime });
              const objectUrl = URL.createObjectURL(blob);
              capa.dataUrl = objectUrl;
              capa.originalFile = blob;

              if (typeof Image !== 'undefined') {
                const prom = new Promise(resolve => {
                  const imgEl = new Image();
                  imgEl.onload = () => {
                    capa.imgElement = imgEl;
                    if (estadoApp.cacheRecursos) {
                      estadoApp.cacheRecursos.set(capa.id, {
                        imgElement: imgEl,
                        originalFile: blob,
                        dataUrl: objectUrl
                      });
                    }
                    resolve();
                  };
                  imgEl.onerror = () => {
                    capa.imgElement = null;
                    resolve();
                  };
                  imgEl.src = objectUrl;
                });
                promesasCargaZRP.push(prom);
              }
            }
          }
        }
      }
    }
    await Promise.all(promesasCargaZRP);

    const tieneTrabajoActual = estadoApp.datos.poleras.some(p => {
      return Object.values(p.superficies || {}).some(s => s.capas?.length > 0);
    });

    let decision = modoImportacion;
    if (tieneTrabajoActual && decision === 'preguntar' && ui && typeof ui.solicitarOpcionImportacion === 'function') {
      decision = await ui.solicitarOpcionImportacion(parsed.poleras.length);
      if (!decision) return false;
    } else if (decision === 'preguntar') {
      decision = 'reemplazar';
    }

    this.bloquearAutoguardado = true;

    if (decision === 'anadir') {
      estadoApp.guardarSnapshotHistorial('Añadir proyecto .zrp');
      const idx = estadoApp.datos.poleras.length;
      estadoApp.datos.poleras.push(...parsed.poleras);
      estadoApp.datos.poleraActivaIndex = idx;
    } else {
      estadoApp.guardarSnapshotHistorial('Reemplazar por proyecto .zrp');
      estadoApp.datos.poleras = parsed.poleras;
      estadoApp.datos.poleraActivaIndex = 0;
      if (parsed.whatsapp) estadoApp.datos.clienteWhatsApp = parsed.whatsapp;
      if (parsed.indicaciones) estadoApp.datos.indicaciones = parsed.indicaciones;
    }

    this.bloquearAutoguardado = false;
    estadoApp.notificar('proyecto-cargado');

    if (ui) {
      ui.actualizarSelectPoleras?.();
      ui.actualizarListaCapas?.();
      ui.actualizarHUDMedidas?.();
      ui.mesa?.ajustarAPantalla?.();
      ui.app?.solicitarRender?.();
      ui.mostrarNotificacion(`Proyecto cargado exitosamente (${parsed.codigoPedido || 'ZRP'}).`);
    }
    return true;
  }

  /**
   * Carga un archivo .json de proyecto antiguo y lo restaura.
   */
  async procesarJsonAntiguo(archivo, estadoApp, ui, modoImportacion) {
    const texto = await archivo.text();
    const parsed = JSON.parse(texto);

    let poleras = [];
    if (parsed.tipo === 'zairen_proyecto_cad' && parsed.datos?.poleras) {
      poleras = parsed.datos.poleras;
    } else if (Array.isArray(parsed.poleras)) {
      poleras = parsed.poleras;
    } else {
      throw new Error('El archivo no contiene un formato de proyecto JSON válido.');
    }

    for (const p of poleras) {
      for (const sup of Object.values(p.superficies || {})) {
        for (const capa of (sup.capas || [])) {
          if (capa.tipo === 'imagen' && capa.dataUrl && typeof Image !== 'undefined') {
            const img = new Image();
            img.src = capa.dataUrl;
            capa.imgElement = img;
          }
        }
      }
    }

    const tieneTrabajoActual = estadoApp.datos.poleras.some(p => {
      return Object.values(p.superficies || {}).some(s => s.capas?.length > 0);
    });

    let decision = modoImportacion;
    if (tieneTrabajoActual && decision === 'preguntar' && ui && typeof ui.solicitarOpcionImportacion === 'function') {
      decision = await ui.solicitarOpcionImportacion(poleras.length);
      if (!decision) return false;
    } else if (decision === 'preguntar') {
      decision = 'reemplazar';
    }

    this.bloquearAutoguardado = true;
    if (decision === 'anadir') {
      estadoApp.guardarSnapshotHistorial('Añadir proyecto .json');
      const idx = estadoApp.datos.poleras.length;
      estadoApp.datos.poleras.push(...poleras);
      estadoApp.datos.poleraActivaIndex = idx;
    } else {
      estadoApp.guardarSnapshotHistorial('Reemplazar por proyecto .json');
      estadoApp.datos.poleras = poleras;
      estadoApp.datos.poleraActivaIndex = 0;
      if (parsed.datos?.clienteWhatsApp) estadoApp.datos.clienteWhatsApp = parsed.datos.clienteWhatsApp;
      if (parsed.datos?.indicaciones) estadoApp.datos.indicaciones = parsed.datos.indicaciones;
    }

    this.bloquearAutoguardado = false;
    estadoApp.notificar('proyecto-cargado');

    if (ui) {
      ui.mostrarNotificacion('Proyecto .json cargado exitosamente.');
    }
    return true;
  }

  /**
   * Carga un proyecto transferido desde el Lector de Taller (/lector) vía localStorage.
   */
  cargarProyectoImportadoTaller(estadoApp, ui = null) {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem('customytee_taller_proyecto');
    if (!raw) return false;
    try {
      localStorage.removeItem('customytee_taller_proyecto');
      const item = JSON.parse(raw);
      if (!item.proyectoJSON) return false;
      const parsed = typeof item.proyectoJSON === 'string' ? JSON.parse(item.proyectoJSON) : item.proyectoJSON;
      return this.procesarJsonAntiguo(new Blob([JSON.stringify(parsed)], { type: 'application/json' }), estadoApp, ui, 'reemplazar');
    } catch (e) {
      console.warn('Error al cargar proyecto desde taller:', e);
      return false;
    }
  }


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
