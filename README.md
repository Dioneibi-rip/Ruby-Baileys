<div align="center">

<img src="https://i.pinimg.com/736x/3a/f1/e0/3af1e0da373b4efe2a5729f8c4a139b9.jpg" alt="Ruby Header" width="100%" style="border-radius: 10px;"/>

<br><br>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Oswald&weight=600&pause=1000&color=FF7B93&center=true&vCenter=true&width=520&lines=✦+Ruby+Baileys+✦;WhatsApp+WebSocket+API+con+estilo;QR+%26+código+de+8+dígitos;Conexión+persistente+24%2F7+🍒)](https://git.io/typing-svg)

<br>

<p>
  <a href="https://github.com/Dioneibi-rip/Ruby-Baileys"><img src="https://img.shields.io/github/stars/Dioneibi-rip/Ruby-Baileys?style=flat-square&color=ff7b93&logo=github" alt="Stars"/></a>
  <a href="https://github.com/Dioneibi-rip/Ruby-Baileys"><img src="https://img.shields.io/github/forks/Dioneibi-rip/Ruby-Baileys?style=flat-square&color=ff7b93&logo=github" alt="Forks"/></a>
  <a href="https://github.com/Dioneibi-rip/Ruby-Baileys"><img src="https://img.shields.io/github/repo-size/Dioneibi-rip/Ruby-Baileys?style=flat-square&color=ff7b93" alt="Size"/></a>
  <img src="https://api.visitorbadge.io/api/visitors?user=Dioneibi-rip&repo=Ruby-Baileys&label=visitas&countColor=%23ff7b93&style=flat-square" alt="Visitas"/>
</p>

<p>
  <img src="https://img.shields.io/badge/Node.js-%E2%89%A520-ffb6c9?style=for-the-badge&logo=node.js" alt="Node >=20"/>
  <img src="https://img.shields.io/badge/WhatsApp-Multi--Device-ff7b93?style=for-the-badge&logo=whatsapp" alt="Multi Device"/>
  <img src="https://img.shields.io/badge/Estilo-kawaii%20%26%20elegante-f7a8b8?style=for-the-badge" alt="Kawaii"/>
</p>

</div>

---

> [!NOTE]
> **Ruby Baileys** es una implementación ligera, bonita y resiliente para crear bots de WhatsApp sobre WebSocket, sin Selenium, sin Chromium y con enfoque en sesiones persistentes 24/7. 🌸

> [!IMPORTANT]
> Esta librería no está afiliada, patrocinada ni respaldada por WhatsApp Inc. Úsala con responsabilidad, respeta los Términos de Servicio y evita spam, abuso o automatizaciones masivas.

## ✨ Highlights

- 🎀 **Conexión directa por WebSocket** con soporte Multi-Device.
- 🔐 **Autenticación flexible:** QR en terminal o código de emparejamiento de 8 dígitos.
- 🍒 **Conexión persistente 24/7:** keep-alive, reconexión controlada, anti-sleep y store liviano.
- 👥 **Sub-bots y sesiones separadas:** ideal para bots principales, sub-bots y despliegues multi-cuenta.
- 👉🏻 **Mensajes interactivos:** botones, listas, Native Flow, templates y carruseles.
- 🖼️ **Álbumes de imagen/video** y mejoras de envío multimedia.
- 📰 **Canales / Newsletters:** rutas de subida corregidas para multimedia y miniaturas generadas por servidor.
- 🗄️ **Custom Store:** cache de chats, contactos, mensajes y metadata para reconectar sin perder contexto.
- ⚙️ **Arquitectura limpia:** CommonJS, tipados `.d.ts`, WAProto incluido y Node.js 20+.

## 🛠️ Ajustes internos

- 🔄 `media_conn` serializado para evitar carreras cuando varias subidas ocurren a la vez.
- 📰 subida multimedia a newsletters usando rutas `/newsletter/newsletter-*` y `server_thumb_gen=1`.
- 🧩 soporte ampliado para headers interactivos con imagen, video, documento, producto y ubicación.
- 🎠 carruseles con tarjetas de imagen, video o producto.
- 🎞️ álbumes con asociación automática entre el mensaje contenedor y cada media.

## 📨 Mensajes y compatibilidad

Ruby Baileys permite enviar mensajes clásicos y avanzados:

- texto, menciones, reacciones, contactos, ubicación y encuestas;
- imágenes, videos, audios, documentos, stickers y packs de stickers;
- botones legacy, listas, Native Flow, templates hidratados y carruseles;
- álbumes image/video y multimedia para canales/newsletters;
- edición, borrado, fijado y conservación de mensajes.

## 🧩 Opciones adicionales

- `mentions`: menciona JIDs específicos.
- `contextInfo`: agrega metadata avanzada.
- `viewOnce`: envuelve mensajes como vista única.
- `ephemeralExpiration`: controla mensajes efímeros.
- `raw`: envía un `proto.IMessage` construido manualmente.
- `delay`: pausa entre envíos de álbumes para mantener estabilidad.

## 📋 Tabla de Contenidos

- [✨ Highlights](#-highlights)
- [🛠️ Ajustes internos](#%EF%B8%8F-ajustes-internos)
- [📨 Mensajes y compatibilidad](#-mensajes-y-compatibilidad)
- [🧩 Opciones adicionales](#-opciones-adicionales)
- [📥 Instalación](#-instalación)
  - [🧩 Importar ESM y CJS](#-importar-esm-y-cjs)
- [🌐 Conectar a WhatsApp](#-conectar-a-whatsapp)
  - [🔐 Auth State](#-auth-state)
  - [🔑 Código de emparejamiento](#-código-de-emparejamiento)
- [🗄️ Implementar Custom Store](#%EF%B8%8F-implementar-custom-store)
- [🪪 IDs de WhatsApp](#-ids-de-whatsapp)
- [✉️ Enviar mensajes](#%EF%B8%8F-enviar-mensajes)
  - [🔠 Texto](#-texto)
  - [🔔 Menciones](#-menciones)
  - [😁 Reacción](#-reacción)
  - [📌 Fijar mensaje](#-fijar-mensaje)
  - [🔖 Keep Chat](#-keep-chat)
  - [➡️ Reenviar](#%EF%B8%8F-reenviar)
  - [👤 Contacto](#-contacto)
  - [📍 Ubicación](#-ubicación)
  - [🗓️ Evento](#%EF%B8%8F-evento)
  - [👥 Invitación de grupo](#-invitación-de-grupo)
  - [📊 Encuesta](#-encuesta)
  - [💭 Respuesta de botón](#-respuesta-de-botón)
- [📁 Enviar multimedia](#-enviar-multimedia)
  - [🖼️ Imagen](#%EF%B8%8F-imagen)
  - [🎥 Video](#-video)
  - [📃 Sticker](#-sticker)
  - [💽 Audio](#-audio)
  - [🗂️ Documento](#%EF%B8%8F-documento)
  - [🖼️ Álbum image & video](#%EF%B8%8F-álbum-image--video)
- [👉🏻 Mensajes interactivos](#-mensajes-interactivos)
  - [🔘 Botones](#-botones)
  - [📋 Lista](#-lista)
  - [🗄️ Native Flow](#%EF%B8%8F-native-flow)
  - [🎠 Carrusel](#-carrusel)
  - [🫙 Template hidratado](#-template-hidratado)
- [👁️ Otras opciones](#%EF%B8%8F-otras-opciones)
  - [🕒 Efímeros](#-efímeros)
  - [📰 External Ad Reply](#-external-ad-reply)
  - [🧩 Raw](#-raw)
  - [👁️ View Once](#%EF%B8%8F-view-once)
- [♻️ Modificar mensajes](#%EF%B8%8F-modificar-mensajes)
  - [🗑️ Borrar mensajes](#%EF%B8%8F-borrar-mensajes)
  - [✏️ Editar mensajes](#%EF%B8%8F-editar-mensajes)
- [🧰 Contenido adicional](#-contenido-adicional)
  - [🔑 Solicitar código personalizado](#-solicitar-código-personalizado)
  - [📣 Newsletters](#-newsletters)
  - [👥 Grupos](#-grupos)
  - [📡 Eventos](#-eventos)
- [📦 Base del fork](#-base-del-fork)
- [📣 Créditos](#-créditos)

## 📥 Instalación

```bash
git clone https://github.com/Dioneibi-rip/Ruby-Baileys.git
cd Ruby-Baileys
npm install
```

También puedes consumirlo desde GitHub en tu `package.json`:

```json
{
  "dependencies": {
    "baileys-ruby": "github:Dioneibi-rip/Ruby-Baileys"
  }
}
```

### 🧩 Importar ESM y CJS

```js
// ESM
import makeWASocket, {
  useMultiFileAuthState,
  makeInMemoryStore,
  DisconnectReason
} from 'baileys-ruby'

// CJS
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeInMemoryStore
} = require('baileys-ruby')
```

## 🌐 Conectar a WhatsApp

Ejemplo kawaii pero robusto para mantener el bot vivo 24/7. ✨

```js
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('baileys-ruby')
const { Boom } = require('@hapi/boom')

const SESSION_DIR = './sessions/ruby-main'
let reconnectTimer

async function startRuby() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    keepAliveIntervalMs: 30_000,
    connectTimeoutMs: 20_000,
    defaultQueryTimeoutMs: 60_000,
    syncFullHistory: false,
    markOnlineOnConnect: true
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log('🌸 Ruby conectada y lista para brillar')
      return
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error).output.statusCode
      if (statusCode === DisconnectReason.loggedOut) {
        console.log('🔐 Sesión cerrada: elimina la carpeta de sesión y empareja otra vez')
        return
      }

      clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(startRuby, 1500)
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    await sock.sendMessage(msg.key.remoteJid, {
      text: '🍒 Hola, soy Ruby Baileys funcionando 24/7.'
    }, { quoted: msg })
  })
}

startRuby().catch(console.error)
```

### 🔐 Auth State

Ruby Baileys recomienda `useMultiFileAuthState()` para desarrollo y bots pequeños. Para producción con muchos sub-bots, guarda credenciales por sesión/cuenta:

```txt
sessions/
├─ ruby-main/
├─ subbot-5211111111111/
└─ subbot-5212222222222/
```

### 🔑 Código de emparejamiento

```js
const { default: makeWASocket, useMultiFileAuthState } = require('baileys-ruby')

async function connectWithPairingCode() {
  const { state, saveCreds } = await useMultiFileAuthState('./sessions/ruby-code')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  })

  if (!sock.authState.creds.registered) {
    const phoneNumber = '521234567890' // país + número, sin + ni espacios
    const code = await sock.requestPairingCode(phoneNumber)
    console.log(`🎀 Código de 8 dígitos: ${code}`)
  }

  sock.ev.on('creds.update', saveCreds)
}

connectWithPairingCode()
```

## 🗄️ Implementar Custom Store

Un store mantiene mensajes recientes y ayuda a responder quoted messages tras reconexiones. 🌸

```js
const { makeInMemoryStore } = require('baileys-ruby')
const Pino = require('pino')

const logger = Pino({ level: 'silent' })
const store = makeInMemoryStore({ logger })

// Carga inicial
store.readFromFile('./ruby-store.json')

// Guardado suave cada 60 segundos
setInterval(() => {
  store.writeToFile('./ruby-store.json')
}, 60_000).unref()

// Después de crear sock:
store.bind(sock.ev)

// Usar en makeWASocket:
const sock = makeWASocket({
  auth: state,
  getMessage: async key => {
    const msg = await store.loadMessage(key.remoteJid, key.id)
    return msg?.message || undefined
  }
})
```

## 🪪 IDs de WhatsApp

- Usuario normal: `521234567890@s.whatsapp.net`
- Grupo: `120000000000000000@g.us`
- Estado: `status@broadcast`
- Canal / Newsletter: `120000000000000000@newsletter`
- LID moderno: `123456789@lid`

## ✉️ Enviar mensajes

### 🔠 Texto

```js
await sock.sendMessage(jid, {
  text: '✨ Hola desde Ruby Baileys.'
})
```

### 🔔 Menciones

```js
await sock.sendMessage(groupJid, {
  text: '🌸 Hola @521234567890',
  mentions: ['521234567890@s.whatsapp.net']
})
```

### 😁 Reacción

```js
await sock.sendMessage(jid, {
  react: {
    text: '🍒',
    key: message.key
  }
})
```

### 📌 Fijar mensaje

```js
await sock.sendMessage(jid, {
  pin: message.key,
  type: 1,
  time: 86400
})
```

### 🔖 Keep Chat

```js
await sock.sendMessage(jid, {
  keep: message.key,
  type: 1
})
```

### ➡️ Reenviar

```js
await sock.sendMessage(jid, {
  forward: message,
  force: true
})
```

### 👤 Contacto

```js
await sock.sendMessage(jid, {
  contacts: {
    displayName: 'Ruby Support',
    contacts: [{
      displayName: 'Ruby Support',
      vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:Ruby Support\nTEL;waid=521234567890:+52 123 456 7890\nEND:VCARD'
    }]
  }
})
```

### 📍 Ubicación

```js
await sock.sendMessage(jid, {
  location: {
    degreesLatitude: 19.4326,
    degreesLongitude: -99.1332,
    name: 'Ruby HQ 🌸'
  }
})
```

### 🗓️ Evento

```js
await sock.sendMessage(jid, {
  event: {
    name: 'Deploy kawaii de Ruby',
    description: 'Revisión de sub-bots y store persistente',
    startTime: Math.floor(Date.now() / 1000) + 3600
  }
})
```

### 👥 Invitación de grupo

```js
await sock.sendMessage(jid, {
  groupInvite: {
    jid: groupJid,
    inviteCode: 'ABCD1234',
    inviteExpiration: Math.floor(Date.now() / 1000) + 86400,
    subject: 'Ruby Baileys 🌸',
    text: 'Únete a la comunidad Ruby.'
  }
})
```

### 📊 Encuesta

```js
await sock.sendMessage(groupJid, {
  poll: {
    name: '¿Qué modo prefieres?',
    values: ['QR', 'Código de 8 dígitos', 'Sub-bot 24/7'],
    selectableCount: 1
  }
})
```

### 💭 Respuesta de botón

```js
await sock.sendMessage(jid, {
  buttonReply: {
    id: 'ruby_menu',
    displayText: 'Abrir menú',
    index: 0
  },
  type: 'plain'
})
```

## 📁 Enviar multimedia

### 🖼️ Imagen

```js
await sock.sendMessage(jid, {
  image: { url: './assets/ruby.jpg' },
  caption: '🎀 Ruby image message'
})
```

### 🎥 Video

```js
await sock.sendMessage(jid, {
  video: { url: 'https://example.com/ruby.mp4' },
  caption: '🍒 Video listo',
  gifPlayback: false
})
```

### 📃 Sticker

```js
await sock.sendMessage(jid, {
  sticker: { url: './stickers/ruby.webp' }
})
```

### 💽 Audio

```js
await sock.sendMessage(jid, {
  audio: { url: './audio/ruby.ogg' },
  ptt: true
})
```

### 🗂️ Documento

```js
await sock.sendMessage(jid, {
  document: { url: './docs/guia-ruby.pdf' },
  mimetype: 'application/pdf',
  fileName: 'guia-ruby.pdf',
  caption: '📘 Guía Ruby Baileys'
})
```

### 🖼️ Álbum image & video

```js
await sock.sendMessage(jid, {
  album: [
    { image: { url: './media/ruby-1.jpg' }, caption: 'Foto 1 🌸' },
    { image: { url: './media/ruby-2.jpg' }, caption: 'Foto 2 🎀' },
    { video: { url: './media/ruby-clip.mp4' }, caption: 'Clip 🍒' }
  ],
  caption: 'Álbum Ruby Baileys'
}, {
  delay: 700
})
```

## 👉🏻 Mensajes interactivos

### 🔘 Botones

```js
await sock.sendMessage(jid, {
  text: '✨ ¿Qué quieres hacer?',
  footer: 'Ruby Baileys • menú principal',
  buttons: [
    { buttonId: 'menu', buttonText: { displayText: '🎀 Menú' }, type: 1 },
    { buttonId: 'ping', buttonText: { displayText: '🍒 Ping' }, type: 1 }
  ]
})
```

### 📋 Lista

```js
await sock.sendMessage(jid, {
  text: 'Elige una sección 🌸',
  title: 'Ruby Menu',
  buttonText: 'Abrir lista',
  footer: 'Ruby Baileys',
  sections: [{
    title: 'Comandos',
    rows: [
      { title: 'Ping', rowId: '.ping', description: 'Comprobar latencia' },
      { title: 'Estado', rowId: '.status', description: 'Ver estado del bot' }
    ]
  }]
})
```

### 🗄️ Native Flow

```js
await sock.sendMessage(jid, {
  image: { url: './assets/ruby-card.jpg' },
  caption: '🎀 Panel interactivo de Ruby',
  title: 'Ruby Baileys',
  footer: 'Selecciona una opción',
  nativeFlow: [
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: 'Ping 🍒', id: '.ping' })
    },
    {
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({ display_text: 'GitHub ✨', url: 'https://github.com/Dioneibi-rip/Ruby-Baileys' })
    }
  ]
})
```

### 🎠 Carrusel

```js
await sock.sendMessage(jid, {
  text: '🌸 Tarjetas Ruby disponibles',
  footer: 'Desliza para ver más',
  cards: [
    {
      image: { url: './assets/card-qr.jpg' },
      caption: 'Conexión por QR',
      title: 'QR Login',
      footer: 'Rápido y simple',
      nativeFlow: [{
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({ display_text: 'Usar QR', id: 'qr' })
      }]
    },
    {
      video: { url: './assets/card-24-7.mp4' },
      caption: 'Modo 24/7',
      title: 'Persistencia',
      footer: 'Anti-sleep incluido',
      nativeFlow: [{
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({ display_text: 'Activar', id: '247' })
      }]
    }
  ]
})
```

### 🫙 Template hidratado

```js
await sock.sendMessage(jid, {
  text: '🍒 Template bonito de Ruby',
  footer: 'Ruby Baileys',
  templateButtons: [
    { index: 1, quickReplyButton: { displayText: 'Menú', id: 'menu' } },
    { index: 2, urlButton: { displayText: 'GitHub', url: 'https://github.com/Dioneibi-rip/Ruby-Baileys' } }
  ]
})
```

## 👁️ Otras opciones

### 🕒 Efímeros

```js
await sock.sendMessage(jid, {
  text: 'Este mensaje expira en 24 horas 🌙'
}, {
  ephemeralExpiration: 86400
})
```

### 📰 External Ad Reply

```js
await sock.sendMessage(jid, {
  text: '✨ Ruby Baileys en GitHub',
  contextInfo: {
    externalAdReply: {
      title: 'Ruby Baileys',
      body: 'Bot 24/7 con WebSocket',
      mediaType: 1,
      thumbnailUrl: 'https://i.pinimg.com/736x/3a/f1/e0/3af1e0da373b4efe2a5729f8c4a139b9.jpg',
      sourceUrl: 'https://github.com/Dioneibi-rip/Ruby-Baileys'
    }
  }
})
```

### 🧩 Raw

```js
await sock.sendMessage(jid, {
  raw: true,
  extendedTextMessage: {
    text: 'Mensaje raw construido manualmente 🎀'
  }
})
```

### 👁️ View Once

```js
await sock.sendMessage(jid, {
  image: { url: './assets/secret-ruby.jpg' },
  caption: 'Solo una vez 👀',
  viewOnce: true
})
```

## ♻️ Modificar mensajes

### 🗑️ Borrar mensajes

```js
await sock.sendMessage(jid, {
  delete: message.key
})
```

### ✏️ Editar mensajes

```js
const sent = await sock.sendMessage(jid, { text: 'Ruby está cargando...' })

await sock.sendMessage(jid, {
  text: 'Ruby está lista ✨',
  edit: sent.key
})
```

## 🧰 Contenido adicional

### 🔑 Solicitar código personalizado

```js
const code = await sock.requestPairingCode('521234567890', 'RUBY2026')
console.log(code)
```

### 📣 Newsletters

Ruby Baileys incluye correcciones de subida para canales/newsletters. Usa el JID `@newsletter` y envía multimedia normalmente:

```js
await sock.sendMessage('120000000000000000@newsletter', {
  image: { url: './assets/newsletter-cover.jpg' },
  caption: '📰 Update de Ruby Baileys para canales'
})
```

### 👥 Grupos

```js
const metadata = await sock.groupMetadata(groupJid)
console.log(metadata.subject, metadata.participants.length)

await sock.sendMessage(groupJid, {
  text: `🌸 Grupo: ${metadata.subject}`
})
```

### 📡 Eventos

```js
sock.ev.on('messages.upsert', ({ messages, type }) => {
  console.log('Nuevo lote:', type, messages.length)
})

sock.ev.on('groups.update', updates => {
  console.log('Actualización de grupos:', updates)
})

sock.ev.on('creds.update', saveCreds)
```

## 📦 Base del fork

Ruby Baileys toma como base el ecosistema open source de Baileys y lo adapta para bots con estética Ruby, sesiones persistentes, sub-bots y mejoras de mensajería moderna.

## 📣 Créditos

- 🍒 **Dioneibi** — desarrollo, adaptación y mantenimiento de Ruby Baileys.
- 🌱 Bases originales del proyecto Baileys y comunidad open source.
- 💖 Gracias a quienes prueban, reportan bugs y comparten mejoras con respeto.

---

<div align="center">

**Ruby Baileys** — hecho con paciencia, café y vibes kawaii. ✨🎀🌸🍒

</div>
