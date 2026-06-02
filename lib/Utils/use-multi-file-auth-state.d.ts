import { AuthenticationState } from '../Types';
export type MultiFileAuthStateOptions = {
    /** Write via temp file + fsync + rename so forced restarts cannot leave partial JSON. Defaults to true. */
    atomicWrites?: boolean;
    /** Keep a .bak copy and transparently restore reads from it when primary JSON is corrupt. Defaults to true. */
    backupOnWrite?: boolean;
    /** Remove stale temporary auth files left by interrupted writes. Defaults to true. */
    cleanupStaleTempFiles?: boolean;
};
/**
 * stores the full authentication state in a single folder.
 * Far more efficient than singlefileauthstate
 *
 * Uses per-file mutexes plus optional atomic temp-file writes and .bak recovery
 * to make auth persistence resilient against process crashes/restarts.
 * */
export declare const useMultiFileAuthState: (folder: string, opts?: MultiFileAuthStateOptions) => Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
    removeCreds: () => Promise<void>;
}>;
