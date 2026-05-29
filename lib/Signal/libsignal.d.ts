import { SignalAuthState } from '../Types';
import { SignalRepository } from '../Types/Signal';
export declare function makeLibSignalRepository(auth: SignalAuthState, logger?: any, pnToLIDFunc?: (pn: string) => Promise<string | undefined>): SignalRepository;
