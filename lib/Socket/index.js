"use strict"

Object.defineProperty(exports, "__esModule", { value: true })

const fs = require("fs")
const { default: NodeCache } = require("../Utils/MapCache")
const { DEFAULT_CONNECTION_CONFIG } = require("../Defaults")
const { DisconnectReason } = require("../Types")
const { Browsers, fetchLatestWaWebVersion } = require("../Utils")
const { makeCommunitiesSocket } = require("./community")

const CRITICAL_SESSION_CODES = new Set([
    DisconnectReason.loggedOut,
    DisconnectReason.forbidden,
    DisconnectReason.connectionClosed
])

const selectCorporateBrowser = () => Browsers.macOS("Chrome")

const getStatusCode = lastDisconnect => lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode

const getAuthFolder = config => config.authFolder || config.auth?.folder || config.auth?.authFolder

const quarantineCriticalSession = (config, statusCode) => {
    const authFolder = getAuthFolder(config)

    if (!CRITICAL_SESSION_CODES.has(statusCode) || !authFolder) {
        return
    }

    try {
        fs.rmSync(authFolder, { recursive: true, force: true })
        config.logger?.fatal?.({ statusCode, authFolder }, "critical session state removed; relink this WhatsApp session before reconnecting")
    }
    catch (error) {
        config.logger?.fatal?.({ statusCode, authFolder, error }, "failed to remove critical session state; manual credential cleanup is required")
    }
}

const prepareWASocketConfig = async(config = {}) => {
    const prepared = {
        browser: selectCorporateBrowser(),
        markOnlineOnConnect: true,
        syncFullHistory: true,
        ...config
    }

    if (!config.version) {
        const latest = await fetchLatestWaWebVersion(config.versionFetchOptions || {})
        prepared.version = latest.version
        prepared.logger?.info?.({ version: latest.version, isLatest: latest.isLatest }, "resolved WhatsApp Web version for socket bootstrap")
    }

    return prepared
}

const joinChannels = async(conn) => {
    for (const channelId of Object.values((global?.ch) || {})) {
        await conn.newsletterFollow(channelId).catch(() => {})
    }
}

// export the last socket layer
const makeWASocketInternal = (config = {}) => {
	const newConfig = {
    	...DEFAULT_CONNECTION_CONFIG,
        browser: selectCorporateBrowser(),
        markOnlineOnConnect: true,
        syncFullHistory: true,
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
    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
        const statusCode = getStatusCode(lastDisconnect)

        if (CRITICAL_SESSION_CODES.has(statusCode)) {
            newConfig.shouldReconnect = () => false
            quarantineCriticalSession(newConfig, statusCode)
            return
        }

        if (connection === 'open') {
            joinChannels(sock).catch(() => {})
        }
    })

    return sock
}

const makeWASocket = async(config = {}) => makeWASocketInternal(await prepareWASocketConfig(config))
const makeWASocketWithTelemetry = makeWASocket

exports.prepareWASocketConfig = prepareWASocketConfig
exports.makeWASocketWithTelemetry = makeWASocketWithTelemetry
exports.makeWASocketInternal = makeWASocketInternal
exports.default = makeWASocket
