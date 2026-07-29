"use strict"
Object.defineProperty(exports,"__esModule",{value:true})
const {OPEN,CLOSED,CLOSING,CONNECTING,WebSocket}=require("ws")
const {DEFAULT_ORIGIN}=require("../../Defaults/constants")
const {WA_WEB_USER_AGENT}=require("../../Utils/generics")
const {AbstractSocketClient}=require("./types")
class WebSocketClient extends AbstractSocketClient{
constructor(){
super(...arguments)
this.socket=null
}
get isOpen(){
return this.socket?.readyState===OPEN
}
get isClosed(){
return this.socket===null||this.socket?.readyState===CLOSED
}
get isClosing(){
return this.socket===null||this.socket?.readyState===CLOSING
}
get isConnecting(){
return this.socket?.readyState===CONNECTING
}
connect(){
if(this.socket){
return
}
const configuredHeaders=this.config.options?.headers||{}
const headers={
"User-Agent":WA_WEB_USER_AGENT,
"Origin":DEFAULT_ORIGIN,
...configuredHeaders
}
this.socket=new WebSocket(this.url,{
origin:headers.Origin||DEFAULT_ORIGIN,
headers,
handshakeTimeout:this.config.connectTimeoutMs,
timeout:this.config.connectTimeoutMs,
agent:this.config.agent
})
this.socket.setMaxListeners(0)
const events=['close','error','upgrade','message','open','ping','pong','unexpected-response']
for(const event of events){
this.socket?.on(event,(...args)=>this.emit(event,...args))
}
}
async close(){
if(!this.socket){
return
}
const socket=this.socket
const closePromise=socket.readyState===CLOSED?Promise.resolve():new Promise(resolve=>{
socket.once('close',resolve)
})
socket.close()
await closePromise
if(this.socket===socket){
this.socket=null
}
}
async restart(){
await this.close()
this.connect()
}
send(str,cb){
this.socket?.send(str,cb)
return Boolean(this.socket)
}
}
module.exports={
WebSocketClient
}
