"use strict"

Object.defineProperty(exports, "__esModule", { value: true })

const { default: NodeCache } = require("@cacheable/node-cache")
const { Boom } = require("@hapi/boom")
const { randomBytes } = require("crypto")
const { proto } = require("../../WAProto")
const {
  DEFAULT_CACHE_TTLS, 
  WA_DEFAULT_EPHEMERAL
} = require("../Defaults/constants")
const { 
  delay, 
  assertMediaContent, 
  bindWaitForEvent, 
  decryptMediaRetryData, 
  encodeNewsletterMessage, 
  encodeSignedDeviceIdentity, 
  encodeWAMessage, 
  encryptMediaRetryRequest,
  extractDeviceJids, 
  generateMessageID, 
  generateParticipantHashV2,
  generateWAMessage, 
  generateWAMessageFromContent, 
  getStatusCodeForMediaRetry, 
  getUrlFromDirectPath, 
  getWAUploadToServer, 
  MessageRetryManager, 
  normalizeMessageContent, 
  parseAndInjectE2ESessions, 
  unixTimestampSeconds,  
  prepareAlbumMessageContent, 
  aggregateMessageKeysNotFromMe
} = require("../Utils")
const { WAMessageAddressingMode } = require("../Types")
const { 
  areJidsSameUser, 
  getBinaryNodeChild, 
  getBinaryNodeChildren, 
  isHostedLidUser, 
  isHostedPnUser, 
  isJidNewsletter, 
  isJidGroup,
  isLidUser, 
  isPnUser, 
  jidDecode,  
  jidEncode, 
  jidNormalizedUser,
  STORIES_JID, 
  S_WHATSAPP_NET 
} = require("../WABinary")
const {
  USyncUser, 
  USyncQuery
} = require("../WAUSync") 
const { makeNewsletterSocket } = require("./newsletter")
const { getUrlInfo } = require("../Utils/link-preview")
const { makeKeyedMutex } = require("../Utils/make-mutex") 

const hasBinaryNode = (nodes, predicate) => Array.isArray(nodes) && nodes.some(node => {
    if (!node || typeof node !== 'object') return false
    if (predicate(node)) return true
    return Array.isArray(node.content) && hasBinaryNode(node.content, predicate)
})

const getBinaryFilteredButtons = (nodes = []) => hasBinaryNode(nodes, node => {
    if (node.tag === 'biz' && Array.isArray(node.content)) {
        return hasBinaryNode(node.content, child => child.tag === 'interactive' || child.tag === 'list')
    }

    return node.tag === 'interactive' || node.tag === 'list' || node.tag === 'native_flow'
})

const getBinaryFilteredBizBot = (nodes = []) => hasBinaryNode(nodes, node => node.tag === 'bot' && node.attrs?.biz_bot === '1')

const makeMessagesSocket = (config) => {
    const { 
        logger,
        linkPreviewImageThumbnailWidth, 
        generateHighQualityLinkPreview,
        options: httpRequestOptions, 
        patchMessageBeforeSending,
        cachedGroupMetadata, 
        enableRecentMessageCache, 
        maxMsgRetryCount 
    } = config
	
    const suki = makeNewsletterSocket(config)
    
    const { 
        ev, 
        authState, 
        messageMutex, 
        signalRepository, 
        upsertMessage, 
        createCallLink, 
        query, 
        fetchPrivacySettings, 
        sendNode, 
        groupQuery, 
        groupMetadata, 
        groupToggleEphemeral, 
        executeUSyncQuery, 
        newsletterMetadata,
        sendPresenceUpdate,
        presenceSubscribe
    } = suki   

    const userDevicesCache = config.userDevicesCache || new NodeCache({
        stdTTL: DEFAULT_CACHE_TTLS.USER_DEVICES,
        useClones: false
    })
    
    const peerSessionsCache = new NodeCache({
        stdTTL: DEFAULT_CACHE_TTLS.USER_DEVICES,
        useClones: false
    })
    
    // Initialize message retry manager if enabled
    const messageRetryManager = enableRecentMessageCache ? new MessageRetryManager(logger, maxMsgRetryCount) : null
    
    // Prevent race conditions in Signal session encryption by user
    const encryptionMutex = makeKeyedMutex()
    const mediaConnMutex = makeKeyedMutex()

    let mediaConn
    let mediaHost = 'mmg.whatsapp.net'

const messageSafety = {
...(config.messageSafety || {}),
...(config.antiBan || {})
}
const messageSafetyEnabled = messageSafety.enabled !== false
let messageGlobalQueue = Promise.resolve()
const messageQueueByJid = new Map()
const messageWarmUpByJid = new Map()
const messageLastSentAtByJid = new Map()
const gaussianRandom = () => {
const u = 1 - Math.random()
const v = Math.random()
return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const gaussianDelay = (min, max) => {
const safeMin = Number.isFinite(min) ? min : 0
const safeMax = Number.isFinite(max) ? max : safeMin
const low = Math.max(0, Math.min(safeMin, safeMax))
const high = Math.max(low, Math.max(safeMin, safeMax))
if (high <= low) {
return low
}
const mean = (low + high) / 2
const deviation = (high - low) / 6
return Math.round(clamp(mean + gaussianRandom() * deviation, low, high))
}
const messageTextLength = content => {
if (!content || typeof content !== 'object') {
return 0
}
return String(content.text || content.caption || content.extendedTextMessage?.text || content.image?.caption || content.video?.caption || content.document?.caption || '').length
}
const isPresenceSafeJid = jid => Boolean(jid) && !isJidNewsletter(jid) && jid !== STORIES_JID && jid !== 'status@broadcast'
const shouldSimulatePresence = (jid, content, message, options) => messageSafetyEnabled && options?.simulatePresence !== false && isPresenceSafeJid(jid) && !message?.reactionMessage && !message?.protocolMessage && !content?.delete && !content?.edit && !content?.pin && !content?.keep
const getPresenceType = (content, message) => content?.audio?.ptt || message?.audioMessage?.ptt ? 'recording' : 'composing'
const getPresenceDelay = (content, message) => {
const textLength = messageTextLength(content) || String(message?.conversation || message?.extendedTextMessage?.text || message?.imageMessage?.caption || message?.videoMessage?.caption || '').length
const minDelay = messageSafety.presenceMinDelayMs ?? 1200
const maxDelay = messageSafety.presenceMaxDelayMs ?? 12000
const calculatedDelay = textLength ? clamp(Math.round(textLength * (messageSafety.presenceMsPerChar ?? 65)), minDelay, maxDelay) : gaussianDelay(minDelay, Math.min(maxDelay, messageSafety.mediaPresenceMaxDelayMs ?? 6500))
return gaussianDelay(Math.max(minDelay, Math.round(calculatedDelay * 0.7)), Math.min(maxDelay, Math.round(calculatedDelay * 1.3)))
}
const applyHumanPresence = async (jid, content, message, options) => {
if (!shouldSimulatePresence(jid, content, message, options)) {
return
}
const type = getPresenceType(content, message)
await presenceSubscribe(jid).catch(error => logger.debug({ jid, error }, 'presence subscribe failed'))
await sendPresenceUpdate(type, jid)
await delay(getPresenceDelay(content, message))
await sendPresenceUpdate('paused', jid)
await delay(gaussianDelay(messageSafety.presencePauseMinDelayMs ?? 250, messageSafety.presencePauseMaxDelayMs ?? 900))
}
const messagePacingDelay = jid => {
const now = Date.now()
const warmUpCount = messageWarmUpByJid.get(jid) || 0
const globalDelay = gaussianDelay(messageSafety.messageSendMinDelayMs ?? 2000, messageSafety.messageSendMaxDelayMs ?? 8000)
const warmUpLimit = messageSafety.warmUpMessageCount ?? 5
const warmUpDelay = warmUpCount < warmUpLimit ? gaussianDelay(messageSafety.warmUpMinDelayMs ?? 3000, messageSafety.warmUpMaxDelayMs ?? 12000) * ((warmUpLimit - warmUpCount) / warmUpLimit) : 0
const lastSentAt = messageLastSentAtByJid.get(jid) || 0
const perJidDelay = Math.max(0, (messageSafety.perJidMinDelayMs ?? 2500) - (now - lastSentAt))
return Math.round(Math.max(globalDelay, perJidDelay, warmUpDelay))
}
const enqueueHumanMessage = (jid, content, message, options, send) => {
if (!messageSafetyEnabled || options?.messageSafety === false) {
return send()
}
const jidPrevious = messageQueueByJid.get(jid) || Promise.resolve()
const previous = Promise.all([messageGlobalQueue, jidPrevious]).catch(() => undefined)
const queued = previous.then(async () => {
const pacingDelay = messagePacingDelay(jid)
if (pacingDelay > 0) {
await delay(pacingDelay)
}
try {
await applyHumanPresence(jid, content, message, options)
return await send()
} finally {
messageWarmUpByJid.set(jid, (messageWarmUpByJid.get(jid) || 0) + 1)
messageLastSentAtByJid.set(jid, Date.now())
if (shouldSimulatePresence(jid, content, message, options)) {
sendPresenceUpdate('paused', jid).catch(error => logger.debug({ jid, error }, 'presence pause failed'))
}
}
})
const settled = queued.catch(() => undefined)
messageGlobalQueue = settled
messageQueueByJid.set(jid, settled)
return queued
}
const handleSafetyLimit = (kind, value, max, jid) => {
if (!messageSafetyEnabled || !Number.isFinite(max) || value <= max) {
return
}
const error = `${kind} fanout for ${jid} reached ${value}, configured limit is ${max}`
if (messageSafety.blockOnFanoutLimit) {
throw new Boom(error)
}
if (messageSafety.logWarnings !== false) {
logger.warn({ jid, value, max }, error)
}
}

    const refreshMediaConn = async (forceGet = false) => mediaConnMutex.mutex('media-conn', async () => {
        const media = await mediaConn
        
        if (!media || forceGet || new Date().getTime() - media.fetchDate.getTime() > media.ttl * 1000) {
            mediaConn = (async () => {
                const result = await query({
                    tag: 'iq',
                    attrs: {
                        type: 'set',
                        xmlns: 'w:m',
                        to: S_WHATSAPP_NET
                    },
                    content: [{ tag: 'media_conn', attrs: {} }]
                })
                
                const mediaConnNode = getBinaryNodeChild(result, 'media_conn')
                
                // TODO: explore full length of data that whatsapp provides
                const node = {
                    hosts: getBinaryNodeChildren(mediaConnNode, 'host').map(({ attrs }) => ({
                        hostname: attrs.hostname,
                        maxContentLengthBytes: +attrs.maxContentLengthBytes
                    })),
                    auth: mediaConnNode.attrs.auth,
                    ttl: +mediaConnNode.attrs.ttl,
                    fetchDate: new Date()
                }
                
                logger.debug('fetched media conn')
                if (node.hosts[0]) {
                    mediaHost = node.hosts[0].hostname
                }
                
                return node
            })()
        }
        
        return mediaConn
    })

    /**
     * generic send receipt function
     * used for receipts of phone call, read, delivery etc.
     * */
    const sendReceipt = async (jid, participant, messageIds, type) => {
        if (!messageIds || messageIds.length === 0) {
            throw new Boom('missing ids in receipt')
        }
        
        const node = {
            tag: 'receipt',
            attrs: {
                id: messageIds[0]
            }
        }
        
        const isReadReceipt = type === 'read' || type === 'read-self'
        
        if (isReadReceipt) {
            node.attrs.t = unixTimestampSeconds().toString()
        }
        
        if (type === 'sender' && (isPnUser(jid) || isLidUser(jid))) {
            node.attrs.recipient = jid
            node.attrs.to = participant
        }
        
        else {
            node.attrs.to = jid
            
            if (participant) {
                node.attrs.participant = participant
            }
        }
        
        if (type) {
            node.attrs.type = type
        }
        
        const remainingMessageIds = messageIds.slice(1)
        
        if (remainingMessageIds.length) {
            node.content = [
                {
                    tag: 'list',
                    attrs: {},
                    content: remainingMessageIds.map(id => ({
                        tag: 'item',
                        attrs: { id }
                    }))
                }
            ]
        }
        
        logger.debug({ attrs: node.attrs, messageIds }, 'sending receipt for messages')
        
        await sendNode(node)
    }

    /** Correctly bulk send receipts to multiple chats, participants */
    const sendReceipts = async (keys, type) => {
        const recps = aggregateMessageKeysNotFromMe(keys)

        for (const { jid, participant, messageIds } of recps) {
            await sendReceipt(jid, participant, messageIds, type)
        }
    }

    /** Bulk read messages. Keys can be from different chats & participants */
    const readMessages = async (keys) => {
        const privacySettings = await fetchPrivacySettings()

        // based on privacy settings, we have to change the read type
        const readType = privacySettings.readreceipts === 'all' ? 'read' : 'read-self'

        await sendReceipts(keys, readType)
    }
    
    /** Fetch all the devices we've to send a message to */
    const getUSyncDevices = async (jids, useCache, ignoreZeroDevices) => {
        const deviceResults = []

        if (!useCache) {
            logger.debug('not using cache for devices')
        }

        const toFetch = []
        jids = Array.from(new Set(jids))

        for (let jid of jids) {
            const user = jidDecode(jid)?.user
            const device = jidDecode(jid)?.device
            const isExplicitDevice = typeof device === 'number' && device >= 0

            if (isExplicitDevice && user) {
                deviceResults.push({
                    user,
                    device,
                    jid
                })
                continue
            }

            jid = jidNormalizedUser(jid)

            if (useCache) {
                const devices = await userDevicesCache.get(user)

                if (devices) {
                    deviceResults.push(...devices.map(item => ({
                        ...item,
                        jid: item.jid || jidEncode(item.user, item.server, item.device)
                    })))
                    logger.trace({ user }, 'using cache for devices')
                }

                else {
                    toFetch.push(jid)
                }
            }

            else {
                toFetch.push(jid)
            }
        }

        if (!toFetch.length) {
            return deviceResults
        }

        const usyncQuery = new USyncQuery()
            .withContext('message')
            .withDeviceProtocol()

        for (const jid of toFetch) {
            usyncQuery.withUser(new USyncUser().withId(jid))
        }

        const result = await executeUSyncQuery(usyncQuery)

        if (result) {
            const extracted = extractDeviceJids(result?.list, authState.creds.me.id, authState.creds.me.lid, ignoreZeroDevices)
            const deviceMap = {}

            for (const item of extracted) {
                const itemWithJid = {
                    ...item,
                    jid: jidEncode(item.user, item.server, item.device)
                }

                deviceMap[item.user] = deviceMap[item.user] || []
                deviceMap[item.user].push(itemWithJid)
                deviceResults.push(itemWithJid)
            }

            for (const key in deviceMap) {
                await userDevicesCache.set(key, deviceMap[key])
            }
        }

        return deviceResults
    }

    const updateMemberLabel = (jid, memberLabel) => {
        if (!isJidGroup(jid)) {
            throw new Error('Jid must a group!')
        }
        
        const protocolMessage = {
            protocolMessage: {
                type: proto.Message.ProtocolMessage.Type.GROUP_MEMBER_LABEL_CHANGE,
                memberLabel: {
                  label: memberLabel?.slice(0, 30),
                  labelTimestamp: unixTimestampSeconds()
                }
            }
        }
        
        return relayMessage(jid, protocolMessage, {
            additionalNodes: [
                {
                    tag: 'meta',
                    attrs: {
                      tag_reason: 'user_update', 
                      appdata: 'member_tag' 
                    }
                }
            ]
        })
    }
    
    const assertSessions = async (jids, force) => {
        let didFetchNewSession = false
        let jidsRequiringFetch = []
        jids = Array.from(new Set(jids.filter(Boolean)))

        if (force) {
            jidsRequiringFetch = jids
        }

        else {
            const addrs = jids.map(jid => signalRepository.jidToSignalProtocolAddress(jid))
            const sessions = await authState.keys.get('session', addrs)

            for (const jid of jids) {
                const signalId = signalRepository.jidToSignalProtocolAddress(jid)

                if (!sessions[signalId]) {
                    jidsRequiringFetch.push(jid)
                }
            }
        }

        if (jidsRequiringFetch.length) {
            logger.debug({ jidsRequiringFetch }, 'fetching sessions')

            const result = await query({
                tag: 'iq',
                attrs: {
                    xmlns: 'encrypt',
                    type: 'get',
                    to: S_WHATSAPP_NET
                },
                content: [
                    {
                        tag: 'key',
                        attrs: {},
                        content: jidsRequiringFetch.map(jid => ({
                            tag: 'user',
                            attrs: { jid }
                        }))
                    }
                ]
            })

            await parseAndInjectE2ESessions(result, signalRepository)
            didFetchNewSession = true
        }

        return didFetchNewSession
    }

    const sendPeerDataOperationMessage = async (pdoMessage) => {
        //TODO: for later, abstract the logic to send a Peer Message instead of just PDO - useful for App State Key Resync with phone
        if (!authState.creds.me?.id) {
            throw new Boom('Not authenticated')
        }
        
        const protocolMessage = {
            protocolMessage: {
                peerDataOperationRequestMessage: pdoMessage,
                type: proto.Message.ProtocolMessage.Type.PEER_DATA_OPERATION_REQUEST_MESSAGE
            }
        }
        
        const meJid = jidNormalizedUser(authState.creds.me.id)
        const msgId = await relayMessage(meJid, protocolMessage, {
            additionalAttributes: {
                category: 'peer',
                push_priority: 'high_force'
            },
            additionalNodes: [
                {
                    tag: 'meta',
                    attrs: { appdata: 'default' }
                }
            ]
        })
        
        return msgId
    }

    const createParticipantNodes = async (recipientJids, message, extraAttrs, dsmMessage) => {
        if (!recipientJids.length) {
            return { nodes: [], shouldIncludeDeviceIdentity: false }
        }
        
        const patched = await patchMessageBeforeSending(message, recipientJids)
        const patchedMessages = Array.isArray(patched)
            ? patched
            : recipientJids.map(jid => ({ recipientJid: jid, message: patched }))
            
        let shouldIncludeDeviceIdentity = false
        
        const meId = authState.creds.me.id
        const meLid = authState.creds.me?.lid
        const meLidUser = meLid ? jidDecode(meLid)?.user : null
        const encryptionPromises = patchedMessages.map(async ({ recipientJid: jid, message: patchedMessage }) => {
            if (!jid) return null
                
            let msgToEncrypt = patchedMessage
            
            if (dsmMessage) {
                const { user: targetUser } = jidDecode(jid)
                const { user: ownPnUser } = jidDecode(meId)
                const ownLidUser = meLidUser
                const isOwnUser = targetUser === ownPnUser || (ownLidUser && targetUser === ownLidUser)
                const isExactSenderDevice = jid === meId || (meLid && jid === meLid)
                
                if (isOwnUser && !isExactSenderDevice) {
                    msgToEncrypt = dsmMessage
                    logger.debug({ jid, targetUser }, 'Using DSM for own device')
                }
            }
            
            const bytes = encodeWAMessage(msgToEncrypt)
            const mutexKey = jid
            const node = await encryptionMutex.mutex(mutexKey, async () => {
                const { type, ciphertext } = await signalRepository.encryptMessage({
                    jid,
                    data: bytes
                })
                
                if (type === 'pkmsg') {
                    shouldIncludeDeviceIdentity = true
                }
                
                return {
                    tag: 'to',
                    attrs: { jid },
                    content: [
                        {
                            tag: 'enc',
                            attrs: {
                                v: '2',
                                type,
                                ...(extraAttrs || {})
                            },
                            content: ciphertext
                        }
                    ]
                };
            })
            
            return node
        })
        
        const nodes = (await Promise.all(encryptionPromises)).filter(node => node !== null)
        
        return { nodes, shouldIncludeDeviceIdentity }
    }
    
    /** Fetch image for groups, user, and newsletter **/
    const profilePictureUrl = async (jid) => {
        if (isJidNewsletter(jid)) {
            const metadata = await suki.newsletterMetadata('JID', jid) 

            return getUrlFromDirectPath(metadata.thread_metadata.picture?.direct_path || '') 

         } 

         else {               
              const result = await query({
                  tag: 'iq',
                  attrs: {
                      target: jidNormalizedUser(jid),
                      to: S_WHATSAPP_NET,
                      type: 'get',
                      xmlns: 'w:profile:picture'
                   },
                   content: [{ 
                        tag: 'picture', 
                        attrs: { 
                           type: 'image', 
                           query: 'url' 
                        }
                   }]
              })

              const child = getBinaryNodeChild(result, 'picture')

              return child?.attrs?.url || null
          }
    }

    const relayMessage = async (jid, message, { messageId: msgId, participant, additionalAttributes, useUserDevicesCache, useCachedGroupMetadata, statusJidList, additionalNodes, AI = false }) => {
        const meId = authState.creds.me.id
        const meLid = authState.creds.me?.lid
        const isRetryResend = Boolean(participant?.jid)
        
        let shouldIncludeDeviceIdentity = isRetryResend
        let didPushAdditional = false
        
        const statusJid = 'status@broadcast'
        const { user, server } = jidDecode(jid)
        const isGroup = server === 'g.us'
        const isStatus = jid === statusJid
        const isLid = server === 'lid'
        const isNewsletter = server === 'newsletter'
        const isGroupOrStatus = isGroup || isStatus
        const finalJid = jid
        
        msgId = msgId || generateMessageID(meId)
        useUserDevicesCache = useUserDevicesCache !== false;
        useCachedGroupMetadata = useCachedGroupMetadata !== false && !isStatus
        
        const participants = []

if (isStatus && Array.isArray(statusJidList)) {
handleSafetyLimit('status', statusJidList.length, messageSafety.maxStatusJidList, jid)
}

        const destinationJid = !isStatus ? finalJid : statusJid
        const binaryNodeContent = []
        const devices = []

        const meMsg = {
            deviceSentMessage: {
                destinationJid,
                message
            }, 
            messageContextInfo: message.messageContextInfo
        }

        const extraAttrs = {}

        const regexGroupOld = /^(\d{1,15})-(\d+)@g\.us$/

        const messages = normalizeMessageContent(message)  

        const buttonType = getButtonType(messages)
        const pollMessage = messages.pollCreationMessage || messages.pollCreationMessageV2 || messages.pollCreationMessageV3


        if (participant) {
            if (!isGroup && !isStatus) {
                additionalAttributes = { ...additionalAttributes, device_fanout: 'false' }
            }
            
            const { user, device } = jidDecode(participant.jid)
            
            devices.push({
                user,
                device,
                jid: participant.jid
            })
        }

        await authState.keys.transaction(async () => {
            const mediaType = getMediaType(message)

            if (mediaType) {
                extraAttrs['mediatype'] = mediaType
            }
            
            if (isNewsletter) {
                const patched = patchMessageBeforeSending ? await patchMessageBeforeSending(message, []) : message
                const bytes = encodeNewsletterMessage(patched)
                
                binaryNodeContent.push({
                    tag: 'plaintext',
                    attrs: {},
                    content: bytes
                })
                
                const stanza = {
                    tag: 'message',
                    attrs: {
                        to: jid,
                        id: msgId,
                        type: getTypeMessage(message),
                        ...(additionalAttributes || {})
                    },
                    content: binaryNodeContent
                }
                
                logger.debug({ msgId }, `sending newsletter message to ${jid}`)
                
                await sendNode(stanza)
                
                return
            }

            if (messages.pinInChatMessage || messages.keepInChatMessage || message.reactionMessage || message.protocolMessage?.editedMessage) {
                extraAttrs['decrypt-fail'] = 'hide'
            } 

            if (messages.interactiveResponseMessage?.nativeFlowResponseMessage) {
                extraAttrs['native_flow_name'] = messages.interactiveResponseMessage.nativeFlowResponseMessage?.name || 'menu_options'
            }

            if (isGroupOrStatus && !isRetryResend) {
                const [groupData, senderKeyMap] = await Promise.all([
                    (async () => {
                        let groupData = useCachedGroupMetadata && cachedGroupMetadata ? await cachedGroupMetadata(jid) : undefined // todo: should we rely on the cache specially if the cache is outdated and the metadata has new fields?
                        
                        if (groupData && Array.isArray(groupData?.participants)) {
                            logger.trace({ jid, participants: groupData.participants.length }, 'using cached group metadata')
                        }
                        
                        else if (!isStatus) {
                            groupData = await groupMetadata(jid) // TODO: start storing group participant list + addr mode in Signal & stop relying on this
                        }
                        
                        return groupData
                    })(),
                    (async () => {
                        if (!participant && !isStatus) {
                            // what if sender memory is less accurate than the cached metadata
                            // on participant change in group, we should do sender memory manipulation
                            const result = await authState.keys.get('sender-key-memory', [jid]) // TODO: check out what if the sender key memory doesn't include the LID stuff now?
                            
                            return result[jid] || {}
                        }
                        
                        return {}
                    })()
                ])
                
                const participantsList = groupData ? groupData.participants.map(p => p.id) : []
                
                if (groupData?.ephemeralDuration && groupData.ephemeralDuration > 0) {
                    additionalAttributes = {
                        ...additionalAttributes,
                        expiration: groupData.ephemeralDuration.toString()
                    }
                }
                
                if (isStatus && statusJidList) {
                    participantsList.push(...statusJidList)
                }
                
                const additionalDevices = await getUSyncDevices(participantsList, !!useUserDevicesCache, false)
                
                devices.push(...additionalDevices)
                
                if (isGroup) {
                    additionalAttributes = {
                        ...additionalAttributes,
                        addressing_mode: groupData?.addressingMode || 'lid'
                    }
                }
                
                const patched = await patchMessageBeforeSending(message)
                
                if (Array.isArray(patched)) {
                    throw new Boom('Per-jid patching is not supported in groups')
                }
                
                const bytes = encodeWAMessage(patched)
                const groupAddressingMode = additionalAttributes?.['addressing_mode'] || groupData?.addressingMode || 'lid'
                const groupSenderIdentity = groupAddressingMode === 'lid' && meLid ? meLid : meId
                const { ciphertext, senderKeyDistributionMessage } = await signalRepository.encryptGroupMessage({
                    group: destinationJid,
                    data: bytes,
                    meId: groupSenderIdentity
                })
                
                const senderKeyRecipients = []
                
                for (const device of devices) {
                    const deviceJid = device.jid
                    const hasKey = !!senderKeyMap[deviceJid]
                    
                    if ((!hasKey || !!participant) &&
                        !isHostedLidUser(deviceJid) &&
                        !isHostedPnUser(deviceJid) &&
                        device.device !== 99) {
                        //todo: revamp all this logic
                        // the goal is to follow with what I said above for each group, and instead of a true false map of ids, we can set an array full of those the app has already sent pkmsgs
                        senderKeyRecipients.push(deviceJid)
                        senderKeyMap[deviceJid] = true
                    }
                }
                
                if (senderKeyRecipients.length) {
                    logger.debug({ senderKeyJids: senderKeyRecipients }, 'sending new sender key')
                    
                    const senderKeyMsg = {
                        senderKeyDistributionMessage: {
                            axolotlSenderKeyDistributionMessage: senderKeyDistributionMessage,
                            groupId: destinationJid
                        }
                    }
                    
                    const senderKeySessionTargets = senderKeyRecipients
                    
                    await assertSessions(senderKeySessionTargets)
                    
                    const result = await createParticipantNodes(senderKeyRecipients, senderKeyMsg, extraAttrs)
                    
                    shouldIncludeDeviceIdentity = shouldIncludeDeviceIdentity || result.shouldIncludeDeviceIdentity;
                    participants.push(...result.nodes)
                }
                
                binaryNodeContent.push({
                    tag: 'enc',
                    attrs: { v: '2', type: 'skmsg', ...extraAttrs },
                    content: ciphertext
                })
                
                await authState.keys.set({ 'sender-key-memory': { [jid]: senderKeyMap } })
            }

            else {
                const { user: meUser } = jidDecode(meId)

                if (!participant) {
                    devices.push({ user })

                    if (user !== meUser) {
                        devices.push({ user: meUser })
                    }

                    if (additionalAttributes?.['category'] !== 'peer') {
                        const additionalDevices = await getUSyncDevices([meId, jid], !!useUserDevicesCache, true)
                        devices.push(...additionalDevices)
                    }
                }

                const allRecipients = []
                const meRecipients = []
                const otherRecipients = []

                for (const { user, device } of devices) {
                    const isMe = user === meUser
                    const recipientJid = jidEncode(
                        isMe && isLid ? authState.creds.me?.lid?.split(':')[0] || user : user,
                        isLid ? 'lid' : 's.whatsapp.net',
                        device
                    )

                    if (isMe) {
                        meRecipients.push(recipientJid)
                    }

                    else {
                        otherRecipients.push(recipientJid)
                    }

                    allRecipients.push(recipientJid)
                }

                await assertSessions(allRecipients, false)

                const [{ nodes: meNodes, shouldIncludeDeviceIdentity: s1 }, { nodes: otherNodes, shouldIncludeDeviceIdentity: s2 }] = await Promise.all([
                    createParticipantNodes(meRecipients, meMsg, extraAttrs),
                    createParticipantNodes(otherRecipients, message, extraAttrs)
                ])

                participants.push(...meNodes)
                participants.push(...otherNodes)
                shouldIncludeDeviceIdentity = shouldIncludeDeviceIdentity || s1 || s2
            }
            
            if (isRetryResend) {
                const isParticipantLid = isLidUser(participant.jid)
                const isMe = areJidsSameUser(participant.jid, isParticipantLid ? meLid : meId)
                const encodedMessageToSend = isMe
                    ? encodeWAMessage({
                        deviceSentMessage: {
                            destinationJid,
                            message
                        }
                    })
                    : encodeWAMessage(message)
                const { type, ciphertext: encryptedContent } = await signalRepository.encryptMessage({
                    data: encodedMessageToSend,
                    jid: participant.jid
                })
                
                binaryNodeContent.push({
                    tag: 'enc',
                    attrs: {
                        v: '2',
                        type,
                        count: participant.count.toString()
                    },
                    content: encryptedContent
                })
            }
            
            if (participants.length) {
                if (additionalAttributes?.['category'] === 'peer') {
                    const peerNode = participants[0]?.content?.[0]
                    
                    if (peerNode) {
                        binaryNodeContent.push(peerNode) // push only enc
                    }
                }
                
                else {
                    binaryNodeContent.push({
                        tag: 'participants',
                        attrs: {},
                        content: participants
                    });
                }
            }
            
            const stanza = {
                tag: 'message',
                attrs: {
                    id: msgId,
                    to: destinationJid,
                    type: getTypeMessage(message),
                    ...(additionalAttributes || {})
                },
                content: binaryNodeContent
            }

            // if the participant to send to is explicitly specified (generally retry recp)
            // ensure the message is only sent to that person
            // if a retry receipt is sent to everyone -- it'll fail decryption for everyone else who received the msg
            if (participant) {
                if (isJidGroup(destinationJid)) {
                    stanza.attrs.to = destinationJid
                    stanza.attrs.participant = participant.jid
                }
                
                else if (areJidsSameUser(participant.jid, meId)) {
                    stanza.attrs.to = participant.jid
                    stanza.attrs.recipient = destinationJid
                }
                
                else {
                    stanza.attrs.to = participant.jid
                }
            }
            
            else {
                stanza.attrs.to = destinationJid
            }
            
            if (shouldIncludeDeviceIdentity) {
                stanza.content.push({
                    tag: 'device-identity',
                    attrs: {},
                    content: encodeSignedDeviceIdentity(authState.creds.account, true)
                })
                
                logger.debug({ jid }, 'adding device identity')
            }
            
            const contactTcTokenData = !isGroup && !isRetryResend && !isStatus ? await authState.keys.get('tctoken', [destinationJid]) : {}
            const tcTokenBuffer = contactTcTokenData[destinationJid]?.token
            
            if (tcTokenBuffer) {
                stanza.content.push({
                    tag: 'tctoken',
                    attrs: {},
                    content: tcTokenBuffer
                })
            }

            if (isGroup && regexGroupOld.test(jid) && !message.reactionMessage) {
                stanza.content.push({
                    tag: 'multicast',
                    attrs: {}
                }) 
           }

            if (pollMessage || messages.eventMessage) {
                stanza.content.push({
                    tag: 'meta', 
                    attrs: messages.eventMessage ? {
                        event_type: 'creation'
                    } : isNewsletter ? {
                        polltype: 'creation', 
                        contenttype: pollMessage?.pollContentType === 2 ? 'image' : 'text'
                    } : {
                        polltype: 'creation'
                    }
                }) 
            }

            if (!isNewsletter && buttonType) {
                const buttonsNode = getButtonArgs(messages)
                const filteredButtons = getBinaryFilteredButtons(additionalNodes ? additionalNodes : [])

                if (filteredButtons) {
                   stanza.content.push(...additionalNodes)
                   didPushAdditional = true
                }

                else {
                    stanza.content.push(buttonsNode)
                }
            }

            if (AI && isPrivate) {
                const botNode = {
                    tag: 'bot', 
                    attrs: {
                        biz_bot: '1'
                    }
                }

                const filteredBizBot = getBinaryFilteredBizBot(additionalNodes ? additionalNodes : []) 

                if (filteredBizBot) {
                    stanza.content.push(...additionalNodes) 
                    didPushAdditional = true
                }

                else {
                    stanza.content.push(botNode) 
                }
            }

            if (!didPushAdditional && additionalNodes && additionalNodes.length > 0) {
                stanza.content.push(...additionalNodes)
            }  

handleSafetyLimit('device', devices.length, messageSafety.maxGroupDevices, destinationJid)

            logger.debug({ msgId }, `sending message to ${participants.length} devices`)

            await sendNode(stanza)
            
            // Add message to retry cache if enabled
            if (messageRetryManager && !participant) {
                messageRetryManager.addRecentMessage(destinationJid, msgId, message)
            }
        }, meId)

        return msgId
    }

    const getTypeMessage = (msg) => {
        const message = normalizeMessageContent(msg)  
        if (message.pollCreationMessage || message.pollCreationMessageV2 || message.pollCreationMessageV3) {
            return 'poll'
        }       
        else if (message.reactionMessage) {
            return 'reaction'
        }       
        else if (message.eventMessage) {
            return 'event'
        }        
        else if (getMediaType(message)) {
            return 'media'
        }        
        else {
            return 'text'
        }
    }

    const getMediaType = (message) => {
      if (message.imageMessage) {
            return 'image'
        }
        else if (message.stickerMessage) {
            return message.stickerMessage.isLottie ? '1p_sticker' : message.stickerMessage.isAvatar ? 'avatar_sticker' : 'sticker'
        }
        else if (message.videoMessage) {
            return message.videoMessage.gifPlayback ? 'gif' : 'video'
        }
        else if (message.audioMessage) {
            return message.audioMessage.ptt ? 'ptt' : 'audio'
        }
        else if (message.ptvMessage) {
            return 'ptv'
        }
        else if (message.albumMessage) {
            return 'collection'
        }
        else if (message.contactMessage) {
            return 'vcard'
        }
        else if (message.documentMessage) {
            return 'document'
        }
        else if (message.stickerPackMessage) {
            return 'sticker_pack'
        }
        else if (message.contactsArrayMessage) {
            return 'contact_array'
        }
        else if (message.locationMessage) {
            return 'location'
        }
        else if (message.liveLocationMessage) {
            return 'livelocation'
        }
        else if (message.listMessage) {
            return 'list'
        }
        else if (message.listResponseMessage) {
            return 'list_response'
        }
        else if (message.buttonsResponseMessage) {
            return 'buttons_response'
        }
        else if (message.orderMessage) {
            return 'order'
        }
        else if (message.productMessage) {
            return 'product'
        }
        else if (message.interactiveResponseMessage) {
            return 'native_flow_response'
        }
        else if (/https:\/\/wa\.me\/c\/\d+/.test(message.extendedTextMessage?.text)) {
            return 'cataloglink'
        }
        else if (/https:\/\/wa\.me\/p\/\d+\/\d+/.test(message.extendedTextMessage?.text)) {
            return 'productlink'
        }
        else if (message.extendedTextMessage?.matchedText || message.groupInviteMessage) {
            return 'url'
        }
    }

    const getButtonType = (message) => {
        if (message.listMessage) {
            return 'list'
       }
        else if (message.buttonsMessage) {
            return 'buttons'
        }
        else if(message.interactiveMessage?.nativeFlowMessage) {
            return 'native_flow'
        }
    }

    const getButtonArgs = (message) => {
        const nativeFlow = message.interactiveMessage?.nativeFlowMessage
        const firstButtonName = nativeFlow?.buttons?.[0]?.name
        const nativeFlowSpecials = [
            'mpm', 'cta_catalog', 'send_location',
            'call_permission_request', 'wa_payment_transaction_details',
            'automated_greeting_message_view_catalog'
        ]

        if (nativeFlow && (firstButtonName === 'review_and_pay' || firstButtonName === 'payment_info')) {
                return {
                    tag: 'biz', 
                    attrs: {
                        native_flow_name: firstButtonName === 'review_and_pay' ? 'order_details' : firstButtonName
                }
            } 
        } else if (nativeFlow && nativeFlowSpecials.includes(firstButtonName)) {
            // Only works for WhatsApp Original, not WhatsApp Business
            return {
                tag: 'biz',
                attrs: {
                	actual_actors: '2', 
                	host_storage: '2', 
                	privacy_mode_ts: unixTimestampSeconds().toString()
                }, 
                content: [{
                    tag: 'interactive',
                    attrs: {
                        type: 'native_flow',
                        v: '1'
                    },
                    content: [{
                        tag: 'native_flow',
                        attrs: {
                            v: '2', 
                            name: firstButtonName
                        }
                    }]
                }, 
                {
                	tag: 'quality_control', 
                	attrs: {
                		source_type: 'third_party'
                	}
                }]
            }
        } else if (nativeFlow || message.buttonsMessage) {
            // It works for whatsapp original and whatsapp business
            return {
                tag: 'biz', 
                attrs: {
                	actual_actors: '2', 
                	host_storage: '2', 
                	privacy_mode_ts: unixTimestampSeconds().toString()
                }, 
                content: [{
                    tag: 'interactive', 
                    attrs: {
                        type: 'native_flow', 
                        v: '1'
                    }, 
                    content: [{
                        tag: 'native_flow', 
                        attrs: {
                            v: '9', 
                            name: 'mixed'
                        }
                    }]
                }, 
                {
                	tag: 'quality_control', 
                	attrs: {
                		source_type: 'third_party'
                	}
                }]
            }
        } else if (message.listMessage) {
            return {
                tag: 'biz', 
                attrs: {
                	actual_actors: '2', 
                	host_storage: '2', 
                	privacy_mode_ts: unixTimestampSeconds().toString()
                }, 
                content: [{
                    tag: 'list', 
                    attrs: {
                        v: '2', 
                        type: 'product_list'
                    }
                }, 
                {
                	tag: 'quality_control', 
                	attrs: {
                		source_type: 'third_party'
                	}
                }]
            }
        } else {
            return {
                tag: 'biz', 
                attrs: {
                	actual_actors: '2', 
                	host_storage: '2', 
                	privacy_mode_ts: unixTimestampSeconds().toString()
                }
            }
        }
    }

    const getPrivacyTokens = async (jids) => {
        const t = unixTimestampSeconds().toString()

        const result = await query({
            tag: 'iq',
            attrs: {
                to: S_WHATSAPP_NET,
                type: 'set',
                xmlns: 'privacy'
            },
            content: [
                {
                    tag: 'tokens',
                    attrs: {},
                    content: jids.map(jid => ({
                        tag: 'token',
                        attrs: {
                            jid: jidNormalizedUser(jid),
                            t,
                            type: 'trusted_contact'
                        }
                    }))
                }
            ]
        })

        return result
    }    
    
    const getEphemeralGroup = (jid) => {
    	if (!isJidGroup(jid)) throw new TypeError("Jid should originate from a group!") 
    
        return groupQuery(jid, 'get', [{
        	tag: 'query',
            attrs: {
            	request: 'interactive'
            }
        }])
        .then((groups) => getBinaryNodeChild(groups, 'group'))
        .then((metadata) => getBinaryNodeChild(metadata, 'ephemeral')?.attrs?.expiration || 0) 
    }

    const waUploadToServer = getWAUploadToServer(config, refreshMediaConn)

    const waitForMsgMediaUpdate = bindWaitForEvent(ev, 'messages.media-update')
    
    return {
        ...suki,
        getPrivacyTokens,
        assertSessions,
        profilePictureUrl, 
        relayMessage,
        sendReceipt,
        sendReceipts,
        readMessages,
        getUSyncDevices,
        refreshMediaConn,
        waUploadToServer,
        getMediaHost: () => mediaHost,
        getEphemeralGroup, 
        fetchPrivacySettings, 
        messageRetryManager, 
        createParticipantNodes, 
        sendPeerDataOperationMessage, 
        updateMemberLabel, 
        updateMediaMessage: async (message) => {
            const content = assertMediaContent(message.message)
            const mediaKey = content.mediaKey
            const meId = authState.creds.me.id
            const node = await encryptMediaRetryRequest(message.key, mediaKey, meId)
            
            let error = undefined
            
            await Promise.all([
                sendNode(node),
                waitForMsgMediaUpdate(async (update) => {
                    const result = update.find(c => c.key.id === message.key.id)
                    
                    if (result) {
                        if (result.error) {
                            error = result.error
                        }
                        
                        else {
                            try {
                                const media = await decryptMediaRetryData(result.media, mediaKey, result.key.id)
                                
                                if (media.result !== proto.MediaRetryNotification.ResultType.SUCCESS) {
                                    const resultStr = proto.MediaRetryNotification.ResultType[media.result]
                                    
                                    throw new Boom(`Media re-upload failed by device (${resultStr})`, {
                                        data: media,
                                        statusCode: getStatusCodeForMediaRetry(media.result) || 404
                                    })
                                }
                                
                                content.directPath = media.directPath
                                content.url = getUrlFromDirectPath(content.directPath, mediaHost)
                                logger.debug({ directPath: media.directPath, key: result.key }, 'media update successful')
                            }
                            
                            catch (err) {
                                error = err
                            }
                        }
                        
                        return true
                    }
                })
            ])
            
            if (error) {
                throw error
            }
            
            ev.emit('messages.update', [{ key: message.key, update: { message: message.message } }])
            
            return message
        },
        sendStatusMentions: async (content, jids = []) => {
          const userJid = jidNormalizedUser(authState.creds.me.id)
          let allUsers = new Set()
          allUsers.add(userJid)

          for (const id of jids) {
            const isGroup = isJidGroup(id) 
            const isPrivate = isPnUser(id) 

            if (isGroup) {
              try {
                const metadata = await cachedGroupMetadata(id) || await groupMetadata(id)
                const participants = metadata.participants.map(p => jidNormalizedUser(p.id))
                participants.forEach(jid => allUsers.add(jid))
              } catch (error) {
                logger.error(`Error getting metadata for group ${id}: ${error}`)
              }
            } else if (isPrivate) {
              allUsers.add(jidNormalizedUser(id))
            }
          }

          const uniqueUsers = Array.from(allUsers)
          const getRandomHexColor = () => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")

          const isMedia = content.image || content.video || content.audio
          const isAudio = !!content.audio

          const messageContent = { ...content }

          if (isMedia && !isAudio) {
            if (messageContent.text) {
              messageContent.caption = messageContent.text

              delete messageContent.text
            }

            delete messageContent.ptt
            delete messageContent.font
            delete messageContent.backgroundColor
            delete messageContent.textColor
          }

          if (isAudio) {
            delete messageContent.text
            delete messageContent.caption
            delete messageContent.font
            delete messageContent.textColor
          }

          const font = !isMedia ? (content.font || Math.floor(Math.random() * 9)) : undefined
          const textColor = !isMedia ? (content.textColor || getRandomHexColor()) : undefined
          const backgroundColor = (!isMedia || isAudio) ? (content.backgroundColor || getRandomHexColor()) : undefined
          const ptt = isAudio ? (typeof content.ptt === 'boolean' ? content.ptt : true) : undefined

          let msg
          let mediaHandle
          try {
            msg = await generateWAMessage(STORIES_JID, messageContent, {
              logger,
              userJid,
              getUrlInfo: text => getUrlInfo(text, {
                thumbnailWidth: linkPreviewImageThumbnailWidth,
                fetchOpts: {
                    timeout: 3000,
                    ...(httpRequestOptions || {})
                },
                logger,
                uploadImage: generateHighQualityLinkPreview ? waUploadToServer : undefined
              }),
              upload: async (encFilePath, opts) => {
                const up = await waUploadToServer(encFilePath, { ...opts })
                mediaHandle = up.handle
                return up
              },
              mediaCache: config.mediaCache,
              options: config.options,
              font,
              textColor,
              backgroundColor,
              ptt
            })
          } catch (error) {
            logger.error(`Error generating message: ${error}`)
            throw error
          }

          await relayMessage(STORIES_JID, msg.message, {
            messageId: msg.key.id,
            statusJidList: uniqueUsers, 
            additionalNodes: [
              {
                tag: 'meta',
                attrs: {},
                content: [
                  {
                    tag: 'mentioned_users',
                    attrs: {},
                    content: jids.map(jid => ({
                      tag: 'to',
                      attrs: { jid: jidNormalizedUser(jid) }
                    }))
                  }]
              }]
          })

          for (const id of jids) {
            try {
              const normalizedId = jidNormalizedUser(id)
              const isPrivate = isPnUser(normalizedId) 
              const type = isPrivate ? 'statusMentionMessage' : 'groupStatusMentionMessage'

              const protocolMessage = {
                [type]: {
                  message: {
                    protocolMessage: {
                      key: msg.key,
                      type: 25
                    }
                  }
                },
                messageContextInfo: {
                  messageSecret: randomBytes(32)
                }
              }

              const statusMsg = await generateWAMessageFromContent(normalizedId,
                protocolMessage,
                {}
              )

              await relayMessage(
                normalizedId,
                statusMsg.message,
                {
                  additionalNodes: [{
                    tag: 'meta',
                    attrs: isPrivate ?
                    { is_status_mention: 'true' } :
                    { is_group_status_mention: 'true' }
                  }]
                }
              )

              await delay(2000)
            } catch (error) {
              logger.error(`Error sending to ${id}: ${error}`)
            }
          }

          return msg
        },
        sendMessage: async (jid, content, options = {}) => {
            const userJid = authState.creds.me.id
            const additionalAttributes = {}

            if (!options.ephemeralExpiration) {
                if (isJidGroup(jid)) {
                    const expiration = await getEphemeralGroup(jid) 
                    options.ephemeralExpiration = expiration
                 }
            }
            
            if (typeof content === 'object' &&
                'disappearingMessagesInChat' in content &&
                typeof content['disappearingMessagesInChat'] !== 'undefined' &&
                isJidGroup(jid)) {

                const { disappearingMessagesInChat } = content

                const value = typeof disappearingMessagesInChat === 'boolean' ?
                    (disappearingMessagesInChat ? WA_DEFAULT_EPHEMERAL : 0) :
                    disappearingMessagesInChat

                await groupToggleEphemeral(jid, value)
            }
            
            else if (typeof content === 'object' && 'album' in content && content.album) {
            	const albumMsg = await prepareAlbumMessageContent(jid, content.album, {
            		suki: {
            			relayMessage, 
            			waUploadToServer
            		}, 
            		userJid: userJid, 
            		...options
})
for (const media of albumMsg) {
await enqueueHumanMessage(jid, content, media.message, options, () => relayMessage(jid, media.message, { messageId: media.key.id, useCachedGroupMetadata: options.useCachedGroupMetadata, additionalAttributes, statusJidList: options.statusJidList, additionalNodes: options.additionalNodes, AI: options.ai }))
}
            
            	return albumMsg
            }

            else {
                let mediaHandle

                const fullMsg = await generateWAMessage(jid, content, {
                    logger,
                    userJid,
                    getUrlInfo: text => getUrlInfo(text, {
                        thumbnailWidth: linkPreviewImageThumbnailWidth,
                        fetchOpts: {
                    	    timeout: 3000,
                            ...(httpRequestOptions || {})
                        },
                        logger,
                        uploadImage: generateHighQualityLinkPreview
                            ? waUploadToServer
                            : undefined
                    }),
                    getProfilePicUrl: profilePictureUrl,
                    getCallLink: createCallLink, 
                    upload: async (encFilePath, opts) => {
                        const up = await waUploadToServer(encFilePath, { ...opts, newsletter: isJidNewsletter(jid) })
                        mediaHandle = up.handle
                        return up
                    },
                    mediaCache: config.mediaCache,
                    options: config.options,
                    messageId: generateMessageID(userJid), 
                    ...options,
                })

                const isPin = 'pin' in content && !!content.pin
                const isEdit = 'edit' in content && !!content.edit
                const isDelete = 'delete' in content && !!content.delete
                const isKeep = 'keep' in content && !!content.keep && content.keep?.type === 2

                if (isDelete || isKeep) {
                    // if the chat is a group, and I am not the author, then delete the message as an admin
                    if (isJidGroup(content.delete?.remoteJid) && !content.delete?.fromMe || isJidNewsletter(jid)) {
                        additionalAttributes.edit = '8'
                    }

                    else {
                        additionalAttributes.edit = '7'
                    }
                }

                else if (isEdit) {
                    additionalAttributes.edit = isJidNewsletter(jid) ? '3' : '1'
                }

                else if (isPin) {
                    additionalAttributes.edit = '2'
                }  

                if (mediaHandle) {
                    additionalAttributes['media_id'] = mediaHandle
                }

                if ('cachedGroupMetadata' in options) {
                    console.warn('cachedGroupMetadata in sendMessage are deprecated, now cachedGroupMetadata is part of the socket config.')
                }

                await enqueueHumanMessage(jid, content, fullMsg.message, options, () => relayMessage(jid, fullMsg.message, { messageId: fullMsg.key.id, useCachedGroupMetadata: options.useCachedGroupMetadata, additionalAttributes, statusJidList: options.statusJidList, additionalNodes: options.additionalNodes, AI: options.ai }))

                if (config.emitOwnEvents) {
                    process.nextTick(async () => {
                        await messageMutex.mutex(() => upsertMessage(fullMsg, 'append'))
                    })
                }

                return fullMsg
            }
        }
    }
}

module.exports = {
  makeMessagesSocket
}