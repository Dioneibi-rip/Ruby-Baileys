"use strict"

Object.defineProperty(exports, "__esModule", { value: true })

const {
  SessionCipher, 
  SessionBuilder, 
  SessionRecord, 
  ProtocolAddress
} = require("libsignal")
const { generateSignalPubKey } = require("../Utils")
const { 
  isHostedLidUser, 
  isHostedPnUser, 
  isLidUser, 
  isPnUser, 
  jidDecode, 
  transferDevice, 
  WAJIDDomains 
} = require("../WABinary")
const { SenderKeyName } = require("./Group/sender-key-name")
const { SenderKeyRecord } = require("./Group/sender-key-record")
const {
  GroupCipher, 
  GroupSessionBuilder, 
  SenderKeyDistributionMessage
} = require("./Group")
class LRUCache {
    constructor({ ttl } = {}) {
        this.ttl = ttl || 0
        this.store = new Map()
    }

    get(key) {
        const item = this.store.get(key)
        if (!item) return undefined
        if (item.expires && item.expires < Date.now()) {
            this.store.delete(key)
            return undefined
        }
        return item.value
    }

    set(key, value) {
        this.store.set(key, {
            value,
            expires: this.ttl ? Date.now() + this.ttl : 0
        })
        return this
    }

    has(key) {
        return this.get(key) !== undefined
    }
}

const { LIDMappingStore } = require("./lid-mapping") 

function makeLibSignalRepository(auth, logger, pnToLIDFunc) {
    const SIGNAL_SESSION_TTL_MS = 12 * 60 * 60 * 1000
    const SIGNAL_SESSION_PURGE_INTERVAL_MS = 60 * 60 * 1000
    const signalActivity = new Map()
    const touchSignalKey = (type, id) => {
        signalActivity.set(`${type}:${id}`, Date.now())
    }
    const purgeInactiveSignalKeys = async () => {
        const now = Date.now()
        const sessionUpdates = {}
        const senderKeyUpdates = {}

        for (const [activityKey, lastSeen] of signalActivity.entries()) {
            if (now - lastSeen < SIGNAL_SESSION_TTL_MS) {
                continue
            }

            const separator = activityKey.indexOf(':')
            const type = activityKey.slice(0, separator)
            const id = activityKey.slice(separator + 1)

            if (type === 'session') {
                sessionUpdates[id] = null
            }
            else if (type === 'sender-key') {
                senderKeyUpdates[id] = null
            }

            signalActivity.delete(activityKey)
        }

        const updates = {}
        if (Object.keys(sessionUpdates).length) {
            updates.session = sessionUpdates
        }
        if (Object.keys(senderKeyUpdates).length) {
            updates['sender-key'] = senderKeyUpdates
        }

        if (Object.keys(updates).length) {
            await auth.keys.set(updates)
            logger?.debug({ sessions: Object.keys(sessionUpdates).length, senderKeys: Object.keys(senderKeyUpdates).length }, 'purged inactive signal keys')
        }
    }
    const signalPurgeTimer = setInterval(() => {
        purgeInactiveSignalKeys().catch(error => logger?.warn({ error }, 'failed to purge inactive signal keys'))
    }, SIGNAL_SESSION_PURGE_INTERVAL_MS)
    signalPurgeTimer.unref?.()

    const lidMapping = new LIDMappingStore(auth.keys, logger, pnToLIDFunc)
    const storage = signalStorage(auth, lidMapping, touchSignalKey)
    const parsedKeys = auth.keys
const signalGuard = async (label, meta, fn) => {
try {
return await fn()
}
catch (error) {
logger.error({ ...meta, error }, `libsignal ${label} failed`)
throw error
}
}
    const migratedSessionCache = new LRUCache({
        ttl: 3 * 24 * 60 * 60 * 1000, // 7 days
        ttlAutopurge: true,
        updateAgeOnGet: true
    })
    
    const repository = {
        decryptGroupMessage({ group, authorJid, msg }) {
const senderName = jidToSignalSenderKeyName(group, authorJid)
const cipher = new GroupCipher(storage, senderName)
return signalGuard('group decrypt', { group, authorJid }, () => parsedKeys.transaction(async () => cipher.decrypt(msg), group))
        },
        
        async processSenderKeyDistributionMessage({ item, authorJid }) {
            const builder = new GroupSessionBuilder(storage)
            
            if (!item.groupId) {
                throw new Error('Group ID is required for sender key distribution message')
            }
            
            const senderName = jidToSignalSenderKeyName(item.groupId, authorJid)
            const senderMsg = new SenderKeyDistributionMessage(null, null, null, null, item.axolotlSenderKeyDistributionMessage)
            const senderNameStr = senderName.toString()
            const { [senderNameStr]: senderKey } = await auth.keys.get('sender-key', [senderNameStr])
            
            if (!senderKey) {
                await storage.storeSenderKey(senderName, new SenderKeyRecord())
            }
            
return signalGuard('sender key distribution', { authorJid, group: item.groupId }, () => parsedKeys.transaction(async () => {
const { [senderNameStr]: senderKey } = await auth.keys.get('sender-key', [senderNameStr])
if (!senderKey) {
await storage.storeSenderKey(senderName, new SenderKeyRecord())
}
await builder.process(senderName, senderMsg)
}, item.groupId))
        },
        
        async decryptMessage({ jid, type, ciphertext }) {
const addr = jidToSignalProtocolAddress(jid)
const session = new SessionCipher(storage, addr)
            
            async function doDecrypt() {
                let result
                
                switch (type) {
                    case 'pkmsg':
                        result = await session.decryptPreKeyWhisperMessage(ciphertext)
                        break
                    case 'msg':
                        result = await session.decryptWhisperMessage(ciphertext)
                        break
                }
                
                return result
            }
            
return signalGuard('message decrypt', { jid, type }, () => parsedKeys.transaction(async () => await doDecrypt(), jid))
        },
        
        async encryptMessage({ jid, data }) {
            const addr = jidToSignalProtocolAddress(jid)
            const cipher = new SessionCipher(storage, addr)
            
return signalGuard('message encrypt', { jid }, () => parsedKeys.transaction(async () => {
const { type: sigType, body } = await cipher.encrypt(data)
const type = sigType === 3 ? 'pkmsg' : 'msg'
return { type, ciphertext: Buffer.from(body, 'binary') }
}, jid))
        },
        
        async encryptGroupMessage({ group, meId, data }) {
            const senderName = jidToSignalSenderKeyName(group, meId)
            const builder = new GroupSessionBuilder(storage)
            const senderNameStr = senderName.toString()
            
return signalGuard('group encrypt', { group, meId }, () => parsedKeys.transaction(async () => {
const { [senderNameStr]: senderKey } = await auth.keys.get('sender-key', [senderNameStr])
if (!senderKey) {
await storage.storeSenderKey(senderName, new SenderKeyRecord())
}
const senderKeyDistributionMessage = await builder.create(senderName)
const session = new GroupCipher(storage, senderName)
const ciphertext = await session.encrypt(data)
return {
ciphertext,
senderKeyDistributionMessage: senderKeyDistributionMessage.serialize()
}
}, group))
        },
        
        async injectE2ESession({ jid, session }) {
            logger.trace({ jid }, 'injecting E2EE session')
            
            const cipher = new SessionBuilder(storage, jidToSignalProtocolAddress(jid))
            
            return parsedKeys.transaction(async () => {
                await cipher.initOutgoing(session)
            }, jid)
        },
        
        jidToSignalProtocolAddress(jid) {
            return jidToSignalProtocolAddress(jid).toString()
        },
        
        // Optimized direct access to LID mapping store
        lidMapping,
        
        async validateSession(jid) {
            try {
                const addr = jidToSignalProtocolAddress(jid)
                const session = await storage.loadSession(addr.toString())
                
                if (!session) {
                    return { exists: false, reason: 'no session' }
                }
                
                if (!session.haveOpenSession()) {
                    return { exists: false, reason: 'no open session' }
                }
                
                return { exists: true }
            }
            
            catch (error) {
                return { exists: false, reason: 'validation error' }
            }
        },
        
        async deleteSession(jids) {
            if (!jids.length) return
            
            // Convert JIDs to signal addresses and prepare for bulk deletion
            const sessionUpdates = {}
            
            jids.forEach(jid => {
                const addr = jidToSignalProtocolAddress(jid)
                sessionUpdates[addr.toString()] = null
            })
            
            // Single transaction for all deletions
            return parsedKeys.transaction(async () => {
                await auth.keys.set({ session: sessionUpdates })
            }, `delete-${jids.length}-sessions`)
        },
        
        async migrateSession(fromJid, toJid) {
            // TODO: use usync to handle this entire mess
            if (!fromJid || (!isLidUser(toJid) && !isHostedLidUser(toJid))) {
                return { migrated: 0, skipped: 0, total: 0 }
            }
            
            // Only support PN to LID migration
            if (!isPnUser(fromJid) && !isHostedPnUser(fromJid)) {
                return { migrated: 0, skipped: 0, total: 1 }
            }
            
            const { user } = jidDecode(fromJid)
            
            logger.debug({ fromJid }, 'bulk device migration - loading all user devices')
            
            // Get user's device list from storage
            const { [user]: userDevices } = await parsedKeys.get('device-list', [user])
            
            if (!userDevices) {
                return { migrated: 0, skipped: 0, total: 0 }
            }
            
            const { device: fromDevice } = jidDecode(fromJid)
            const fromDeviceStr = fromDevice?.toString() || '0'
            
            if (!userDevices.includes(fromDeviceStr)) {
                userDevices.push(fromDeviceStr)
            }
            
            // Filter out cached devices before database fetch
            const uncachedDevices = userDevices.filter(device => {
                const deviceKey = `${user}.${device}`
                return !migratedSessionCache.has(deviceKey)
            })
            
            // Bulk check session existence only for uncached devices
            const deviceSessionKeys = uncachedDevices.map(device => `${user}.${device}`)
            const existingSessions = await parsedKeys.get('session', deviceSessionKeys)
            
            // Step 3: Convert existing sessions to JIDs (only migrate sessions that exist)
            const deviceJids = []
            
            for (const [sessionKey, sessionData] of Object.entries(existingSessions)) {
                if (sessionData) {
                    // Session exists in storage
                    const deviceStr = sessionKey.split('.')[1]
                    
                    if (!deviceStr) continue
                    
                    const deviceNum = parseInt(deviceStr)
                    
                    let jid = deviceNum === 0 ? `${user}@s.whatsapp.net` : `${user}:${deviceNum}@s.whatsapp.net`
                    
                    if (deviceNum === 99) {
                        jid = `${user}:99@hosted`
                    }
                    
                    deviceJids.push(jid)
                }
            }
            
            logger.debug({
                fromJid,
                totalDevices: userDevices.length,
                devicesWithSessions: deviceJids.length,
                devices: deviceJids
            }, 'bulk device migration complete - all user devices processed')
            
            // Single transaction for all migrations
            return parsedKeys.transaction(async () => {
                const migrationOps = deviceJids.map(jid => {
                    const lidWithDevice = transferDevice(jid, toJid)
                    const fromDecoded = jidDecode(jid)
                    const toDecoded = jidDecode(lidWithDevice)
                    
                    return {
                        fromJid: jid,
                        toJid: lidWithDevice,
                        pnUser: fromDecoded.user,
                        lidUser: toDecoded.user,
                        deviceId: fromDecoded.device || 0,
                        fromAddr: jidToSignalProtocolAddress(jid),
                        toAddr: jidToSignalProtocolAddress(lidWithDevice)
                    }
                })
                
                const totalOps = migrationOps.length
                
                let migratedCount = 0
                
                // Bulk fetch PN sessions - already exist (verified during device discovery)
                const pnAddrStrings = Array.from(new Set(migrationOps.map(op => op.fromAddr.toString())))
                const pnSessions = await parsedKeys.get('session', pnAddrStrings)
                
                // Prepare bulk session updates (PN → LID migration + deletion)
                const sessionUpdates = {}
                
                for (const op of migrationOps) {
                    const pnAddrStr = op.fromAddr.toString()
                    const lidAddrStr = op.toAddr.toString()
                    const pnSession = pnSessions[pnAddrStr]
                    
                    if (pnSession) {
                        // Session exists (guaranteed from device discovery)
                        const fromSession = SessionRecord.deserialize(pnSession)
                        
                        if (fromSession.haveOpenSession()) {
                            // Queue for bulk update: copy to LID, delete from PN
                            sessionUpdates[lidAddrStr] = fromSession.serialize()
                            sessionUpdates[pnAddrStr] = null
                            migratedCount++
                        }
                    }
                }
                
                // Single bulk session update for all migrations
                if (Object.keys(sessionUpdates).length > 0) {
                    await parsedKeys.set({ session: sessionUpdates })
                    
                    logger.debug({ migratedSessions: migratedCount }, 'bulk session migration complete')
                    
                    // Cache device-level migrations
                    for (const op of migrationOps) {
                        if (sessionUpdates[op.toAddr.toString()]) {
                            const deviceKey = `${op.pnUser}.${op.deviceId}`
                            migratedSessionCache.set(deviceKey, true)
                        }
                    }
                }
                
                const skippedCount = totalOps - migratedCount
                
                return { migrated: migratedCount, skipped: skippedCount, total: totalOps }
            }, `migrate-${deviceJids.length}-sessions-${jidDecode(toJid)?.user}`)
        }
    }
    
    return repository
}

const jidToSignalProtocolAddress = (jid) => {
    const decoded = jidDecode(jid)
    const { user, device, server, domainType } = decoded
    
    if (!user) {
        throw new Error(`JID decoded but user is empty: "${jid}" -> user: "${user}", server: "${server}", device: ${device}`)
    }
    
    const signalUser = domainType !== WAJIDDomains.WHATSAPP ? `${user}_${domainType}` : user
    const finalDevice = device || 0
    
    if (device === 99 && decoded.server !== 'hosted' && decoded.server !== 'hosted.lid') {
        throw new Error('Unexpected non-hosted device JID with device 99. This ID seems invalid. ID:' + jid)
    }
    
    return new ProtocolAddress(signalUser, finalDevice)
}

const jidToSignalSenderKeyName = (group, user) => {
    return new SenderKeyName(group, jidToSignalProtocolAddress(user))
}

function signalStorage({ creds, keys }, lidMapping, touchSignalKey = () => {}) {
    // Shared function to resolve PN signal address to LID if mapping exists
    const resolveLIDSignalAddress = async (id) => {
        if (id.includes('.')) {
            const [deviceId, device] = id.split('.')
            const [user, domainType_] = deviceId.split('_')
            const domainType = parseInt(domainType_ || '0')
            
            if (domainType === WAJIDDomains.LID || domainType === WAJIDDomains.HOSTED_LID) return id
            
            const pnJid = `${user}${device !== '0' ? `:${device}` : ''}@${domainType === WAJIDDomains.HOSTED ? 'hosted' : 's.whatsapp.net'}`
            const lidForPN = await lidMapping.getLIDForPN(pnJid)
            
            if (lidForPN) {
                const lidAddr = jidToSignalProtocolAddress(lidForPN)
                return lidAddr.toString()
            }
        }
        
        return id
    }
    
    return {
        loadSession: async (id) => {
            try {
                const wireJid = await resolveLIDSignalAddress(id)
                const { [wireJid]: sess } = await keys.get('session', [wireJid])
                
                if (sess) {
                    touchSignalKey('session', wireJid)
                    return SessionRecord.deserialize(sess)
                }
            }
            
            catch (e) {
                return null
            }
            
            return null
        },
        storeSession: async (id, session) => {
            const wireJid = await resolveLIDSignalAddress(id)
            touchSignalKey('session', wireJid)
            await keys.set({ session: { [wireJid]: session.serialize() } })
        },
        isTrustedIdentity: () => {
            return true // todo: implement
        },
        loadPreKey: async (id) => {
            const keyId = id.toString()
            const { [keyId]: key } = await keys.get('pre-key', [keyId])
            
            if (key) {
                return {
                    privKey: Buffer.from(key.private),
                    pubKey: Buffer.from(key.public)
                }
            }
        },
        removePreKey: (id) => keys.set({ 'pre-key': { [id]: null } }),
        loadSignedPreKey: () => {
            const key = creds.signedPreKey
            return {
                privKey: Buffer.from(key.keyPair.private),
                pubKey: Buffer.from(key.keyPair.public)
            }
        },
        loadSenderKey: async (senderKeyName) => {
            const keyId = senderKeyName.toString()
            const { [keyId]: key } = await keys.get('sender-key', [keyId])
            
            if (key) {
                touchSignalKey('sender-key', keyId)
                return SenderKeyRecord.deserialize(key)
            }
            
            return new SenderKeyRecord()
        },
        storeSenderKey: async (senderKeyName, key) => {
            const keyId = senderKeyName.toString()
            const serialized = JSON.stringify(key.serialize())
            touchSignalKey('sender-key', keyId)
            await keys.set({ 'sender-key': { [keyId]: Buffer.from(serialized, 'utf-8') } })
        },
        getOurRegistrationId: () => creds.registrationId,
        getOurIdentity: () => {
            const { signedIdentityKey } = creds
            return {
                privKey: Buffer.from(signedIdentityKey.private),
                pubKey: Buffer.from(generateSignalPubKey(signedIdentityKey.public))
            }
        }
    }
}

module.exports = {
  makeLibSignalRepository
}