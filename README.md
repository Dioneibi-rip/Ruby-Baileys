<div align="center">

# ✦ Ruby Baileys ✦

<i>Una implementación limpia, ligera y optimizada para la API de WhatsApp Web.</i>

<img src="https://i.pinimg.com/564x/aa/ab/2d/aaab2d26f675661fcc13bb2f893e110c.jpg" alt="Ruby Header" width="250" style="border-radius: 15px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);"/>

<br/><br/>

<p>
  <a href="https://github.com/Dioneibi-rip/Ruby-Baileys"><img src="https://img.shields.io/github/stars/Dioneibi-rip/Ruby-Baileys?style=for-the-badge&color=ff7b93&logo=github" alt="Stars"/></a>
  <a href="https://github.com/Dioneibi-rip/Ruby-Baileys"><img src="https://img.shields.io/github/forks/Dioneibi-rip/Ruby-Baileys?style=for-the-badge&color=ff7b93&logo=github" alt="Forks"/></a>
  <a href="https://github.com/Dioneibi-rip/Ruby-Baileys"><img src="https://img.shields.io/github/repo-size/Dioneibi-rip/Ruby-Baileys?style=for-the-badge&color=ff7b93" alt="Size"/></a>
</p>

</div>

---

### ✧ Sobre el Proyecto

**Ruby Baileys** es un fork optimizado de Baileys. Está diseñado para ser rápido, directo y consumir la menor cantidad de recursos posibles, evitando el uso de navegadores pesados como Selenium o Chromium mediante una conexión directa por WebSocket.

<details>
<summary><b>➮ Características Principales</b></summary>

- [x] Conexión directa mediante WebSocket.
- [x] Soporte completo para múltiples dispositivos (Multi-Device).
- [x] Opción de autenticación mediante Código QR o Código de Emparejamiento.
- [x] Estructura ligera orientada a un desarrollo ágil de bots.
- [x] Eventos y gestión de sesiones integrados.

</details>

<details>
<summary><b>➮ Avisos y Licencia</b></summary>

Esta librería no está afiliada ni respaldada por WhatsApp Inc. Su uso es bajo tu propia responsabilidad. Por favor, evita el uso de este repositorio para enviar spam o realizar prácticas automatizadas masivas que violen los Términos de Servicio de WhatsApp.
</details>

---

### ➮ Instalación

Abre tu terminal y ejecuta los siguientes comandos uno por uno para preparar el entorno:

```bash
git clone [https://github.com/Dioneibi-rip/Ruby-Baileys.git](https://github.com/Dioneibi-rip/Ruby-Baileys.git)

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
### ✦ Conexión Rápida
Aquí tienes la estructura base para conectarte e iniciar tu sesión recibiendo mensajes.
```typescript
import makeWASocket,{useMultiFileAuthState}from'@whiskeysockets/baileys'
async function connectToWhatsApp(){
const{state,saveCreds}=await useMultiFileAuthState('sesion_ruby')
const sock=makeWASocket({
auth:state,
printQRInTerminal:true
})
sock.ev.on('connection.update',(update)=>{
const{connection}=update
if(connection==='open'){
console.log('Conectado exitosamente')
}
})
sock.ev.on('messages.upsert',async(m)=>{
console.log(JSON.stringify(m,undefined,2))
})
sock.ev.on('creds.update',saveCreds)
}
connectToWhatsApp()

```
### ➮ Código de Emparejamiento (Sin QR)
Si prefieres conectar tu dispositivo utilizando un código de 8 dígitos en lugar de escanear la pantalla:
```typescript
import makeWASocket,{useMultiFileAuthState}from'@whiskeysockets/baileys'
async function connectWithCode(){
const{state,saveCreds}=await useMultiFileAuthState('sesion_ruby')
const sock=makeWASocket({
auth:state,
printQRInTerminal:false
})
if(!sock.authState.creds.registered){
const phoneNumber='XXXXXXXXXXX'
const code=await sock.requestPairingCode(phoneNumber)
console.log(code)
}
sock.ev.on('creds.update',saveCreds)
}
connectWithCode()

```
<div align="center">
### ❀ Desarrollador
<a href="https://github.com/Dioneibi-rip" style="display:inline-block; text-decoration: none;">
<img src="https://github.com/Dioneibi-rip.png" width="110" height="110" alt="Dioneibi-rip" style="border-radius: 50%; box-shadow: 0 0 10px rgba(255,123,147,0.5);"/>
</a>
**¡Gracias por utilizar Ruby Baileys!**
</div>
```

**Detalles de lo que implementé:**
1. **Diseño Limpio (Minimalista):** Utilicé separadores simples (`---`) y etiquetas `<details>` para esconder listas largas y mantener el archivo principal corto y fácil de leer a primera vista.
2. **Inspiración Sutil:** Añadí una paleta de colores rosa pastel en los badges (`color=ff7b93`) y una pequeña imagen sutil y centrada en el encabezado.
3. **Código Estructurado a tu Estilo:** Todos los bloques de instalación y ejemplos de TypeScript están completamente alineados a la izquierda y libres de texto innecesario en su interior.
