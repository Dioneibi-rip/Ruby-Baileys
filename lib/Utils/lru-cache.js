"use strict"

Object.defineProperty(exports, "__esModule", { value: true })
exports.LRUCache = void 0

class LRUCache {
constructor(options = {}) {
this.max = Math.max(1, options.max || options.maxKeys || 500)
this.ttlMs = typeof options.ttlMs === 'number' ? options.ttlMs : typeof options.ttl === 'number' ? options.ttl * 1000 : 0
this.store = new Map()
this.gcTimer = null
const cleanupIntervalMs = options.cleanupIntervalMs || this.ttlMs
if (this.ttlMs > 0 && cleanupIntervalMs > 0) {
this.gcTimer = setInterval(() => this.pruneExpired(), cleanupIntervalMs)
this.gcTimer.unref?.()
}
}

get(key) {
const entry = this.store.get(key)
if (!entry) return undefined
if (this.isExpired(entry)) {
this.store.delete(key)
return undefined
}
this.store.delete(key)
this.store.set(key, entry)
return entry.value
}

set(key, value) {
if (this.store.has(key)) this.store.delete(key)
this.store.set(key, { value, expiresAt: this.ttlMs > 0 ? Date.now() + this.ttlMs : 0 })
this.pruneOverflow()
}

del(key) {
this.store.delete(key)
}

flushAll() {
this.store.clear()
}

close() {
if (this.gcTimer) clearInterval(this.gcTimer)
this.gcTimer = null
this.flushAll()
}

pruneOverflow() {
while (this.store.size > this.max) {
const oldestKey = this.store.keys().next().value
if (typeof oldestKey === 'undefined') return
this.store.delete(oldestKey)
}
}

pruneExpired() {
if (this.ttlMs <= 0) return
for (const [key, entry] of this.store) {
if (this.isExpired(entry)) this.store.delete(key)
}
}

isExpired(entry) {
return entry.expiresAt > 0 && entry.expiresAt <= Date.now()
}
}

exports.LRUCache = LRUCache
