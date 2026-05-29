<div align="center">

<img src="https://i.pinimg.com/736x/cb/42/c2/cb42c2d460451b8c968511fec658b40d.jpg" alt="Ruby Header" width="100%">

<br><br>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Oswald&weight=600&pause=1000&color=FF7B93&center=true&vCenter=true&width=450&lines=✦+Ruby+Baileys+✦;Una+implementación+limpia+y+ligera;Optimizada+para+WhatsApp+Web)](https://git.io/typing-svg)

<br>

<p>
  <a href="https://github.com/Dioneibi-rip/Ruby-Baileys">
    <img src="https://img.shields.io/github/stars/Dioneibi-rip/Ruby-Baileys?style=flat-square&color=ff7b93&logo=github" alt="Stars"/>
  </a>

  <a href="https://github.com/Dioneibi-rip/Ruby-Baileys">
    <img src="https://img.shields.io/github/forks/Dioneibi-rip/Ruby-Baileys?style=flat-square&color=ff7b93&logo=github" alt="Forks"/>
  </a>

  <a href="https://github.com/Dioneibi-rip/Ruby-Baileys">
    <img src="https://img.shields.io/github/repo-size/Dioneibi-rip/Ruby-Baileys?style=flat-square&color=ff7b93" alt="Size"/>
  </a>

  <img src="https://api.visitorbadge.io/api/visitors?user=Dioneibi-rip&repo=Ruby-Baileys&label=visitas&countColor=%23ff7b93&style=flat-square" alt="Visitas"/>

</p>

</div>

---

> [!NOTE]
> **Ruby Baileys** es un fork optimizado de Baileys. Está diseñado para ser rápido, directo y consumir la menor cantidad de recursos posibles, evitando el uso de navegadores pesados como Selenium o Chromium mediante una conexión directa por WebSocket.

> [!IMPORTANT]
> **Aviso de Uso:** Esta librería no está afiliada ni respaldada por WhatsApp Inc. Su uso es bajo tu propia responsabilidad. Evita usar este repositorio para spam o automatizaciones masivas que incumplan los Términos de Servicio.

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

# ➮ Instalación

Abre tu terminal y ejecuta:

```bash
git clone https://github.com/Dioneibi-rip/Ruby-Baileys.git
cd Ruby-Baileys
yarn install
npm start
````

# ✦ Conexión Rápida

Aquí tienes la estructura base para conectarte e iniciar tu sesión:

```ts
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys'

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_ruby')

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    })

    sock.ev.on('connection.update', ({ connection }) => {
        if (connection === 'open') {
            console.log('Conectado exitosamente')
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        console.log(JSON.stringify(m, null, 2))
    })

    sock.ev.on('creds.update', saveCreds)
}

connectToWhatsApp()
```

# ➮ Código de Emparejamiento (Sin QR)

```ts
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys'

async function connectWithCode() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_ruby')

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    })

    if (!sock.authState.creds.registered) {
        const phoneNumber = 'XXXXXXXXXXX'
        const code = await sock.requestPairingCode(phoneNumber)

        console.log(code)
    }

    sock.ev.on('creds.update', saveCreds)
}

connectWithCode()
```

---

<div align="center">

## 🌳 Creador

<a href="https://github.com/Dioneibi-rip">
  <img src="https://github.com/Dioneibi-rip.png" width="130" height="130" alt="Dioneibi-rip">
</a>

<br><br>

Copyright © 2026 **Dioneibi-rip**

### ☕ ¡GRACIAS POR UTILIZAR RUBY BAILEYS!

</div>
