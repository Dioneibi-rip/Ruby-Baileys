"use strict"

Object.defineProperty(exports, "__esModule", { value: true })

const { LRUCache } = require("./lru-cache")

const RECENT_MESSAGES_SIZE = 200
const RECENT_MESSAGES_TTL = 15 * 60
const RETRY_COUNTERS_SIZE = 4096
const RETRY_COUNTERS_TTL = 60 * 60
const SESSION_RECREATE_SIZE = 1024
const MESSAGE_KEY_SEPARATOR = '\u0000'
const RECREATE_SESSION_TIMEOUT = 60 * 60 * 1000
const PHONE_REQUEST_DELAY = 3000

class MessageRetryManager {
  constructor(logger, maxMsgRetryCount = 5) {
    this.logger = logger
    this.maxMsgRetryCount = maxMsgRetryCount
    this.recentMessagesMap = new LRUCache({ maxKeys: RECENT_MESSAGES_SIZE, ttl: RECENT_MESSAGES_TTL })
    this.messageKeyIndex = new LRUCache({ maxKeys: RECENT_MESSAGES_SIZE, ttl: RECENT_MESSAGES_TTL })
    this.sessionRecreateHistory = new LRUCache({ maxKeys: SESSION_RECREATE_SIZE, ttlMs: RECREATE_SESSION_TIMEOUT })
    this.retryCounters = new LRUCache({ maxKeys: RETRY_COUNTERS_SIZE, ttl: RETRY_COUNTERS_TTL })
    this.pendingPhoneRequests = {}
    this.statistics = { totalRetries: 0, successfulRetries: 0, failedRetries: 0, mediaRetries: 0, sessionRecreations: 0, phoneRequests: 0 }
  }

  keyToString(key) { return `${key.to}${MESSAGE_KEY_SEPARATOR}${key.id}` }

  addRecentMessage(to, id, message) {
    const keyStr = this.keyToString({ to, id })
    this.recentMessagesMap.set(keyStr, { message, timestamp: Date.now() })
    this.messageKeyIndex.set(id, keyStr)
  }

  getRecentMessage(to, id) {
    return this.recentMessagesMap.get(this.keyToString({ to, id }))
  }

  shouldRecreateSession(jid, retryCount, hasSession) {
    if (!hasSession) return { reason: "we don't have a Signal session with them", recreate: true }
    if (retryCount < 2) return { reason: '', recreate: false }
    const now = Date.now()
    const prevTime = this.sessionRecreateHistory.get(jid)
    if (!prevTime || now - prevTime > RECREATE_SESSION_TIMEOUT) {
      this.sessionRecreateHistory.set(jid, now)
      return { reason: 'retry count > 1 and over an hour since last recreation', recreate: true }
    }
    return { reason: '', recreate: false }
  }

  incrementRetryCount(messageId) {
    const count = (this.retryCounters.get(messageId) || 0) + 1
    this.retryCounters.set(messageId, count)
    return count
  }
  getRetryCount(messageId) { return this.retryCounters.get(messageId) || 0 }
  hasExceededMaxRetries(messageId) { return this.getRetryCount(messageId) >= this.maxMsgRetryCount }

  removeRecentMessage(messageId) {
    const keyStr = this.messageKeyIndex.get(messageId)
    if (!keyStr) return
    this.recentMessagesMap.del(keyStr)
    this.messageKeyIndex.del(messageId)
  }
  markRetrySuccess(messageId) { this.retryCounters.del(messageId); this.cancelPendingPhoneRequest(messageId); this.removeRecentMessage(messageId) }
  markRetryFailed(messageId) { this.retryCounters.del(messageId); this.cancelPendingPhoneRequest(messageId); this.removeRecentMessage(messageId) }

  schedulePhoneRequest(messageId, callback, delay = PHONE_REQUEST_DELAY) {
    this.cancelPendingPhoneRequest(messageId)
    this.pendingPhoneRequests[messageId] = setTimeout(() => {
      delete this.pendingPhoneRequests[messageId]
      callback()
    }, delay)
  }
  cancelPendingPhoneRequest(messageId) {
    const timeout = this.pendingPhoneRequests[messageId]
    if (timeout) { clearTimeout(timeout); delete this.pendingPhoneRequests[messageId] }
  }
}

module.exports = { MessageRetryManager }
