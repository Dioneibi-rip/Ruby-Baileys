import { proto } from '../../WAProto';
type DecryptGroupSignalOpts = {
    group: string;
    authorJid: string;
    msg: Uint8Array;
};
type ProcessSenderKeyDistributionMessageOpts = {
    item: proto.Message.ISenderKeyDistributionMessage;
    authorJid: string;
};
type DecryptSignalProtoOpts = {
    jid: string;
    type: 'pkmsg' | 'msg';
    ciphertext: Uint8Array;
};
type EncryptMessageOpts = {
    jid: string;
    data: Uint8Array;
};
type EncryptGroupMessageOpts = {
    group: string;
    data: Uint8Array;
    meId: string;
};
type PreKey = {
    keyId: number;
    publicKey: Uint8Array;
};
type SignedPreKey = PreKey & {
    signature: Uint8Array;
};
type E2ESession = {
    registrationId: number;
    identityKey: Uint8Array;
    signedPreKey: SignedPreKey;
    preKey: PreKey;
};
type E2ESessionOpts = {
    jid: string;
    session: E2ESession;
};
export type LIDMappingRepository = {
    storeLIDPNMappings(mappings: Array<{ lid: string; pn: string }>): Promise<void>;
    getPNForLID(lid: string): Promise<string | undefined>;
    getLIDForPN(pn: string): Promise<string | undefined>;
    getLIDsForPNs(pns: string[]): Promise<Array<{ pn: string; lid: string }>>;
};
export type SignalRepository = {
    lidMapping: LIDMappingRepository;
    validateSession(jid: string): Promise<{ exists: boolean; id: string }>;
    migrateSession(fromJid: string, toJid: string): Promise<void>;
    decryptGroupMessage(opts: DecryptGroupSignalOpts): Promise<Uint8Array>;
    processSenderKeyDistributionMessage(opts: ProcessSenderKeyDistributionMessageOpts): Promise<void>;
    decryptMessage(opts: DecryptSignalProtoOpts): Promise<Uint8Array>;
    encryptMessage(opts: EncryptMessageOpts): Promise<{
        type: 'pkmsg' | 'msg';
        ciphertext: Uint8Array;
    }>;
    encryptGroupMessage(opts: EncryptGroupMessageOpts): Promise<{
        senderKeyDistributionMessage: Uint8Array;
        ciphertext: Uint8Array;
    }>;
    injectE2ESession(opts: E2ESessionOpts): Promise<void>;
    jidToSignalProtocolAddress(jid: string): string;
};
export {};
