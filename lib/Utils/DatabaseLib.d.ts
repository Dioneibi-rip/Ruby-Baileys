export type Comparable<T, K> = {
    key: (value: T) => K;
    compare: (k1: K, k2: K) => number;
};
export default class DatabaseLib<T, K> {
    key: Comparable<T, K>;
    idGetter: (value: T) => string;
    dict: Record<string, T>;
    array: T[];
    constructor(key: Comparable<T, K>, id?: (value: T) => string);
    get length(): number;
    get first(): T | undefined;
    get last(): T | undefined;
    toJSON(): T[];
    insert(...values: T[]): void;
    upsert(...values: T[]): T[];
    insertIfAbsent(...values: T[]): T[];
    deleteById(id: string, assertPresent?: boolean): T | null | undefined;
    delete(value: T): T | null;
    slice(start?: number, end?: number): DatabaseLib<T, K>;
    clear(): void;
    get(id: string): T | undefined;
    all(): T[];
    update(id: string, updateFn: (value: T) => void): 1 | 2 | undefined;
    updateKey(value: T, updateFn: (value: T) => void): 1 | 2 | undefined;
    filter(predicate: (value: T, index: number) => boolean): DatabaseLib<T, K>;
    paginatedByValue(value: T | undefined, limit: number, predicate?: (value: T, index: number) => boolean, mode?: 'after' | 'before'): T[];
    paginated(cursor: K | undefined | null, limit: number, predicate?: (value: T, index: number) => boolean, mode?: 'after' | 'before'): T[];
    firstIndex(value: T): number;
    [Symbol.iterator](): IterableIterator<T>;
}
