"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAudioDuration = getAudioDuration;
const fs = require("fs");
const HEADER_BYTES = 512 * 1024;
const readHeader = async input => {
    if (Buffer.isBuffer(input)) return input.subarray(0, HEADER_BYTES);
    if (typeof input === 'string') {
        const handle = await fs.promises.open(input, 'r');
        try {
            const buffer = Buffer.alloc(HEADER_BYTES);
            const { bytesRead } = await handle.read(buffer, 0, HEADER_BYTES, 0);
            return buffer.subarray(0, bytesRead);
        }
        finally { await handle.close(); }
    }
    const chunks = [];
    let total = 0;
    for await (const chunk of input) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(buf);
        total += buf.length;
        if (total >= HEADER_BYTES) break;
    }
    input.destroy?.();
    return Buffer.concat(chunks, Math.min(total, HEADER_BYTES)).subarray(0, HEADER_BYTES);
};
const fileSize = async input => Buffer.isBuffer(input) ? input.length : typeof input === 'string' ? (await fs.promises.stat(input)).size : undefined;
const parseMp3Bitrate = buffer => {
    let offset = 0;
    if (buffer.subarray(0, 3).toString() === 'ID3' && buffer.length >= 10) {
        offset = 10 + ((buffer[6] & 0x7f) << 21) + ((buffer[7] & 0x7f) << 14) + ((buffer[8] & 0x7f) << 7) + (buffer[9] & 0x7f);
    }
    const bitrates = [null,32,40,48,56,64,80,96,112,128,160,192,224,256,320,null];
    for (let i = offset; i < buffer.length - 4; i++) {
        if (buffer[i] === 0xff && (buffer[i + 1] & 0xe0) === 0xe0) {
            const bitrateIndex = (buffer[i + 2] >> 4) & 0x0f;
            const bitrate = bitrates[bitrateIndex];
            if (bitrate) return bitrate * 1000;
        }
    }
};
const parseOggDuration = buffer => {
    const marker = Buffer.from('OggS');
    let lastGranule;
    for (let i = 0; i < buffer.length - 14; i++) {
        if (buffer.subarray(i, i + 4).equals(marker)) lastGranule = Number(buffer.readBigUInt64LE(i + 6));
    }
    const opus = buffer.indexOf('OpusHead');
    if (lastGranule && opus >= 0) return lastGranule / 48000;
    const vorbis = buffer.indexOf('vorbis');
    if (lastGranule && vorbis >= 0 && vorbis + 15 < buffer.length) return lastGranule / buffer.readUInt32LE(vorbis + 11);
};
const parseMp4Duration = buffer => {
    for (let i = 0; i < buffer.length - 32; i++) {
        if (buffer.subarray(i + 4, i + 8).toString() !== 'mvhd') continue;
        const version = buffer[i + 8];
        if (version === 0 && i + 28 < buffer.length) {
            const timescale = buffer.readUInt32BE(i + 20);
            const duration = buffer.readUInt32BE(i + 24);
            if (timescale) return duration / timescale;
        }
        if (version === 1 && i + 40 < buffer.length) {
            const timescale = buffer.readUInt32BE(i + 28);
            const duration = Number(buffer.readBigUInt64BE(i + 32));
            if (timescale) return duration / timescale;
        }
    }
};
async function getAudioDuration(input) {
    const header = await readHeader(input);
    const mp4 = parseMp4Duration(header);
    if (mp4) return mp4;
    const ogg = parseOggDuration(header);
    if (ogg) return ogg;
    const bitrate = parseMp3Bitrate(header);
    const size = await fileSize(input).catch?.(() => undefined);
    if (bitrate && size) return (size * 8) / bitrate;
}
exports.default = { getAudioDuration };
