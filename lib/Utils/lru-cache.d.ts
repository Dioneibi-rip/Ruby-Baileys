import type { CacheStore } from '../Types'
export type LRUCacheOptions = {
max?: number
maxKeys?: number
ttl?: number
ttlMs?: number
cleanupIntervalMs?: number
}
export declare class LRUCache implements CacheStore {
constructor(options?: LRUCacheOptions)
get<T>(key: string): T | undefined
set<T>(key: string, value: T): void
del(key: string): void
flushAll(): void
close(): void
}
