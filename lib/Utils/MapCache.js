"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MapCache {
    constructor(options = {}) {
        this.store = new Map();
        this.timers = new Map();
        this.stdTTL = Math.max(0, options.stdTTL || options.ttl || 0);
        this.maxKeys = Math.max(0, options.maxKeys || 0);
    }
    set(key, value, ttl = this.stdTTL) {
        if (this.maxKeys && !this.store.has(key) && this.store.size >= this.maxKeys) {
            const oldestKey = this.store.keys().next().value;
            if (oldestKey !== undefined) this.del(oldestKey);
        }
        this.del(key);
        this.store.set(key, value);
        if (ttl > 0) {
            const timer = setTimeout(() => this.del(key), ttl * 1000);
            timer.unref?.();
            this.timers.set(key, timer);
        }
        return true;
    }
    get(key) { return this.store.get(key); }
    del(key) {
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
        return this.store.delete(key);
    }
    keys(pattern) {
        const keys = Array.from(this.store.keys());
        if (!pattern) return keys;
        const prefix = pattern.endsWith('*') ? pattern.slice(0, -1) : pattern;
        return keys.filter(key => String(key).startsWith(prefix));
    }
    flushAll() {
        for (const key of Array.from(this.store.keys())) this.del(key);
    }
    close() { this.flushAll(); }
}
exports.default = MapCache;
