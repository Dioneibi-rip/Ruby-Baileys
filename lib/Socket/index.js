"use strict"

Object.defineProperty(exports, "__esModule", { value: true })

const { DEFAULT_CONNECTION_CONFIG } = require("../Defaults")
const { makeCommunitiesSocket } = require("./community")

const joinChannels = async(conn) => {
    for (const channelId of Object.values((global?.ch) || {})) {
        await conn.newsletterFollow(channelId).catch(() => {})
    }
}

// export the last socket layer
const makeWASocket = (config) => {
	const newConfig = {
    	...DEFAULT_CONNECTION_CONFIG,
   	 ...config
    }
    
    // If the user hasn't provided their own history sync function,
    // let's create a default one that respects the syncFullHistory flag.
    if (config.shouldSyncHistoryMessage === undefined) {
        newConfig.shouldSyncHistoryMessage = () => !!newConfig.syncFullHistory
    }

    const sock = makeCommunitiesSocket(newConfig)
    let reconnectAttempt = 0
    const getReconnectDelay = () => {
        const backoff = newConfig.reconnectBackoffMs || {}
        const initial = backoff.initial || 1000
        const max = backoff.max || 60000
        const factor = backoff.factor || 2
        const jitter = backoff.jitter ?? 0.2
        const base = Math.min(max, initial * Math.pow(factor, reconnectAttempt++))
        const spread = base * jitter
        return Math.round(base - spread + Math.random() * spread * 2)
    }
    sock.getReconnectDelay = getReconnectDelay
    sock.resetReconnectDelay = () => { reconnectAttempt = 0 }
    sock.ev.on('connection.update', ({ connection }) => {
        if (connection === 'open') {
            sock.resetReconnectDelay()
            joinChannels(sock).catch(() => {})
        }
    })

    return sock
}

exports.default = makeWASocket
