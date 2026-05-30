"use strict"

Object.defineProperty(exports, "__esModule", { value: true })

const { default: NodeCache } = require("@cacheable/node-cache")
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

    let sock
    if (config.cachedGroupMetadata === undefined && newConfig.enableGroupMetadataCache !== false) {
        const groupMetadataCache = new NodeCache({
            stdTTL: newConfig.groupMetadataCacheTtl || 5 * 60,
            checkperiod: Math.max(30, Math.floor((newConfig.groupMetadataCacheTtl || 5 * 60) / 2)),
            useClones: false,
            maxKeys: 5000
        })
        newConfig.cachedGroupMetadata = async jid => {
            const cached = groupMetadataCache.get(jid)
            if (cached) {
                return cached
            }
            if (!sock?.groupMetadata) {
                return undefined
            }
            const metadata = await sock.groupMetadata(jid)
            if (metadata) {
                groupMetadataCache.set(jid, metadata)
            }
            return metadata
        }
    }

    sock = makeCommunitiesSocket(newConfig)
    sock.ev.on('connection.update', ({ connection }) => {
        if (connection === 'open') {
            joinChannels(sock).catch(() => {})
        }
    })

    return sock
}

exports.default = makeWASocket
