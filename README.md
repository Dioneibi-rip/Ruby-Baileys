<div align="center">

<img src="https://i.pinimg.com/736x/3a/f1/e0/3af1e0da373b4efe2a5729f8c4a139b9.jpg" alt="Ruby Hoshino banner" width="100%" style="border-radius: 12px;"/>

<br><br>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&pause=1200&color=2E7D32&center=true&vCenter=true&width=760&lines=Ruby+Baileys+%F0%9F%8C%BF;API+WhatsApp+WebSocket+ligera+y+modular;Optimizaci%C3%B3n+24%2F7+para+bots+persistentes;Sin+Selenium+%E2%80%A2+Sin+Chromium+%E2%80%A2+Multi-Device)](https://git.io/typing-svg)

<br>

<p>
  <a href="https://github.com/Dioneibi-rip/Ruby-Baileys/stargazers"><img src="https://img.shields.io/github/stars/Dioneibi-rip/Ruby-Baileys?style=for-the-badge&logo=github&label=Stars&labelColor=1B5E20&color=4CAF50" alt="GitHub stars"/></a>
  <a href="https://github.com/Dioneibi-rip/Ruby-Baileys/network/members"><img src="https://img.shields.io/github/forks/Dioneibi-rip/Ruby-Baileys?style=for-the-badge&logo=github&label=Forks&labelColor=1B5E20&color=2E7D32" alt="GitHub forks"/></a>
  <a href="https://github.com/Dioneibi-rip/Ruby-Baileys"><img src="https://img.shields.io/github/repo-size/Dioneibi-rip/Ruby-Baileys?style=for-the-badge&label=Repo%20Size&labelColor=1B5E20&color=81C784" alt="Repository size"/></a>
  <img src="https://api.visitorbadge.io/api/visitors?user=Dioneibi-rip&repo=Ruby-Baileys&label=Visitas&countColor=%234CAF50&labelColor=%231B5E20&style=for-the-badge" alt="Repository visits"/>
</p>

<p>
  <img src="https://img.shields.io/badge/Node.js-%E2%89%A520.0.0-4CAF50?style=for-the-badge&logo=node.js&logoColor=white&labelColor=1B5E20" alt="Node.js >= 20"/>
  <img src="https://img.shields.io/badge/WhatsApp-Multi--Device-2E7D32?style=for-the-badge&logo=whatsapp&logoColor=white&labelColor=1B5E20" alt="WhatsApp Multi-Device"/>
  <img src="https://img.shields.io/badge/WebSocket-API%2024%2F7-81C784?style=for-the-badge&logo=socketdotio&logoColor=white&labelColor=1B5E20" alt="WebSocket API 24/7"/>
</p>

<h3>🌿 Ruby Baileys</h3>
<p><strong>Una base moderna, ligera y extensible para bots de WhatsApp con conexión persistente, store indexado y mensajería avanzada.</strong></p>

</div>

---

> [!NOTE]
> **Ruby Baileys** es una implementación ligera basada en la conexión WebSocket de WhatsApp Multi-Device. No automatiza un navegador, no depende de Selenium y no ejecuta Chromium: su enfoque es mantener sesiones eficientes, rápidas y aptas para despliegues 24/7.

> [!WARNING]
> Esta librería no está afiliada, patrocinada ni respaldada por WhatsApp, Meta o sus empresas relacionadas. Úsala con responsabilidad, evita spam, scraping, abuso o automatizaciones masivas y respeta los Términos de Servicio para reducir riesgos de suspensión o bloqueo de cuentas.

## 📋 Tabla de Contenidos

- [🌱 Características destacadas](#-características-destacadas)
- [🧭 Arquitectura del proyecto](#-arquitectura-del-proyecto)
- [📥 Instalación manual](#-instalación-manual)
- [☁️ Métodos de despliegue](#️-métodos-de-despliegue)
- [🧩 Importación ESM y CommonJS](#-importación-esm-y-commonjs)
- [🌐 Conectar a WhatsApp](#-conectar-a-whatsapp)
  - [🔐 Auth State](#-auth-state)
  - [🔑 Pairing Code](#-pairing-code)
- [🎋 Custom Store indexado](#-custom-store-indexado)
- [🪪 IDs de WhatsApp](#-ids-de-whatsapp)
- [✉️ Enviar mensajes](#️-enviar-mensajes)
  - [🔠 Texto](#-texto)
  - [🔔 Menciones](#-menciones)
  - [😁 Reacción](#-reacción)
  - [📌 Fijar mensaje](#-fijar-mensaje)
  - [🔖 Keep Chat](#-keep-chat)
  - [➡️ Reenviar](#️-reenviar)
  - [👤 Contacto](#-contacto)
  - [📍 Ubicación](#-ubicación)
  - [🗓️ Evento](#️-evento)
  - [👥 Invitación de grupo](#-invitación-de-grupo)
  - [📊 Encuesta](#-encuesta)
  - [💭 Respuesta de botón](#-respuesta-de-botón)
- [📁 Enviar multimedia](#-enviar-multimedia)
  - [🖼️ Imagen](#️-imagen)
  - [🎥 Video](#-video)
  - [📃 Sticker](#-sticker)
  - [💽 Audio](#-audio)
  - [🗂️ Documento](#️-documento)
  - [🍃 Álbum de imágenes y videos con delay](#-álbum-de-imágenes-y-videos-con-delay)
- [🌿 Mensajes interactivos](#-mensajes-interactivos)
  - [🔘 Botones](#-botones)
  - [📋 Lista](#-lista)
  - [🧬 Native Flow](#-native-flow)
  - [🎠 Carrusel](#-carrusel)
  - [🫙 Template hidratado](#-template-hidratado)
- [👁️ Opciones avanzadas](#️-opciones-avanzadas)
  - [🕒 Efímeros](#-efímeros)
  - [📰 External Ad Reply](#-external-ad-reply)
  - [🧩 Raw](#-raw)
  - [👁️ View Once](#️-view-once)
- [♻️ Modificar mensajes](#️-modificar-mensajes)
  - [🗑️ Borrar mensajes](#️-borrar-mensajes)
  - [✏️ Editar mensajes](#️-editar-mensajes)
- [🧰 Contenido adicional](#-contenido-adicional)
  - [🔑 Solicitar código personalizado](#-solicitar-código-personalizado)
  - [🌵 Canales y newsletters](#-canales-y-newsletters)
  - [👥 Grupos](#-grupos)
  - [📡 Eventos](#-eventos)
- [📦 Base del fork](#-base-del-fork)
- [🤝 Créditos y licencia](#-créditos-y-licencia)

## 🌱 Características destacadas

- 🌱 **Conexión persistente 24/7:** reconexión controlada, keep-alive y configuración pensada para procesos de larga duración.
- 🌿 **Soporte para mensajes interactivos:** botones, listas, templates, carruseles y Native Flow con estructuras claras.
- 🍃 **Gestión de álbumes y multimedia:** envío de imágenes, videos, documentos, stickers, audios y álbumes con pausa configurable.
- 🎋 **Custom Store indexado:** cache local de chats, contactos, mensajes y metadatos para recuperar contexto tras reconexiones.
- 🌵 **Optimización para canales/newsletters:** rutas de subida adaptadas para multimedia y miniaturas generadas por servidor.
- 🌾 **Autenticación flexible:** QR en terminal o código de emparejamiento de 8 dígitos para sesiones Multi-Device.
- 🪴 **Base CommonJS + typings:** entrada principal en `lib/index.js`, definiciones `.d.ts` y compatibilidad con Node.js 20+.

<details>
<summary><strong>🧭 Ver capacidades internas del fork</strong></summary>

| Área | Mejora | Impacto |
| --- | --- | --- |
| `media_conn` | Serialización de cargas concurrentes | Reduce condiciones de carrera al subir multimedia. |
| Newsletters | Uso de rutas `/newsletter/newsletter-*` y `server_thumb_gen=1` | Mejora compatibilidad con canales y miniaturas. |
| Interactivos | Headers con imagen, video, documento, producto y ubicación | Permite experiencias más ricas en menús y flujos. |
| Álbumes | Asociación entre contenedor y cada media | Mantiene grupos multimedia más consistentes. |
| Store | Persistencia de mensajes recientes | Facilita responder quoted messages tras reconexión. |

</details>

## 🧭 Arquitectura del proyecto

| Elemento | Descripción |
| --- | --- |
| **Runtime** | Node.js `>=20.0.0`. |
| **Entrada principal** | `lib/index.js`. |
| **Tipados** | `lib/index.d.ts` y `WAProto/index.d.ts`. |
| **Protocolo** | `WAProto/` incluido para estructuras de mensajes. |
| **Transporte** | WebSocket directo, sin navegador embebido. |
| **Persistencia** | Credenciales multiarchivo + store opcional por sesión. |

## 📥 Instalación manual

Cada comando está separado para que GitHub muestre el botón de copiar individualmente.

### 1. Clonar el repositorio

```bash
git clone https://github.com/Dioneibi-rip/Ruby-Baileys.git
```

### 2. Entrar al directorio

```bash
cd Ruby-Baileys
```

### 3. Verificar Node.js

```bash
node --version
```

### 4. Instalar dependencias

```bash
npm install
```

### 5. Usar como dependencia desde GitHub

```bash
npm install github:Dioneibi-rip/Ruby-Baileys
```

<details>
<summary><strong>📦 Alternativa con package.json</strong></summary>

```json
{
  "dependencies": {
    "baileys-ruby": "github:Dioneibi-rip/Ruby-Baileys"
  }
}
```

</details>

## ☁️ Métodos de despliegue

<div align="center">

| Plataforma | Despliegue rápido | Recomendación |
| --- | --- | --- |
| Heroku | [![Deploy to Heroku](https://img.shields.io/badge/Deploy-Heroku-4CAF50?style=for-the-badge&logo=heroku&logoColor=white&labelColor=1B5E20)](https://heroku.com/deploy?template=https://github.com/Dioneibi-rip/Ruby-Baileys) | Define variables de entorno y usa almacenamiento persistente si guardas sesiones. |
| Replit | [![Run on Replit](https://img.shields.io/badge/Run-Replit-2E7D32?style=for-the-badge&logo=replit&logoColor=white&labelColor=1B5E20)](https://replit.com/github/Dioneibi-rip/Ruby-Baileys) | Ideal para pruebas, demos y bots pequeños. |
| Render | [![Deploy to Render](https://img.shields.io/badge/Deploy-Render-81C784?style=for-the-badge&logo=render&logoColor=white&labelColor=1B5E20)](https://render.com/deploy?repo=https://github.com/Dioneibi-rip/Ruby-Baileys) | Recomendado para servicios web con reinicio automático. |

</div>

> [!NOTE]
> En producción, no expongas carpetas de sesión, credenciales, tokens ni stores persistentes dentro del repositorio. Usa volúmenes, secretos o almacenamiento privado según la plataforma.

## 🧩 Importación ESM y CommonJS

```js
// ESM
import makeWASocket, {
  DisconnectReason,
  makeInMemoryStore,
  useMultiFileAuthState
} from 'baileys-ruby'
```

```js
// CommonJS
const {
  default: makeWASocket,
  DisconnectReason,
  makeInMemoryStore,
  useMultiFileAuthState
} = require('baileys-ruby')
```

## 🌐 Conectar a WhatsApp

Este ejemplo prioriza estabilidad: guarda credenciales, evita sincronización completa innecesaria y reconecta si el cierre no corresponde a logout.

```js
const { Boom } = require('@hapi/boom')
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState
} = require('baileys-ruby')

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
      console.log('🌿 Ruby Baileys conectada y lista para operar 24/7')
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
    const message = messages[0]
    if (!message?.message || message.key.fromMe) return

    await sock.sendMessage(message.key.remoteJid, {
      text: '🌱 Hola, Ruby Baileys está funcionando con WebSocket 24/7.'
    }, { quoted: message })
  })
}

startRuby().catch(console.error)
```

### 🔐 Auth State

`useMultiFileAuthState()` es práctico para desarrollo, bots pequeños y sesiones aisladas. Para producción con sub-bots, guarda cada cuenta en su propio directorio.

```txt
sessions/
├─ ruby-main/
├─ subbot-5211111111111/
└─ subbot-5212222222222/
```

### 🔑 Pairing Code

El código de emparejamiento permite conectar sin imprimir QR. Usa el número en formato internacional, sin `+`, espacios ni guiones.

```js
const {
  default: makeWASocket,
  useMultiFileAuthState
} = require('baileys-ruby')

async function connectWithPairingCode() {
  const { state, saveCreds } = await useMultiFileAuthState('./sessions/ruby-code')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  })

  if (!sock.authState.creds.registered) {
    const phoneNumber = '521234567890'
    const code = await sock.requestPairingCode(phoneNumber)
    console.log(`🌿 Código de emparejamiento: ${code}`)
  }

  sock.ev.on('creds.update', saveCreds)
}

connectWithPairingCode().catch(console.error)
```

## 🎋 Custom Store indexado

Un store ayuda a conservar mensajes recientes, resolver quoted messages y reducir pérdida de contexto después de reconectar.

```js
const Pino = require('pino')
const {
  default: makeWASocket,
  makeInMemoryStore,
  useMultiFileAuthState
} = require('baileys-ruby')

const logger = Pino({ level: 'silent' })
const store = makeInMemoryStore({ logger })

store.readFromFile('./ruby-store.json')

setInterval(() => {
  store.writeToFile('./ruby-store.json')
}, 60_000).unref()

async function startWithStore() {
  const { state, saveCreds } = await useMultiFileAuthState('./sessions/ruby-store')

  const sock = makeWASocket({
    auth: state,
    getMessage: async key => {
      const message = await store.loadMessage(key.remoteJid, key.id)
      return message?.message || undefined
    }
  })

  store.bind(sock.ev)
  sock.ev.on('creds.update', saveCreds)

  return sock
}

startWithStore().catch(console.error)
```

## 🪪 IDs de WhatsApp

| Tipo | Formato |
| --- | --- |
| Usuario | `521234567890@s.whatsapp.net` |
| Grupo | `120000000000000000@g.us` |
| Estado | `status@broadcast` |
| Canal / Newsletter | `120000000000000000@newsletter` |
| LID moderno | `123456789@lid` |

## ✉️ Enviar mensajes

<details open>
<summary><strong>🌱 Ejemplos básicos</strong></summary>

### 🔠 Texto

```js
await sock.sendMessage(jid, {
  text: '🌱 Hola desde Ruby Baileys.'
})
```

### 🔔 Menciones

```js
await sock.sendMessage(groupJid, {
  text: '🌿 Hola @521234567890',
  mentions: ['521234567890@s.whatsapp.net']
})
```

### 😁 Reacción

```js
await sock.sendMessage(jid, {
  react: {
    text: '🍃',
    key: message.key
  }
})
```

### 📌 Fijar mensaje

```js
await sock.sendMessage(jid, {
  pin: message.key,
  type: 1,
  time: 86_400
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

</details>

<details>
<summary><strong>🌾 Ejemplos sociales y utilitarios</strong></summary>

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
    name: 'Ruby HQ 🌿'
  }
})
```

### 🗓️ Evento

```js
await sock.sendMessage(jid, {
  event: {
    name: 'Revisión de despliegue Ruby Baileys',
    description: 'Auditoría de sesión, store y reconexión 24/7',
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
    inviteExpiration: Math.floor(Date.now() / 1000) + 86_400,
    subject: 'Ruby Baileys 🌿',
    text: 'Únete a la comunidad Ruby Baileys.'
  }
})
```

### 📊 Encuesta

```js
await sock.sendMessage(groupJid, {
  poll: {
    name: '¿Qué modo de conexión prefieres?',
    values: ['QR', 'Pairing Code', 'Sub-bot 24/7'],
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

</details>

## 📁 Enviar multimedia

### 🖼️ Imagen

```js
await sock.sendMessage(jid, {
  image: { url: './assets/ruby.jpg' },
  caption: '🌿 Imagen enviada desde Ruby Baileys'
})
```

### 🎥 Video

```js
await sock.sendMessage(jid, {
  video: { url: 'https://example.com/ruby.mp4' },
  caption: '🍃 Video procesado correctamente',
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
  caption: '🌾 Guía técnica de Ruby Baileys'
})
```

### 🍃 Álbum de imágenes y videos con delay

El parámetro `delay` pausa entre elementos del álbum para reducir saturación al subir múltiples archivos.

```js
await sock.sendMessage(jid, {
  album: [
    {
      image: { url: './media/ruby-1.jpg' },
      caption: 'Brote 1 🌱'
    },
    {
      image: { url: './media/ruby-2.jpg' },
      caption: 'Hoja 2 🌿'
    },
    {
      video: { url: './media/ruby-clip.mp4' },
      caption: 'Clip del jardín 🍃'
    }
  ],
  caption: 'Álbum Ruby Baileys'
}, {
  delay: 700
})
```

## 🌿 Mensajes interactivos

### 🔘 Botones

```js
await sock.sendMessage(jid, {
  text: '🌱 ¿Qué quieres hacer?',
  footer: 'Ruby Baileys • menú principal',
  buttons: [
    {
      buttonId: 'menu',
      buttonText: { displayText: 'Menú' },
      type: 1
    },
    {
      buttonId: 'ping',
      buttonText: { displayText: 'Ping' },
      type: 1
    }
  ]
})
```

### 📋 Lista

```js
await sock.sendMessage(jid, {
  text: 'Selecciona una sección 🌿',
  title: 'Ruby Menu',
  buttonText: 'Abrir lista',
  footer: 'Ruby Baileys',
  sections: [{
    title: 'Comandos',
    rows: [
      {
        title: 'Ping',
        rowId: '.ping',
        description: 'Comprobar latencia del bot'
      },
      {
        title: 'Estado',
        rowId: '.status',
        description: 'Ver estado de conexión y sesión'
      }
    ]
  }]
})
```

### 🧬 Native Flow

Native Flow permite construir botones avanzados mediante `buttonParamsJson`. Mantén IDs estables para enrutar acciones en tu handler.

```js
await sock.sendMessage(jid, {
  image: { url: './assets/ruby-card.jpg' },
  caption: '🎋 Panel interactivo Ruby',
  title: 'Ruby Baileys',
  footer: 'Selecciona una acción',
  nativeFlow: [
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: 'Ping',
        id: '.ping'
      })
    },
    {
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({
        display_text: 'GitHub',
        url: 'https://github.com/Dioneibi-rip/Ruby-Baileys'
      })
    }
  ]
})
```

### 🎠 Carrusel

Los carruseles agrupan tarjetas con contenido multimedia y acciones. Úsalos para menús visuales, catálogos o navegación guiada.

```js
await sock.sendMessage(jid, {
  text: '🌾 Tarjetas disponibles',
  footer: 'Desliza para ver más opciones',
  cards: [
    {
      image: { url: './assets/card-qr.jpg' },
      caption: 'Conexión por QR',
      title: 'QR Login',
      footer: 'Rápido y directo',
      nativeFlow: [{
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: 'Usar QR',
          id: 'qr_login'
        })
      }]
    },
    {
      video: { url: './assets/card-24-7.mp4' },
      caption: 'Persistencia de sesión',
      title: 'Modo 24/7',
      footer: 'Reconexión controlada',
      nativeFlow: [{
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: 'Activar',
          id: 'enable_24_7'
        })
      }]
    }
  ]
})
```

### 🫙 Template hidratado

```js
await sock.sendMessage(jid, {
  text: '🌿 Template de Ruby Baileys',
  footer: 'Ruby Baileys',
  templateButtons: [
    {
      index: 1,
      quickReplyButton: {
        displayText: 'Menú',
        id: 'menu'
      }
    },
    {
      index: 2,
      urlButton: {
        displayText: 'GitHub',
        url: 'https://github.com/Dioneibi-rip/Ruby-Baileys'
      }
    }
  ]
})
```

## 👁️ Opciones avanzadas

### 🕒 Efímeros

```js
await sock.sendMessage(jid, {
  text: 'Este mensaje expira en 24 horas 🌙'
}, {
  ephemeralExpiration: 86_400
})
```

### 📰 External Ad Reply

```js
await sock.sendMessage(jid, {
  text: '🌿 Ruby Baileys en GitHub',
  contextInfo: {
    externalAdReply: {
      title: 'Ruby Baileys',
      body: 'API WebSocket para bots persistentes',
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
    text: 'Mensaje raw construido manualmente 🌱'
  }
})
```

### 👁️ View Once

```js
await sock.sendMessage(jid, {
  image: { url: './assets/secret-ruby.jpg' },
  caption: 'Disponible una sola vez 👀',
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
const sent = await sock.sendMessage(jid, {
  text: 'Ruby Baileys está sincronizando...'
})

await sock.sendMessage(jid, {
  text: 'Ruby Baileys está lista 🌿',
  edit: sent.key
})
```

## 🧰 Contenido adicional

### 🔑 Solicitar código personalizado

```js
const code = await sock.requestPairingCode('521234567890', 'RUBY2026')
console.log(code)
```

### 🌵 Canales y newsletters

Ruby Baileys incluye ajustes para subir multimedia a canales/newsletters. Usa el JID `@newsletter` y envía el contenido como multimedia estándar.

```js
await sock.sendMessage('120000000000000000@newsletter', {
  image: { url: './assets/newsletter-cover.jpg' },
  caption: '🌵 Actualización de Ruby Baileys para canales'
})
```

### 👥 Grupos

```js
const metadata = await sock.groupMetadata(groupJid)
console.log(metadata.subject, metadata.participants.length)

await sock.sendMessage(groupJid, {
  text: `🌿 Grupo activo: ${metadata.subject}`
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

Ruby Baileys toma como base el ecosistema open source de Baileys y lo adapta para bots con sesiones persistentes, sub-bots, mensajería moderna, soporte multimedia avanzado y despliegues 24/7 con una identidad visual botánico-tecnológica.

## 🤝 Créditos y licencia

<div align="center">

<a href="https://github.com/Dioneibi-rip/Ruby-Baileys/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Dioneibi-rip/Ruby-Baileys" alt="Contribuidores de Ruby Baileys"/>
</a>

</div>

- 🌿 **Dioneibi-rip / Dioneibi** — creador, adaptación principal y mantenimiento de Ruby Baileys.
- 🌱 **Mantenedores y comunidad original de Baileys** — base técnica, investigación y trabajo open source que hizo posible este fork.
- 🍃 **itsliaaa y comunidad de documentación** — inspiración para mantener ejemplos prácticos, navegables y fáciles de copiar.
- 🎋 **Contribuidores, testers y usuarios** — reportes, mejoras y validación en entornos reales.

> [!NOTE]
> Este proyecto conserva una licencia open source de tipo MIT según el paquete del repositorio. Revisa los archivos de licencia y metadatos del proyecto antes de redistribuir versiones modificadas.

---

<div align="center">

**Ruby Baileys** — tecnología WebSocket, sesiones persistentes y una documentación limpia que crece como un jardín. 🌿🌱🍃

</div>
