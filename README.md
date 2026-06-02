<div align="center">

<img src="https://i.pinimg.com/736x/3a/f1/e0/3af1e0da373b4efe2a5729f8c4a139b9.jpg" alt="Ruby Header" width="100%" style="border-radius: 10px;"/>

<br><br>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Oswald&weight=600&pause=1000&color=FF7B93&center=true&vCenter=true&width=450&lines=✦+Ruby+Baileys+✦;Una+implementación+limpia+y+ligera;Optimizada+para+WhatsApp+Web)](https://git.io/typing-svg)

<br>

<p>
  <a href="https://github.com/Dioneibi-rip/Ruby-Baileys"><img src="https://img.shields.io/github/stars/Dioneibi-rip/Ruby-Baileys?style=flat-square&color=ff7b93&logo=github" alt="Stars"/></a>
  <a href="https://github.com/Dioneibi-rip/Ruby-Baileys"><img src="https://img.shields.io/github/forks/Dioneibi-rip/Ruby-Baileys?style=flat-square&color=ff7b93&logo=github" alt="Forks"/></a>
  <a href="https://github.com/Dioneibi-rip/Ruby-Baileys"><img src="https://img.shields.io/github/repo-size/Dioneibi-rip/Ruby-Baileys?style=flat-square&color=ff7b93" alt="Size"/></a>
  <img src="https://api.visitorbadge.io/api/visitors?user=Dioneibi-rip&repo=Ruby-Baileys&label=visitas&countColor=%23ff7b93&style=flat-square" alt="Visitas"/>
</p>

</div>

---

> [!NOTE]
> **Ruby Baileys** es un fork optimizado de Baileys. Está diseñado para ser rápido, directo y consumir la menor cantidad de recursos posibles, evitando el uso de navegadores pesados como Selenium o Chromium mediante una conexión directa por WebSocket.

> [!IMPORTANT]
> **Aviso de Uso:** Esta librería no está afiliada ni respaldada por WhatsApp Inc. Su uso es bajo tu propia responsabilidad. Por favor, evita el uso de este repositorio para enviar spam o realizar prácticas automatizadas masivas que violen los Términos de Servicio.

<br>

<details>
<summary><b>✨ Características Principales</b></summary>
<br>

- 🚀 **Conexión directa** mediante WebSocket.
- 📱 **Soporte completo** para múltiples dispositivos (Multi-Device).
- 🔑 **Autenticación dual** mediante Código QR o Código de Emparejamiento.
- ⚡ **Estructura ligera** orientada a un desarrollo ágil de bots.
- ⚙️ **Gestión integrada** de eventos y sesiones.

</details>

---

### ➮ Instalación

Abre tu terminal y ejecuta los siguientes comandos uno por uno para preparar el entorno:

```bash
git clone https://github.com/Dioneibi-rip/Ruby-Baileys.git

```
```bash
cd Ruby-Baileys

```
```bash
yarn install

```
```bash
npm start

```
### ✦ Conexión 24/7 resiliente
Estructura recomendada para sesiones persistentes, reconexión silenciosa, anti-sleep y memoria acotada.
```typescript
import makeWASocket, {
    DisconnectReason,
    makeInMemoryStore,
    useMultiFileAuthState
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'

const SESSION_DIR = 'sesion_ruby'
const STORE_FILE = './ruby-store.json'
const RECONNECT_REASONS = new Set<number>([
    DisconnectReason.connectionLost,      // 408
    DisconnectReason.connectionClosed,    // 428
    DisconnectReason.restartRequired,     // 515
    DisconnectReason.connectionReplaced   // 440
])

let sock: ReturnType<typeof makeWASocket> | undefined
let reconnectTimer: NodeJS.Timeout | undefined

const store = makeInMemoryStore({
    maxMessagesPerChat: 50,
    maxChats: 500,
    maxContacts: 2000,
    maxGroupMetadata: 250,
    flushIntervalMs: 60_000,
    flushFile: STORE_FILE
})
store.readFromFile(STORE_FILE)

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR, {
        atomicWrites: true,
        backupOnWrite: true,
        cleanupStaleTempFiles: true
    })


    const scheduleReconnect = (delayMs = 1_500) => {
        if (reconnectTimer) return
        reconnectTimer = setTimeout(() => {
            reconnectTimer = undefined
            connectToWhatsApp().catch(err => console.error('reconnect failed', err))
        }, delayMs)
        reconnectTimer.unref?.()
    }

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        keepAliveIntervalMs: 30_000,
        retryRequestDelayMs: 250,
        connectTimeoutMs: 20_000,
        defaultQueryTimeoutMs: 60_000,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        getMessage: async key => {
            const cached = await store.loadMessage(key.remoteJid!, key.id!)
            return cached?.message
        },
        shouldReconnect: ({ statusCode }) =>
            RECONNECT_REASONS.has(statusCode) || statusCode !== DisconnectReason.loggedOut
    })

    store.bind(sock.ev)
    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', update => {
        const { connection, lastDisconnect, reconnectDelayMs } = update
        if (connection === 'open') {
            console.log('Conectado exitosamente')
            return
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode
                || (lastDisconnect?.error as any)?.statusCode
                || DisconnectReason.connectionClosed

            if (statusCode === DisconnectReason.loggedOut) {
                console.error('Sesión cerrada por WhatsApp; requiere nuevo emparejamiento.')
                return
            }

            if (RECONNECT_REASONS.has(statusCode) || update.shouldReconnect !== false) {
                scheduleReconnect(reconnectDelayMs || 1_500)
            }
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        console.log(JSON.stringify(messages, undefined, 2))
    })
}

connectToWhatsApp().catch(console.error)
```
### ➮ Código de Emparejamiento (Sin QR)
Si prefieres conectar tu dispositivo utilizando un código de 8 dígitos en lugar de escanear la pantalla:
```typescript
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys'

async function connectWithCode() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_ruby')

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    })

    if(!sock.authState.creds.registered) {
        const phoneNumber = 'XXXXXXXXXXX'
        const code = await sock.requestPairingCode(phoneNumber)
        console.log(code)
    }

    sock.ev.on('creds.update', saveCreds)
}

connectWithCode()
```

