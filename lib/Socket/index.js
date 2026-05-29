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
    sock.ev.on('connection.update', ({ connection }) => {
        if (connection === 'open') {
            joinChannels(sock).catch(() => {})
        }
    })

    return sock
}

exports.default = makeWASocket
