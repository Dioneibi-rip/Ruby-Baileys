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
        if (!this.socket) {
            return
        }
        this.socket.close()
        this.detachSocketEvents()
        this.socket = null
    }

    terminate() {
        if (!this.socket) {
            return
        }
        this.detachSocketEvents()
        this.socket.terminate()
        this.socket = null
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