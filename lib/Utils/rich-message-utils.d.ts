export declare const tokenizeCode: (code: string, language?: string) => any[];
export declare const toUnified: (submessages: any[], uuid?: string) => any;
export declare const prepareRichResponseMessage: (content: any) => any;
export declare const botMetadataSignature: () => Buffer;
export declare const botMetadataCertificate: (length?: number) => Buffer;
export declare const wrapToBotForwardedMessage: (richResponseMessage: any) => any;
