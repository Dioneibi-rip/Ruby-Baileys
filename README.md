# ✨ Baileys modificado para Ruby-Bot

<div align="center">
  <img src="https://i.pinimg.com/1200x/5f/4f/48/5f4f48a0e224a5830a5ba9e4afc177de.jpg" alt="Ruby-Baileys banner" width="100%"/>
  <br/>
  <h3>Una versión moderna, optimizada y lista para producción de Baileys para automatización avanzada de WhatsApp.</h3>
  <p>
    <img alt="Node" src="https://img.shields.io/badge/Node-%3E%3D20-339933?logo=node.js&logoColor=white">
    <img alt="License" src="https://img.shields.io/badge/License-MIT-blue">
    <img alt="Status" src="https://img.shields.io/badge/Status-Active-success">
    <img alt="Brand" src="https://img.shields.io/badge/Brand-Rubychan-ff4da6">
  </p>
</div>

---

## 🌸 ¿Qué es Ruby-Baileys?

**Ruby-Baileys** es una base robusta para bots y automatizaciones de WhatsApp Multi-Device, refinada para un flujo más limpio, mejor rendimiento y DX (experiencia de desarrollo) más cómoda.

Está pensada para:

- Bots de atención y soporte.
- Automatización de canales/newsletters.
- Sistemas de mensajería interactiva.
- Gestión avanzada de grupos y presencia.
- Integraciones con servicios externos.

---

## 🚀 Características principales

### 📨 Mensajería moderna
- Envío de texto, imagen, video, audio, documentos y stickers.
- Botones e interacciones (`buttons`, `interactive`).
- Encuestas y respuestas de encuesta.
- Ubicación, contactos y mensajes contextuales.

### 🖼️ Álbumes multimedia
- Envío tipo **álbum/carrusel** con múltiples imágenes/videos.
- Asociación correcta de cada media con el mensaje padre del álbum.
- Delay configurable para estabilidad en entrega masiva.

### 🧠 Estilo IA para mensajes
- Modo `aiStyle` para marcar mensajes con estilo IA.
- Integración con envío de metadatos AI en relay cuando corresponda.

### 🔁 Smart Retry para sub-bots
- Nuevo `retryConfig` en `sendMessage` para reintentos automáticos ante fallos transitorios.
- Backoff exponencial + jitter para evitar ráfagas y mejorar entrega.
- Presencia `composing/paused` opcional durante los intentos para UX más natural.
- Cola serial en cifrado de grupos (sender-key) para evitar carreras cuando varios sub-bots envían al mismo grupo al mismo tiempo.

### 📢 Control de canales/newsletters
- Crear newsletter.
- Actualizar nombre, descripción y foto.
- Seguir, dejar de seguir, silenciar/reactivar.
- Reaccionar mensajes del canal.
- Obtener metadatos y listados de participación.

### 🔐 Emparejamiento más seguro
- Sanitización del número telefónico para pairing.
- Validación de entradas inválidas.
- Soporte de código de emparejamiento personalizado alfanumérico.

### 🛡️ Fiabilidad de auth-state (Mongo)
- Reconstrucción correcta de claves de sincronización.
- Escrituras por lote (`bulkWrite`) para mejor performance.
- Fallback automático a `updateOne/deleteOne` cuando `bulkWrite` no existe.

---

## 🧩 Alias cómodos (DX mejorada)

Ruby-Baileys acepta alias para facilitar uso en español:

- `album` o `álbum` ➜ flujo de álbum.
- `encuesta` ➜ `poll`.
- `ubicacion` ➜ `location`.
- `aiStyle: true` ➜ marca texto como estilo IA.

---

## 📦 Instalación

```bash
npm install
```

> Requiere Node.js **>= 20**.

---

## ⚙️ Uso básico

```js
const { default: makeWASocket } = require('./lib')

const sock = makeWASocket({
  // tu config...
})
```

---

## 💬 Ejemplos rápidos

### 1) Botones interactivos

```js
const buttons = [
  { buttonId: 'btn_1', buttonText: { displayText: 'Haz clic en mí' }, type: 1 },
  { buttonId: 'btn_2', buttonText: { displayText: 'Visitar sitio' }, type: 1 }
]

await sock.sendMessage(jid, {
  text: 'Elige una opción:',
  footer: 'Con amor, Rubychan 💖',
  buttons,
  headerType: 1
})
```

### 2) Envío de álbum

```js
await sock.sendMessage(jid, {
  album: [
    { image: { url: 'https://example.com/pic1.jpg' } },
    { video: { url: 'https://example.com/clip.mp4' } }
  ],
  caption: 'Recuerdos ✨'
})
```

### 3) Encuesta (alias en español)

```js
await sock.sendMessage(jid, {
  encuesta: {
    nombre: '¿Color favorito?',
    valores: ['Rojo', 'Azul', 'Verde'],
    selectableCount: 1
  }
})
```

### 4) Ubicación (alias en español)

```js
await sock.sendMessage(jid, {
  ubicacion: {
    gradosLatitud: 37.422,
    gradosLongitud: -122.084,
    nombre: 'Googleplex',
    direccion: '1600 Amphitheatre Pkwy, Mountain View'
  }
})
```

### 5) Código de emparejamiento personalizado

```js
const code = await sock.requestPairingCode('628xxxxxxxxx', 'RUBY2026')
console.log('Pairing code:', code)
```

### 6) Newsletter / canal

```js
await sock.newsletterCreate('Ruby Updates', 'Novedades semanales')
await sock.newsletterUpdateDescription('canal@newsletter', 'Actualizaciones frescas ✨')
await sock.newsletterReactMessage('canal@newsletter', '175', '🔥')
```


### 7) Smart retry con backoff (ideal para sub-bots)

```js
await sock.sendMessage(jid, {
  text: 'Mensaje importante con tolerancia a fallos'
}, {
  retryConfig: {
    maxAttempts: 4,
    delayMs: 700,
    backoffMultiplier: 1.7,
    jitterMs: 250,
    presence: true
  }
})
```


---

## 🧠 Buenas prácticas

- Usa almacenamiento persistente para `authState` en producción.
- Activa logs estructurados para auditoría y debugging.
- Aísla reintentos de red y controla timeouts.
- Si envías multimedia intensiva, monitorea uso de CPU/RAM.

---

## 🛠️ Scripts útiles

```bash
npm test
npm run lint
```

---

## 🗺️ Roadmap sugerido

- [ ] Más utilidades para plantillas interactivas.
- [ ] Helpers de flujo para bots conversacionales.
- [ ] Mejoras de observabilidad (métricas y tracing).
- [ ] Documentación avanzada de despliegue.
