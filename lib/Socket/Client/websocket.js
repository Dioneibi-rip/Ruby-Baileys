"use strict"

Object.defineProperty(exports, "__esModule", { value: true })

const {
  OPEN, 
  CLOSED, 
  CLOSING, 
  CONNECTING, 
  WebSocket
} = require("ws")
const { DEFAULT_ORIGIN } = require("../../Defaults/constants")
const { AbstractSocketClient } = require("./types")

class WebSocketClient extends AbstractSocketClient {
    constructor() {
        super(...arguments)
        this.socket = null
    }
    
    get isOpen() {
        return this.socket?.readyState === OPEN
    }
    
    get isClosed() {
        return this.socket?.readyState === CLOSED
    }
    
    get isClosing() {
        return this.socket?.readyState === CLOSING
    }
    
    get isConnecting() {
        return this.socket?.readyState === CONNECTING
    }
    
    connect() {
        if (this.socket) {
            return
        }
        this.socket = new WebSocket(this.url, {
            origin: DEFAULT_ORIGIN,
            headers: this.config.options?.headers,
            handshakeTimeout: this.config.connectTimeoutMs,
            timeout: this.config.connectTimeoutMs,
            agent: this.config.agent,
        })
        this.socket.setMaxListeners(0)
        this.bindSocketEvents()
    }
    
    close() {
        const socket = this.socket
        if (!socket) {
            return
        }
        this.socket = null
        try {
            if (socket.readyState === CONNECTING) {
                socket.terminate()
            }
            else if (socket.readyState !== CLOSED && socket.readyState !== CLOSING) {
                socket.close()
            }
        }
        catch {
            try {
                socket.terminate()
            }
            catch { }
        }
        finally {
            this.detachSocketEvents(socket)
            socket.on('error', () => {})
        }
    }

    terminate() {
        const socket = this.socket
        if (!socket) {
            return
        }
        this.socket = null
        try {
            socket.terminate()
        }
        catch { }
        finally {
            this.detachSocketEvents(socket)
            socket.on('error', () => {})
        }
    }

    restart() {
        this.close()
        this.connect()
    }

    ping() {
        if (!this.socket || this.socket.readyState !== OPEN) {
            return false
        }
        this.socket.ping()
        return true
    }

    bindSocketEvents() {
        this.eventHandlers = this.eventHandlers || new Map()
        const events = ['close', 'error', 'upgrade', 'message', 'open', 'ping', 'pong', 'unexpected-response']
        for (const event of events) {
            const handler = (...args) => this.emit(event, ...args)
            this.eventHandlers.set(event, handler)
            this.socket.on(event, handler)
        }
    }

    detachSocketEvents(socket = this.socket) {
        if (!socket || !this.eventHandlers) {
            return
        }
        for (const [event, handler] of this.eventHandlers) {
            socket.off(event, handler)
        }
        this.eventHandlers.clear()
    }

    restart() {
        this.close()
        this.connect()
    }

    ping() {
        if (!this.socket || this.socket.readyState !== OPEN) {
            return false
        }
        this.socket.ping()
        return true
    }

    bindSocketEvents() {
        this.eventHandlers = this.eventHandlers || new Map()
        const events = ['close', 'error', 'upgrade', 'message', 'open', 'ping', 'pong', 'unexpected-response']
        for (const event of events) {
            const handler = (...args) => this.emit(event, ...args)
            this.eventHandlers.set(event, handler)
            this.socket.on(event, handler)
        }
    }

    detachSocketEvents() {
        if (!this.socket || !this.eventHandlers) {
            return
        }
        for (const [event, handler] of this.eventHandlers) {
            this.socket.off(event, handler)
        }
        this.eventHandlers.clear()
    }
    
    send(str, cb) {
        this.socket?.send(str, cb)
        return Boolean(this.socket)
    }
}

module.exports = {
  WebSocketClient
}