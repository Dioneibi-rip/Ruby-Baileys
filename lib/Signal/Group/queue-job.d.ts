declare function queueJob<T>(bucket: string | number, awaitable: () => Promise<T>): Promise<T>

export = queueJob
