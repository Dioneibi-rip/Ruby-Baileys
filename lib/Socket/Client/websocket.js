"use strict"
Object.defineProperty(exports,"__esModule",{value:true})
const {OPEN,CLOSED,CLOSING,CONNECTING,WebSocket}=require("ws")
const {DEFAULT_ORIGIN}=require("../../Defaults/constants")
const {AbstractSocketClient}=require("./types")
const DEFAULT_BROWSER_HEADERS={
"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
"Accept-Language":"en-US,en;q=0.9",
"Sec-WebSocket-Version":"13",
"sec-ch-ua":"\"Google Chrome\";v=\"149\", \"Chromium\";v=\"149\", \"Not.A/Brand\";v=\"24\"",
"sec-ch-ua-mobile":"?0",
"sec-ch-ua-platform":"\"Windows\""
}
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
this.socket=new WebSocket(this.url,{
origin:DEFAULT_ORIGIN,
headers:{...DEFAULT_BROWSER_HEADERS,...(this.config.options?.headers||{})},
handshakeTimeout:this.config.connectTimeoutMs,
timeout:this.config.connectTimeoutMs,
agent:this.config.agent,
perMessageDeflate:false,
skipUTF8Validation:true
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
