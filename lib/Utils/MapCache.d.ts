export default class MapCache<T = unknown> {
    constructor(options?: { stdTTL?: number; ttl?: number; maxKeys?: number });
    set(key: string, value: T, ttl?: number): boolean;
    get(key: string): T | undefined;
    del(key: string): boolean;
    keys(pattern?: string): string[];
    flushAll(): void;
    close(): void;
}
