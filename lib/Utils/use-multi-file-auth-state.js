"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMultiFileAuthState = void 0;
const async_mutex_1 = require("async-mutex");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const WAProto_1 = require("../../WAProto");
const auth_utils_1 = require("./auth-utils");
const generics_1 = require("./generics");
// We need to lock files due to the fact that we are using async functions to read and write files
// https://github.com/WhiskeySockets/Baileys/issues/794
// https://github.com/nodejs/node/issues/26338
// Use a Map to store mutexes for each file path
const fileLocks = new Map();
// Get or create a mutex for a specific file path
const getFileLock = (path) => {
    let mutex = fileLocks.get(path);
    if (!mutex) {
        mutex = new async_mutex_1.Mutex();
        fileLocks.set(path, mutex);
    }
    return mutex;
};
/**
 * stores the full authentication state in a single folder.
 * Far more efficient than singlefileauthstate
 *
 * Again, I wouldn't endorse this for any production level use other than perhaps a bot.
 * Would recommend writing an auth state for use with a proper SQL or No-SQL DB
 * */
const useMultiFileAuthState = async (folder, opts = {}) => {
    const backupOnWrite = opts.backupOnWrite !== false;
    const atomicWrites = opts.atomicWrites !== false;
    const cleanupStaleTempFiles = opts.cleanupStaleTempFiles !== false;
    const saveDebounceMs = Math.max(0, Number.isFinite(opts.saveDebounceMs) ? opts.saveDebounceMs : 10000);
    let saveCredsTimer;
    let pendingSavePromise;
    let resolvePendingSave;
    let rejectPendingSave;
    const fixFileName = (file) => { var _a; return (_a = file === null || file === void 0 ? void 0 : file.replace(/\//g, '__')) === null || _a === void 0 ? void 0 : _a.replace(/:/g, '-'); };
    const filePathFor = (file) => (0, path_1.join)(folder, fixFileName(file));
    const backupPathFor = (filePath) => `${filePath}.bak`;
    const tempPathFor = (filePath) => filePath.endsWith('creds.json') ? `${filePath}.tmp` : `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    const writeFileDurably = async (filePath, data) => {
        if (!atomicWrites) {
            try {
                await (0, promises_1.writeFile)(filePath, data);
            }
            catch (error) {
                throw new Error(`failed to write auth file at ${filePath}: ${error === null || error === void 0 ? void 0 : error.message}`);
            }
            return;
        }
        const tempPath = tempPathFor(filePath);
        let handle;
        try {
            handle = await (0, promises_1.open)(tempPath, 'w');
            await handle.writeFile(data);
            await handle.sync();
            await handle.close();
            handle = undefined;
            if (backupOnWrite) {
                await (0, promises_1.copyFile)(filePath, backupPathFor(filePath)).catch(() => { });
            }
            await (0, promises_1.rename)(tempPath, filePath);
        }
        catch (error) {
            if (handle) {
                await handle.close().catch(() => { });
            }
            await (0, promises_1.unlink)(tempPath).catch(() => { });
            throw new Error(`failed to write auth file atomically at ${filePath}: ${error === null || error === void 0 ? void 0 : error.message}`);
        }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writeData = async (data, file) => {
        const filePath = filePathFor(file);
        const mutex = getFileLock(filePath);
        return mutex.acquire().then(async (release) => {
            try {
                await writeFileDurably(filePath, JSON.stringify(data, generics_1.BufferJSON.replacer));
            }
            finally {
                release();
            }
        });
    };
    const readJsonFile = async (filePath) => {
        try {
            const data = await (0, promises_1.readFile)(filePath, { encoding: 'utf-8' });
            if (!data.trim()) {
                throw new Error(`empty auth file at ${filePath}`);
            }
            return JSON.parse(data, generics_1.BufferJSON.reviver);
        }
        catch (error) {
            throw new Error(`failed to read auth file at ${filePath}: ${error === null || error === void 0 ? void 0 : error.message}`);
        }
    };
    const readData = async (file) => {
        const filePath = filePathFor(file);
        const mutex = getFileLock(filePath);
        return mutex.acquire().then(async (release) => {
            try {
                return await readJsonFile(filePath);
            }
            catch (error) {
                if (backupOnWrite) {
                    try {
                        return await readJsonFile(backupPathFor(filePath));
                    }
                    catch (_a) { }
                }
                return null;
            }
            finally {
                release();
            }
        });
    };
    const removeData = async (file) => {
        try {
            const filePath = filePathFor(file);
            const mutex = getFileLock(filePath);
            return mutex.acquire().then(async (release) => {
                try {
                    await (0, promises_1.unlink)(filePath);
                    await (0, promises_1.unlink)(backupPathFor(filePath)).catch(() => { });
                }
                catch (_a) {
                }
                finally {
                    release();
                }
            });
        }
        catch (_a) {
        }
    };
    const folderInfo = await (0, promises_1.stat)(folder).catch(() => { });
    if (folderInfo) {
        if (!folderInfo.isDirectory()) {
            throw new Error(`found something that is not a directory at ${folder}, either delete it or specify a different location`);
        }
    }
    else {
        await (0, promises_1.mkdir)(folder, { recursive: true });
    }
    if (cleanupStaleTempFiles) {
        const files = await (0, promises_1.readdir)(folder).catch(() => []);
        await Promise.all(files
            .filter(file => file.endsWith('.tmp'))
            .map(file => (0, promises_1.unlink)((0, path_1.join)(folder, file)).catch(() => { })));
    }
    const creds = await readData('creds.json') || (0, auth_utils_1.initAuthCreds)();
    const saveCredsImmediately = async () => {
        if (saveCredsTimer) {
            clearTimeout(saveCredsTimer);
            saveCredsTimer = undefined;
        }
        try {
            await writeData(creds, 'creds.json');
            resolvePendingSave === null || resolvePendingSave === void 0 ? void 0 : resolvePendingSave();
        }
        catch (error) {
            rejectPendingSave === null || rejectPendingSave === void 0 ? void 0 : rejectPendingSave(error);
            throw error;
        }
        finally {
            pendingSavePromise = undefined;
            resolvePendingSave = undefined;
            rejectPendingSave = undefined;
        }
    };
    const saveCreds = async () => {
        if (!saveDebounceMs) {
            return saveCredsImmediately();
        }
        if (!pendingSavePromise) {
            pendingSavePromise = new Promise((resolve, reject) => {
                resolvePendingSave = resolve;
                rejectPendingSave = reject;
            });
        }
        if (saveCredsTimer) {
            clearTimeout(saveCredsTimer);
        }
        saveCredsTimer = setTimeout(() => {
            saveCredsImmediately().catch(() => { });
        }, saveDebounceMs);
        saveCredsTimer.unref?.();
        return pendingSavePromise;
    };
    return {
        state: {
            creds,
            folder,
            authFolder: folder,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(ids.map(async (id) => {
                        let value = await readData(`${type}-${id}.json`);
                        if (type === 'app-state-sync-key' && value) {
                            value = WAProto_1.proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value;
                    }));
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const file = `${category}-${id}.json`;
                            tasks.push(value ? writeData(value, file) : removeData(file));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds,
        flushCreds: saveCredsImmediately,
        removeCreds: async () => {
            if (saveCredsTimer) {
                clearTimeout(saveCredsTimer);
                saveCredsTimer = undefined;
            }
            return removeData('creds.json');
        }
    };
};
exports.useMultiFileAuthState = useMultiFileAuthState;
