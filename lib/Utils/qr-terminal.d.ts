declare const qrTerminal: {
    error: number;
    generate(input: string, opts?: { small?: boolean }, cb?: (output: string) => void): void;
    generate(input: string, cb?: (output: string) => void): void;
    setErrorLevel(error: string): void;
};
export = qrTerminal;
