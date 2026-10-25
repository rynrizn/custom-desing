# Guía Maestra de Configuración en Cloudflare Pages
## ZAIREN CAD Textil v2 — Seguridad Cero-Conocimiento y Pedidos .zrn

Esta guía detalla la configuración exacta de las variables de entorno, secretos y enlaces KV necesarios para el funcionamiento de **ZAIREN CAD Textil v2** en **Cloudflare Pages**.

---

## 1. Los 3 Pilares de Seguridad (Conceptos Clave)

Para operar el sistema sin confusiones, es esencial distinguir estos tres elementos:

| Concepto | Dónde reside | Para qué sirve |
| :--- | :--- | :--- |
| **1. Contraseña de Administrador** (`ADMIN_PASSWORD`) | Cloudflare Pages (Secret) | Protege la pantalla de inicio de sesión `/acceso` y todas las rutas `/lector/*`. Permite ingresar al panel web. |
| **2. Frase Secreta del Taller** | **Solo en tu memoria** (nunca en servidores) | Se introduce al abrir `/lector` para desbloquear la clave privada en la memoria RAM del navegador. Si Cloudflare fuese vulnerado, nadie podría descifrar los pedidos sin esta frase. |
| **3. Claves Criptográficas** (`CLAVE_PUBLICA` y `PRIVATE_KEY_ENC`) | Cloudflare Pages (PlainText y Secret) | Par RSA-OAEP de 3072 bits. La pública cifra el pedido en el navegador del cliente; la privada cifrada permite al dueño descifrarlo en `/lector` tras ingresar la frase secreta. |

---

## 2. Las 5 Variables y Recursos en Cloudflare Pages

El sistema utiliza exactamente **5 elementos** configurables en el panel de Cloudflare Pages:

### Ficha 1: `ADMIN_PASSWORD`
- **Ubicación:** *Settings > Variables and Secrets*
- **Tipo:** **Secret** (Encriptada en Cloudflare)
- **Entorno:** Production y Preview
- **Valor:** Contraseña elegida por el dueño del taller (ejemplo: mínimo 14 caracteres con números y símbolos).
- **Propósito:** Validada en tiempo constante (*constant-time*) por `functions/api/login.js` para evitar ataques de temporización.

### Ficha 2: `SESSION_SECRET`
- **Ubicación:** *Settings > Variables and Secrets*
- **Tipo:** **Secret** (Encriptada en Cloudflare)
- **Entorno:** Production y Preview
- **Valor:** Cadena aleatoria de 64 caracteres hexadecimales (32 bytes de entropía).
- **Generación rápida en terminal:**
  ```bash
  node -e "console.log(crypto.randomBytes(32).toString('hex'))"
  ```
- **Propósito:** Llave criptográfica para la firma digital HMAC-SHA256 de las cookies `zairen_session` (duración: 8 horas).

### Ficha 3: `PRIVATE_KEY_ENC`
- **Ubicación:** *Settings > Variables and Secrets*
- **Tipo:** **Secret** (Encriptada en Cloudflare)
- **Entorno:** Production y Preview
- **Valor:** Cadena JSON generada en `/lector/configurar` con prefijo de versión `ZRNK1:`:
  ```text
  ZRNK1:{"salt":"...","iv":"...","ciphertext":"...","iterations":600000,"hash":"SHA-256"}
  ```
- **Propósito:** Clave privada RSA-3072 cifrada con PBKDF2 (600.000 iteraciones) + AES-GCM-256. Solo se entrega a través de `/api/clave` a sesiones activas.

### Ficha 4: `CLAVE_PUBLICA`
- **Ubicación:** *Settings > Variables and Secrets*
- **Tipo:** **Plain text** (Texto plano)
- **Entorno:** Production y Preview
- **Valor:** Clave pública RSA-3072 SPKI Base64 generada en `/lector/configurar` con prefijo de versión `ZRNP1:`:
  ```text
  ZRNP1:MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
  ```
- **Propósito:** Entregada por `functions/api/publica.js` a cualquier visitante para que su navegador pueda cifrar el archivo `.zrn` del pedido antes del envío.

### Ficha 5: `LOGIN_KV` (Opcional pero recomendado)
- **Ubicación:** *Settings > Functions > KV namespace bindings*
- **Tipo:** **KV namespace binding**
- **Nombre de la Variable:** `LOGIN_KV`
- **Namespace asociado:** Un namespace KV de Cloudflare (ej. `zairen-login-limits`).
- **Propósito:** Bloquea temporalmente por 15 minutos cualquier dirección IP que acumule 5 intentos fallidos consecutivos de login en `/acceso`. Si no está configurado, la API aplica un retardo defensivo de 450 ms por intento.

---

## 3. Paso a Paso: Configuración en el Dashboard de Cloudflare

### Paso 3.1: Acceder al Proyecto
1. Inicia sesión en [dash.cloudflare.com](https://dash.cloudflare.com/).
2. En la barra lateral izquierda, haz clic en **Workers & Pages**.
3. Selecciona tu proyecto (`customytee`).

### Paso 3.2: Añadir Variables de Entorno y Secretos
1. Ve a la pestaña **Settings** (Configuración) del proyecto.
2. En el menú secundario izquierdo, selecciona **Variables and Secrets**.
3. Haz clic en **Add variable** o **Edit variables** (para Production y Preview):
   - Haz clic en **Add variable**.
   - Nombre: `CLAVE_PUBLICA` | Tipo: **Text** | Valor: Pega tu clave con prefijo `ZRNP1:`.
   - Haz clic en **Add variable**.
   - Nombre: `ADMIN_PASSWORD` | Tipo: **Secret** (icono de candado) | Valor: Tu contraseña de administrador.
   - Haz clic en **Add variable**.
   - Nombre: `SESSION_SECRET` | Tipo: **Secret** | Valor: Tu cadena hexadecimal de 64 caracteres.
   - Haz clic en **Add variable**.
   - Nombre: `PRIVATE_KEY_ENC` | Tipo: **Secret** | Valor: Pega tu clave cifrada con prefijo `ZRNK1:`.
4. Haz clic en **Save** (Guardar).

### Paso 3.3: Configurar el Enlace KV (LOGIN_KV)
1. En la misma pestaña **Settings**, haz clic en **Functions** en el menú secundario izquierdo.
2. Desplázate hasta la sección **KV namespace bindings**.
3. Haz clic en **Add binding**:
   - Variable name: `LOGIN_KV`
   - KV namespace: Selecciona o crea un namespace (ej. `zairen-login-limits`).
4. Haz clic en **Save**.

---

## 4. ⚠️ OBLIGATORIO: Re-despliegue tras Guardar Variables

> [!IMPORTANT]
> En Cloudflare Pages, las variables de entorno y secretos **NO se aplican inmediatamente a despliegues pasados**.
> Cada vez que agregues o edites una variable o secreto, debes generar un nuevo despliegue:
> 1. Ve a la pestaña **Deployments** de tu proyecto en Cloudflare.
> 2. En el despliegue más reciente, haz clic en el menú de tres puntos (`...`) a la derecha.
> 3. Selecciona **Retry deployment** o haz un nuevo `git push` a la rama correspondiente.
> Sin este re-despliegue, las Pages Functions (`/api/*`) seguirán viendo las variables anteriores o valores vacíos.

---

## 5. Procedimiento para Generar o Renovar Claves

Si configuras el taller por primera vez o deseas renovar las claves:

1. Inicia sesión en `/acceso` con tu `ADMIN_PASSWORD`.
2. Dirígete a `/lector/configurar`.
3. Introduce tu **Frase Secreta** (el medidor exigirá al menos 16 caracteres o 5 palabras).
4. Haz clic en **GENERAR CLAVES CRIPTOGRÁFICAS**.
5. Copia `CLAVE_PUBLICA` (con prefijo `ZRNP1:`) y actualízala en Cloudflare Pages como variable de Texto.
6. Copia `PRIVATE_KEY_ENC` (con prefijo `ZRNK1:`) y actualízala en Cloudflare Pages como Secreto.
7. Haz clic en **DESCARGAR COPIA DE SEGURIDAD (.JSON)** para custodiar ambas claves en un pendrive o gestor de contraseñas offline.
8. En la misma pantalla, utiliza la **Caja de comprobación y verificación**:
   - Pega la clave pública, la clave privada y tu frase secreta.
   - Presiona **Verificar coincidencia de claves y frase**.
   - Confirma que obtengas el mensaje verde: *"✅ Claves válidas y coincidentes"*.
9. Haz el **Retry deployment** en Cloudflare Pages.
