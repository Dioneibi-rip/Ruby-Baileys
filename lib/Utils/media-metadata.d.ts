import { Readable } from 'stream';
export declare function getAudioDuration(input: Buffer | string | Readable): Promise<number | undefined>;
declare const _default: { getAudioDuration: typeof getAudioDuration };
export default _default;
