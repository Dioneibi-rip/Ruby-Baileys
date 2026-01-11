"use strict"

Object.defineProperty(exports, "__esModule", { value: true })

const { Browsers } = require("../Utils") 
const { default: logger } = require("../Utils/logger")
const { makeLibSignalRepository } = require("../Signal/libsignal")
// const { version } = require("./baileys-version.json") // <-- YA NO USAMOS ESTA

const DEFAULT_CONNECTION_CONFIG = {
    // CAMBIO 1: Forzamos una versión reciente aceptada por WhatsApp
    version: [2, 3000, 1015901307], 
    
    // CAMBIO 2: Cambiamos la firma del navegador para limpiar el error 'atn'
    browser: ['Ubuntu', 'Chrome', '20.0.04'], 
    
    waWebSocketUrl: 'wss://web.whatsapp.com/ws/chat',
    connectTimeoutMs: 20000,
    keepAliveIntervalMs: 30000,
    logger: logger.child({ class: 'baileys' }),
    printQRInTerminal: false,
    emitOwnEvents: true,
    defaultQueryTimeoutMs: 60000,
    customUploadHosts: [],
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 5,
    fireInitQueries: true,
    auth: undefined,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    patchMessageBeforeSending: msg => msg,
    shouldSyncHistoryMessage: () => true,
    shouldIgnoreJid: () => false,
    linkPreviewImageThumbnailWidth: 192,
    transactionOpts: { 
        maxCommitRetries: 10, 
        delayBetweenTriesMs: 3000 
    },
    generateHighQualityLinkPreview: false,
    enableAutoSessionRecreation: true, 
    enableRecentMessageCache: true, 
    options: {},
    appStateMacVerification: {
        patch: false,
        snapshot: false,
    },
    countryCode: 'US',
    getMessage: async () => undefined,
    cachedGroupMetadata: async () => undefined,
    makeSignalRepository: makeLibSignalRepository
}

module.exports = {
  DEFAULT_CONNECTION_CONFIG
}
