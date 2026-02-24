"use strict"

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod }
}

Object.defineProperty(exports, "__esModule", { value: true })

const async_mutex_1 = __importDefault(require("async-mutex"))
const promises_1 = require("fs/promises")
const path_1 = require("path")
const WAProto_1 = require("../../WAProto")
const auth_utils_1 = require("./auth-utils")
const generics_1 = require("./generics")
// We need to lock files due to the fact that we are using async functions to read and write files
// https://github.com/WhiskeySockets/Baileys/issues/794
// https://github.com/nodejs/node/issues/26338
// Use a Map to store mutexes for each file path
const fileLocks = new Map()

// Get or create a mutex for a specific file path
const getFileLock = (path) => {
	let mutex = fileLocks.get(path)
	if (!mutex) {
		mutex = new async_mutex_1.Mutex() 
		fileLocks.set(path, mutex)
	}

	return mutex
}

/**
 * stores the full authentication state in a single folder.
 * Far more efficient than singlefileauthstate
 *
 * Again, I wouldn't endorse this for any production level use other than perhaps a bot.
 * Would recommend writing an auth state for use with a proper SQL or No-SQL DB
 * */
const useMultiFileAuthState = async (folder) => {
    const fileCache = new Map()
    const MAX_PREKEY_FILES = 1200
    const PREKEY_PRUNE_BATCH_SIZE = 150

    const listStalePreKeyFiles = async (excludeFilePath) => {
        const entries = await promises_1.readdir(folder, { withFileTypes: true })
        const preKeyFiles = entries
            .filter((entry) => entry.isFile() && entry.name.startsWith('pre-key-') && entry.name.endsWith('.json'))
            .map((entry) => ({
                filePath: path_1.join(folder, entry.name),
                name: entry.name
            }))
            .filter((entry) => entry.filePath !== excludeFilePath)

        if (preKeyFiles.length <= MAX_PREKEY_FILES) {
            return []
        }

        const withStats = await Promise.all(preKeyFiles.map(async (entry) => {
            const stats = await promises_1.stat(entry.filePath).catch(() => null)
            return stats
                ? {
                    ...entry,
                    mtimeMs: stats.mtimeMs
                }
                : null
        }))

        const stalePreKeys = withStats
            .filter(Boolean)
            .sort((a, b) => a.mtimeMs - b.mtimeMs)

        const overflowCount = preKeyFiles.length - MAX_PREKEY_FILES
        const deleteCount = Math.min(stalePreKeys.length, overflowCount + PREKEY_PRUNE_BATCH_SIZE)
        return stalePreKeys.slice(0, deleteCount)
    }

    const prunePreKeys = async (excludeFilePath) => {
        const stalePreKeys = await listStalePreKeyFiles(excludeFilePath)
        if (!stalePreKeys.length) {
            return 0
        }

        await Promise.all(stalePreKeys.map(async ({ filePath }) => {
            await promises_1.unlink(filePath).catch(() => { })
            fileCache.delete(filePath)
        }))

        return stalePreKeys.length
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writeData = async (data, file) => {
        const filePath = path_1.join(folder, fixFileName(file))
        const serialized = JSON.stringify(data, generics_1.BufferJSON.replacer)

        if (fileCache.get(filePath) === serialized) {
            return
        }

        const mutex = getFileLock(filePath)
        return mutex.acquire().then(async (release) => {
            try {
                try {
                    await promises_1.writeFile(filePath, serialized)
                } catch (error) {
                    if (error?.code !== 'ENOSPC') {
                        throw error
                    }

                    await prunePreKeys(filePath)
                    await promises_1.writeFile(filePath, serialized)
                }

                fileCache.set(filePath, serialized)
            } finally {
                release()
            }
        })
    }
    const readData = async (file) => {
        try {
            const filePath = path_1.join(folder, fixFileName(file))
            const mutex = getFileLock(filePath)
            const data = await mutex.acquire().then(async (release) => {
                try {
                    if (fileCache.has(filePath)) {
                        return fileCache.get(filePath)
                    }

                    return await promises_1.readFile(filePath, { encoding: 'utf-8' })
                } finally {
                    release()
                }
            })

            fileCache.set(filePath, data)

            return JSON.parse(data, generics_1.BufferJSON.reviver)
        } catch (error) {
            return null
        }
    }
    const removeData = async (file) => {
        try {
            const filePath = path_1.join(folder, fixFileName(file))
            const mutex = getFileLock(filePath)
            await mutex.acquire().then(async (release) => {
               try {
                    await promises_1.unlink(filePath)
                    fileCache.delete(filePath)
                } finally {
                    release()
                }
            })
        } catch {}
    }
    const folderInfo = await promises_1.stat(folder).catch(() => { })
    if (folderInfo) {
        if (!folderInfo.isDirectory()) {
            throw new Error(`found something that is not a directory at ${folder}, either delete it or specify a different location`)
        }
    }
    else {
        await promises_1.mkdir(folder, { recursive: true })
    }
    const fixFileName = (file) => { 
        return file?.replace(/\//g, '__')?.replace(/:/g, '-') 
    }
    const creds = await readData('creds.json') || auth_utils_1.initAuthCreds()
    let credsWritePromise = null
    let credsWriteTimer = null
    const flushCreds = async () => {
        if (!credsWritePromise) {
            credsWritePromise = writeData(creds, 'creds.json')
                .finally(() => {
                    credsWritePromise = null
                })
        }

        return credsWritePromise
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {}
                    await Promise.all(ids.map(async (id) => {
                        let value = await readData(`${type}-${id}.json`)
                        if (type === 'app-state-sync-key' && value) {
                            value = WAProto_1.proto.Message.AppStateSyncKeyData.fromObject(value)
                        }
                        data[id] = value
                    }))
                    return data
                },
                set: async (data) => {
                    const tasks = []
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id]
                            const file = `${category}-${id}.json`
                            tasks.push(value ? writeData(value, file) : removeData(file))
                        }
                    }
                    await Promise.all(tasks)

                    if (data['pre-key']) {
                        await prunePreKeys()
                    }
                }
            }
        },
        saveCreds: async () => {
            if (credsWriteTimer) {
                clearTimeout(credsWriteTimer)
            }

            return new Promise((resolve, reject) => {
                credsWriteTimer = setTimeout(() => {
                    credsWriteTimer = null
                    flushCreds().then(resolve).catch(reject)
                }, 750)
            })
        }
    }
}

module.exports = {
  useMultiFileAuthState
}
