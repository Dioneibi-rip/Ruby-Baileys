"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatusCodeForMediaRetry = exports.decryptMediaRetryData = exports.decodeMediaRetryNode = exports.encryptMediaRetryRequest = exports.getWAUploadToServer = exports.downloadEncryptedContent = exports.downloadContentFromMessage = exports.getUrlFromDirectPath = exports.encryptedStream = exports.prepareStream = exports.getHttpStream = exports.getStream = exports.toBuffer = exports.toReadable = exports.mediaMessageSHA256B64 = exports.generateProfilePicture = exports.encodeBase64EncodedStringForUpload = exports.extractImageThumb = exports.extractVideoThumb = exports.hkdfInfoKey = void 0;
exports.getMediaKeys = getMediaKeys;
exports.uploadFile = uploadFile;
exports.vid2jpg = vid2jpg;
exports.getAudioDuration = getAudioDuration;
exports.getAudioWaveform = getAudioWaveform;
exports.generateThumbnail = generateThumbnail;
exports.extensionForMediaMessage = extensionForMediaMessage;
const boom_1 = require("@hapi/boom");
const Crypto = __importStar(require("crypto"));
const events_1 = require("events");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const stream_1 = require("stream");
const child_process_1 = require("child_process");
const WAProto_1 = require("../../WAProto");
const Defaults_1 = require("../Defaults");
const WABinary_1 = require("../WABinary");
const crypto_1 = require("./crypto");
const generics_1 = require("./generics");
const media_metadata_1 = require("./media-metadata");
const decodeHtmlEntities = (value) => value.replace(/&(#(\d+)|#x([\da-f]+)|[a-z]+);/gi, (entity, _numeric, decimal, hex) => {
    if (decimal) return String.fromCodePoint(Number(decimal));
    if (hex) return String.fromCodePoint(parseInt(hex, 16));
    const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
    return entities[entity.slice(1, -1).toLowerCase()] || entity;
});
const getHtmlAttribute = (html, selector, attribute) => {
    const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = html.match(selector);
    if (!match) return undefined;
    const attrMatch = match[0].match(new RegExp(`\\s${escapedAttribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
    const value = attrMatch?.[1] || attrMatch?.[2] || attrMatch?.[3];
    return value ? decodeHtmlEntities(value.trim()) : undefined;
};
const getTmpFilesDirectory = () => (0, os_1.tmpdir)();
const getImageProcessingLibrary = async () => {
    try {
        const sharp = require('sharp');
        if (sharp) return { sharp: { default: sharp } };
    }
    catch (_a) { }
    return {};
};
const fetchWithTimeout = async (url, options = {}) => {
    const { timeout, headers, ...fetchOptions } = options;
    const controller = timeout ? new AbortController() : undefined;
    const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : undefined;
    try {
        const response = await fetch(url, { ...fetchOptions, headers, signal: controller?.signal || fetchOptions.signal });
        if (!response.ok) {
            const error = new Error(`Request failed with status ${response.status}`);
            error.response = response;
            error.status = response.status;
            throw error;
        }
        return response;
    }
    finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
};
const hkdfInfoKey = (type) => {
    const hkdfInfo = Defaults_1.MEDIA_HKDF_KEY_MAPPING[type];
    return `WhatsApp ${hkdfInfo} Keys`;
};
exports.hkdfInfoKey = hkdfInfoKey;
/** generates all the keys required to encrypt/decrypt & sign a media message */
async function getMediaKeys(buffer, mediaType) {
    if (!buffer) {
        throw new boom_1.Boom('Cannot derive from empty media key');
    }
    if (typeof buffer === 'string') {
        buffer = Buffer.from(buffer.replace('data:;base64,', ''), 'base64');
    }
    // expand using HKDF to 112 bytes, also pass in the relevant app info
    const expandedMediaKey = await (0, crypto_1.hkdf)(buffer, 112, { info: (0, exports.hkdfInfoKey)(mediaType) });
    return {
        iv: expandedMediaKey.slice(0, 16),
        cipherKey: expandedMediaKey.slice(16, 48),
        macKey: expandedMediaKey.slice(48, 80),
    };
}
async function uploadFile(buffer, logger) {
    const { fromBuffer } = await Promise.resolve().then(() => __importStar(require('file-type')));
    const fileType = await fromBuffer(buffer);
    if (!fileType)
        throw new Error("Failed to detect file type.");
    const { ext, mime } = fileType;
    const services = [
        {
            name: "catbox",
            url: "https://catbox.moe/user/api.php",
            buildForm: () => {
                const form = new FormData();
                form.append("fileToUpload", new Blob([buffer], { type: mime || "application/octet-stream" }), `file.${ext}`);
                form.append("reqtype", "fileupload");
                return form;
            },
            parseResponse: res => res.data
        },
        {
            name: "pdi.moe",
            url: "https://scdn.pdi.moe/upload",
            buildForm: () => {
                const form = new FormData();
                form.append("file", new Blob([buffer], { type: mime || "application/octet-stream" }), `file.${ext}`);
                return form;
            },
            parseResponse: res => res.data.result.url
        },
        {
            name: "qu.ax",
            url: "https://qu.ax/upload.php",
            buildForm: () => {
                const form = new FormData();
                form.append("files[]", new Blob([buffer], { type: mime || "application/octet-stream" }), `file.${ext}`);
                return form;
            },
            parseResponse: res => {
                var _a, _b, _c;
                if (!((_c = (_b = (_a = res.data) === null || _a === void 0 ? void 0 : _a.files) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.url))
                    throw new Error("Failed to get URL from qu.ax");
                return res.data.files[0].url;
            }
        },
        {
            name: "uguu.se",
            url: "https://uguu.se/upload.php",
            buildForm: () => {
                const form = new FormData();
                form.append("files[]", new Blob([buffer], { type: mime || "application/octet-stream" }), `file.${ext}`);
                return form;
            },
            parseResponse: res => {
                var _a, _b, _c;
                if (!((_c = (_b = (_a = res.data) === null || _a === void 0 ? void 0 : _a.files) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.url))
                    throw new Error("Failed to get URL from uguu.se");
                return res.data.files[0].url;
            }
        },
        {
            name: "tmpfiles",
            url: "https://tmpfiles.org/api/v1/upload",
            buildForm: () => {
                const form = new FormData();
                form.append("file", new Blob([buffer], { type: mime || "application/octet-stream" }), `file.${ext}`);
                return form;
            },
            parseResponse: res => {
                const match = res.data.data.url.match(/https:\/\/tmpfiles\.org\/(.*)/);
                if (!match)
                    throw new Error("Failed to parse tmpfiles URL.");
                return `https://tmpfiles.org/dl/${match[1]}`;
            }
        }
    ];
    for (const service of services) {
        try {
            const form = service.buildForm();
            const response = await fetchWithTimeout(service.url, {
                method: 'POST',
                body: form
            });
            const contentType = response.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await response.json() : await response.text();
            const url = service.parseResponse({ data, status: response.status, headers: Object.fromEntries(response.headers) });
            return url;
        }
        catch (error) {
            logger === null || logger === void 0 ? void 0 : logger.debug(`[${service.name}] eror:`, (error === null || error === void 0 ? void 0 : error.message) || error);
        }
    }
    throw new Error("All upload services failed.");
}
async function vid2jpg(videoUrl) {
    try {
        const response = await fetchWithTimeout(`https://ezgif.com/video-to-jpg?url=${encodeURIComponent(videoUrl)}`);
        const data = await response.text();
        const fileToken = getHtmlAttribute(data, /<input\b(?=[^>]*\bname\s*=\s*["']?file["']?)[^>]*>/i, "value");
        if (!fileToken) {
            throw new Error("Failed to retrieve file token. The video URL may be invalid or inaccessible.");
        }
        const formData = new URLSearchParams();
        formData.append("file", fileToken);
        formData.append("end", "1");
        formData.append("video-to-jpg", "Convert to JPG!");
        const convert = await fetchWithTimeout(`https://ezgif.com/video-to-jpg/${fileToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });
        const convertedHtml = await convert.text();
        let imageUrl = getHtmlAttribute(convertedHtml, /<[^>]*\bid\s*=\s*["']output["'][^>]*>[\s\S]*?<img\b[^>]*>/i, "src")
            || getHtmlAttribute(convertedHtml, /<img\b[^>]*>/i, "src");
        if (!imageUrl) {
            throw new Error("Could not locate the converted image output.");
        }
        if (imageUrl.startsWith("//")) {
            imageUrl = "https:" + imageUrl;
        }
        else if (imageUrl.startsWith("/")) {
            const cdnMatch = imageUrl.match(/\/(s\d+\..+?)\/.*/);
            if (cdnMatch) {
                imageUrl = "https://" + imageUrl.slice(2);
            }
            else {
                imageUrl = "https://ezgif.com" + imageUrl;
            }
        }
        return imageUrl;
    }
    catch (error) {
        throw new Error("Failed to convert video to JPG: " + error.message);
    }
}
/**
 * Extracts video thumbnail using FFmpeg
 */
const extractVideoThumb = async (videoPath, time = '00:00:00', size = { width: 256 }) => {
    return new Promise((resolve, reject) => {
        const args = [
            '-ss', time,
            '-i', videoPath,
            '-y',
            '-vf', `scale=${size.width}:-1`,
            '-vframes', '1',
            '-f', 'image2',
            '-vcodec', 'mjpeg',
            'pipe:1'
        ];
        const ffmpeg = (0, child_process_1.spawn)('ffmpeg', args);
        const chunks = [];
        let errorOutput = '';
        ffmpeg.stdout.on('data', chunk => chunks.push(chunk));
        ffmpeg.stderr.on('data', data => {
            errorOutput += data.toString();
        });
        ffmpeg.on('error', reject);
        ffmpeg.on('close', code => {
            if (code === 0) return resolve(Buffer.concat(chunks));
            reject(new Error(`ffmpeg exited with code ${code}\n${errorOutput}`));
        });
    });
};
exports.extractVideoThumb = extractVideoThumb;
const extractImageThumb = async (bufferOrFilePath, width = 32) => {
    var _a;
    if (bufferOrFilePath instanceof stream_1.Readable) {
        bufferOrFilePath = await (0, exports.toBuffer)(bufferOrFilePath);
    }
    const lib = await getImageProcessingLibrary();
    if ('sharp' in lib && typeof ((_a = lib.sharp) === null || _a === void 0 ? void 0 : _a.default) === 'function') {
        const img = lib.sharp.default(bufferOrFilePath);
        const dimensions = await img.metadata();
        const buffer = await img
            .resize(width)
            .jpeg({ quality: 50 })
            .toBuffer();
        return {
            buffer,
            original: {
                width: dimensions.width,
                height: dimensions.height,
            },
        };
    }
    else {
        const buffer = Buffer.isBuffer(bufferOrFilePath)
            ? bufferOrFilePath
            : typeof bufferOrFilePath === 'string'
                ? await fs_1.promises.readFile(bufferOrFilePath)
                : Buffer.alloc(0);
        return {
            buffer,
            original: {}
        };
    }
};
exports.extractImageThumb = extractImageThumb;
const encodeBase64EncodedStringForUpload = (b64) => (encodeURIComponent(b64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/\=+$/, '')));
exports.encodeBase64EncodedStringForUpload = encodeBase64EncodedStringForUpload;
const generateProfilePicture = async (mediaUpload) => {
    let bufferOrFilePath;
    let img;
    if (Buffer.isBuffer(mediaUpload)) {
        bufferOrFilePath = mediaUpload;
    }
    else if ('url' in mediaUpload) {
        bufferOrFilePath = mediaUpload.url.toString();
    }
    else {
        bufferOrFilePath = await (0, exports.toBuffer)(mediaUpload.stream);
    }
    const lib = await getImageProcessingLibrary();
    if (!lib.sharp?.default) {
        const fallback = Buffer.isBuffer(bufferOrFilePath)
            ? bufferOrFilePath
            : typeof bufferOrFilePath === 'string'
                ? await fs_1.promises.readFile(bufferOrFilePath).catch(() => Buffer.alloc(0))
                : Buffer.alloc(0);
        return { img: fallback };
    }
    const sharp = lib.sharp.default;
    const metadata = await sharp(bufferOrFilePath).metadata();
    const resize = (metadata.width || 0) > (metadata.height || 0)
        ? { width: 550 }
        : { height: 650 };
    img = sharp(bufferOrFilePath)
        .resize(resize)
        .jpeg({ quality: 100 })
        .toBuffer();
    return {
        img: await img,
    };
};
exports.generateProfilePicture = generateProfilePicture;
/** gets the SHA256 of the given media message */
const mediaMessageSHA256B64 = (message) => {
    const media = Object.values(message)[0];
    return (media === null || media === void 0 ? void 0 : media.fileSha256) && Buffer.from(media.fileSha256).toString('base64');
};
exports.mediaMessageSHA256B64 = mediaMessageSHA256B64;
async function getAudioDuration(buffer) {
    return (0, media_metadata_1.getAudioDuration)(buffer);
}
async function getAudioWaveform(buffer, logger) {
    try {
        let audioData;
        if (Buffer.isBuffer(buffer)) {
            audioData = buffer.subarray(0, 4096);
        }
        else if (typeof buffer === 'string') {
            const fd = await fs_1.promises.open(buffer, 'r');
            try {
                audioData = Buffer.alloc(4096);
                const { bytesRead } = await fd.read(audioData, 0, 4096, 0);
                audioData = audioData.subarray(0, bytesRead);
            }
            finally {
                await fd.close();
            }
        }
        else {
            audioData = (await (0, exports.toBuffer)(buffer)).subarray(0, 4096);
        }
        const samples = 64;
        const blockSize = Math.max(1, Math.floor(audioData.length / samples));
        const waveform = new Uint8Array(samples);
        for (let i = 0; i < samples; i++) {
            let sum = 0;
            const start = i * blockSize;
            const end = Math.min(audioData.length, start + blockSize);
            for (let j = start; j < end; j++) sum += Math.abs(audioData[j] - 128);
            waveform[i] = Math.min(100, Math.floor((sum / Math.max(1, end - start)) / 1.28));
        }
        return waveform;
    }
    catch (e) {
        logger === null || logger === void 0 ? void 0 : logger.debug('Failed to generate waveform: ' + e);
    }
}
const toReadable = (buffer) => {
    const readable = new stream_1.Readable({ read: () => { } });
    readable.push(buffer);
    readable.push(null);
    return readable;
};
exports.toReadable = toReadable;
const toBuffer = async (stream) => {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    stream.destroy();
    return Buffer.concat(chunks);
};
exports.toBuffer = toBuffer;
const getStream = async (item, opts) => {
    if (Buffer.isBuffer(item)) {
        return { stream: (0, exports.toReadable)(item), type: 'buffer' };
    }
    if ('stream' in item) {
        return { stream: item.stream, type: 'readable' };
    }
    if (item.url.toString().startsWith('http://') || item.url.toString().startsWith('https://')) {
        return { stream: await (0, exports.getHttpStream)(item.url, opts), type: 'remote' };
    }
    return { stream: (0, fs_1.createReadStream)(item.url), type: 'file' };
};
exports.getStream = getStream;
/** generates a thumbnail for a given media, if required */
async function generateThumbnail(file, mediaType, options) {
    var _a;
    let thumbnail;
    let originalImageDimensions;
    if (mediaType === 'image') {
        const { buffer, original } = await (0, exports.extractImageThumb)(file);
        thumbnail = buffer.toString('base64');
        if (original.width && original.height) {
            originalImageDimensions = {
                width: original.width,
                height: original.height,
            };
        }
    }
    else if (mediaType === 'video') {
        try {
            let videoPath = file;
            if (Buffer.isBuffer(file) || file instanceof stream_1.Readable) {
                videoPath = (0, path_1.join)(getTmpFilesDirectory(), (0, generics_1.generateMessageIDV2)() + '.mp4');
                const buffer = Buffer.isBuffer(file) ? file : await (0, exports.toBuffer)(file);
                await fs_1.promises.writeFile(videoPath, buffer);
            }
            const thumbnailBuffer = await (0, exports.extractVideoThumb)(videoPath);
            const imgFilename = (0, path_1.join)(getTmpFilesDirectory(), (0, generics_1.generateMessageIDV2)() + '.jpg');
            await fs_1.promises.writeFile(imgFilename, thumbnailBuffer);
            const { buffer: processedThumbnailBuffer, original } = await (0, exports.extractImageThumb)(imgFilename);
            thumbnail = processedThumbnailBuffer.toString('base64');
            if (original.width && original.height) {
                originalImageDimensions = {
                    width: original.width,
                    height: original.height,
                };
            }
            await fs_1.promises.unlink(imgFilename);
            if (videoPath !== file) {
                await fs_1.promises.unlink(videoPath);
            }
        }
        catch (err) {
            (_a = options.logger) === null || _a === void 0 ? void 0 : _a.debug('could not generate video thumb: ' + err);
        }
    }
    return {
        thumbnail,
        originalImageDimensions
    };
}
const getHttpStream = async (url, options = {}) => {
    const response = await fetchWithTimeout(url.toString(), options);
    return stream_1.Readable.fromWeb(response.body);
};
exports.getHttpStream = getHttpStream;
const prepareStream = async (media, mediaType, { logger, saveOriginalFileIfRequired, opts } = {}) => {
    const { stream, type } = await (0, exports.getStream)(media, opts);
    logger === null || logger === void 0 ? void 0 : logger.debug('fetched media stream');
    let bodyPath;
    let didSaveToTmpPath = false;
    try {
        const buffer = await (0, exports.toBuffer)(stream);
        if (type === 'file') {
            bodyPath = media.url;
        }
        else if (saveOriginalFileIfRequired) {
            bodyPath = (0, path_1.join)(getTmpFilesDirectory(), mediaType + (0, generics_1.generateMessageIDV2)());
            (0, fs_1.writeFileSync)(bodyPath, buffer);
            didSaveToTmpPath = true;
        }
        const fileLength = buffer.length;
        const fileSha256 = Crypto.createHash('sha256').update(buffer).digest();
        stream === null || stream === void 0 ? void 0 : stream.destroy();
        logger === null || logger === void 0 ? void 0 : logger.debug('prepare stream data successfully');
        return {
            mediaKey: undefined,
            encWriteStream: buffer,
            fileLength,
            fileSha256,
            fileEncSha256: undefined,
            bodyPath,
            didSaveToTmpPath
        };
    }
    catch (error) {
        stream.destroy();
        if (didSaveToTmpPath) {
            try {
                await fs_1.promises.unlink(bodyPath);
            }
            catch (err) {
                logger === null || logger === void 0 ? void 0 : logger.error({ err }, 'failed to save to tmp path');
            }
        }
        throw error;
    }
};
exports.prepareStream = prepareStream;
const encryptedStream = async (media, mediaType, { logger, saveOriginalFileIfRequired, opts } = {}) => {
    const { stream, type } = await (0, exports.getStream)(media, opts);
    logger === null || logger === void 0 ? void 0 : logger.debug('fetched media stream');
    const mediaKey = Crypto.randomBytes(32);
    const { cipherKey, iv, macKey } = await getMediaKeys(mediaKey, mediaType);
    const encWriteStream = new stream_1.Readable({ read: () => { } });
    let bodyPath;
    let writeStream;
    let didSaveToTmpPath = false;
    if (type === 'file') {
        bodyPath = media.url;
    }
    else if (saveOriginalFileIfRequired) {
        bodyPath = (0, path_1.join)(getTmpFilesDirectory(), mediaType + (0, generics_1.generateMessageIDV2)());
        writeStream = (0, fs_1.createWriteStream)(bodyPath);
        didSaveToTmpPath = true;
    }
    let fileLength = 0;
    const aes = Crypto.createCipheriv('aes-256-cbc', cipherKey, iv);
    let hmac = Crypto.createHmac('sha256', macKey).update(iv);
    let sha256Plain = Crypto.createHash('sha256');
    let sha256Enc = Crypto.createHash('sha256');
    try {
        for await (const data of stream) {
            fileLength += data.length;
            if (type === 'remote'
                && (opts === null || opts === void 0 ? void 0 : opts.maxContentLength)
                && fileLength + data.length > opts.maxContentLength) {
                throw new boom_1.Boom(`content length exceeded when encrypting "${type}"`, {
                    data: { media, type }
                });
            }
            sha256Plain = sha256Plain.update(data);
            if (writeStream) {
                if (!writeStream.write(data)) {
                    await (0, events_1.once)(writeStream, 'drain');
                }
            }
            onChunk(aes.update(data));
        }
        onChunk(aes.final());
        const mac = hmac.digest().slice(0, 10);
        sha256Enc = sha256Enc.update(mac);
        const fileSha256 = sha256Plain.digest();
        const fileEncSha256 = sha256Enc.digest();
        encWriteStream.push(mac);
        encWriteStream.push(null);
        writeStream === null || writeStream === void 0 ? void 0 : writeStream.end();
        stream.destroy();
        logger === null || logger === void 0 ? void 0 : logger.debug('encrypted data successfully');
        return {
            mediaKey,
            encWriteStream,
            bodyPath,
            mac,
            fileEncSha256,
            fileSha256,
            fileLength,
            didSaveToTmpPath
        };
    }
    catch (error) {
        encWriteStream.destroy();
        writeStream === null || writeStream === void 0 ? void 0 : writeStream.destroy();
        aes.destroy();
        hmac.destroy();
        sha256Plain.destroy();
        sha256Enc.destroy();
        stream.destroy();
        if (didSaveToTmpPath) {
            try {
                await fs_1.promises.unlink(bodyPath);
            }
            catch (err) {
                logger === null || logger === void 0 ? void 0 : logger.error({ err }, 'failed to save to tmp path');
            }
        }
        throw error;
    }
    function onChunk(buff) {
        sha256Enc = sha256Enc.update(buff);
        hmac = hmac.update(buff);
        encWriteStream.push(buff);
    }
};
exports.encryptedStream = encryptedStream;
const DEF_HOST = 'mmg.whatsapp.net';
const AES_CHUNK_SIZE = 16;
const toSmallestChunkSize = (num) => {
    return Math.floor(num / AES_CHUNK_SIZE) * AES_CHUNK_SIZE;
};
const getUrlFromDirectPath = (directPath, host = DEF_HOST) => `https://${host}${directPath}`;
exports.getUrlFromDirectPath = getUrlFromDirectPath;
const downloadContentFromMessage = async ({ mediaKey, directPath, url }, type, opts = {}) => {
    const isValidMediaUrl = url === null || url === void 0 ? void 0 : url.startsWith('https://mmg.whatsapp.net/');
    const downloadUrl = isValidMediaUrl ? url : (0, exports.getUrlFromDirectPath)(directPath);
    if (!downloadUrl) {
        throw new boom_1.Boom('No valid media URL or directPath present in message', { statusCode: 400 });
    }
    const keys = await getMediaKeys(mediaKey, type);
    return (0, exports.downloadEncryptedContent)(downloadUrl, keys, opts);
};
exports.downloadContentFromMessage = downloadContentFromMessage;
const downloadEncryptedContent = async (downloadUrl, { cipherKey, iv }, { startByte, endByte, options } = {}) => {
    let bytesFetched = 0;
    let startChunk = 0;
    let firstBlockIsIV = false;
    if (startByte) {
        const chunk = toSmallestChunkSize(startByte || 0);
        if (chunk) {
            startChunk = chunk - AES_CHUNK_SIZE;
            bytesFetched = chunk;
            firstBlockIsIV = true;
        }
    }
    const endChunk = endByte ? toSmallestChunkSize(endByte || 0) + AES_CHUNK_SIZE : undefined;
    const headers = {
        ...(options === null || options === void 0 ? void 0 : options.headers) || {},
        Origin: Defaults_1.DEFAULT_ORIGIN,
    };
    if (startChunk || endChunk) {
        headers.Range = `bytes=${startChunk}-`;
        if (endChunk) {
            headers.Range += endChunk;
        }
    }
    const fetched = await (0, exports.getHttpStream)(downloadUrl, {
        ...options || {},
        headers,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
    });
    let remainingBytes = Buffer.from([]);
    let aes;
    const pushBytes = (bytes, push) => {
        if (startByte || endByte) {
            const start = bytesFetched >= startByte ? undefined : Math.max(startByte - bytesFetched, 0);
            const end = bytesFetched + bytes.length < endByte ? undefined : Math.max(endByte - bytesFetched, 0);
            push(bytes.slice(start, end));
            bytesFetched += bytes.length;
        }
        else {
            push(bytes);
        }
    };
    const output = new stream_1.Transform({
        transform(chunk, _, callback) {
            let data = Buffer.concat([remainingBytes, chunk]);
            const decryptLength = toSmallestChunkSize(data.length);
            remainingBytes = data.slice(decryptLength);
            data = data.slice(0, decryptLength);
            if (!aes) {
                let ivValue = iv;
                if (firstBlockIsIV) {
                    ivValue = data.slice(0, AES_CHUNK_SIZE);
                    data = data.slice(AES_CHUNK_SIZE);
                }
                aes = Crypto.createDecipheriv('aes-256-cbc', cipherKey, ivValue);
                if (endByte) {
                    aes.setAutoPadding(false);
                }
            }
            try {
                pushBytes(aes.update(data), b => this.push(b));
                callback();
            }
            catch (error) {
                callback(error);
            }
        },
        final(callback) {
            try {
                pushBytes(aes.final(), b => this.push(b));
                callback();
            }
            catch (error) {
                callback(error);
            }
        },
    });
    return fetched.pipe(output, { end: true });
};
exports.downloadEncryptedContent = downloadEncryptedContent;
function extensionForMediaMessage(message) {
    const getExtension = (mimetype) => mimetype.split(';')[0].split('/')[1];
    const type = Object.keys(message)[0];
    let extension;
    if (type === 'locationMessage' ||
        type === 'liveLocationMessage' ||
        type === 'productMessage') {
        extension = '.jpeg';
    }
    else {
        const messageContent = message[type];
        extension = getExtension(messageContent.mimetype);
    }
    return extension;
}
const getWAUploadToServer = ({ customUploadHosts, fetchAgent, logger, options }, refreshMediaConn) => {
    return async (stream, { mediaType, fileEncSha256B64, newsletter, timeoutMs }) => {
        var _a, _b;
        let uploadInfo = await refreshMediaConn(false);
        let urls;
        const hosts = [...customUploadHosts, ...uploadInfo.hosts];
        const chunks = [];
        if (!Buffer.isBuffer(stream)) {
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
        }
        const reqBody = Buffer.isBuffer(stream) ? stream : Buffer.concat(chunks);
        fileEncSha256B64 = (0, exports.encodeBase64EncodedStringForUpload)(fileEncSha256B64);
        const mediaPathMap = newsletter ? Defaults_1.NEWSLETTER_MEDIA_PATH_MAP : Defaults_1.MEDIA_PATH_MAP;
        const media = mediaPathMap[mediaType] || Defaults_1.MEDIA_PATH_MAP[mediaType];
        const serverThumb = newsletter ? '&server_thumb_gen=1' : '';
        for (const { hostname, maxContentLengthBytes } of hosts) {
            logger.debug(`uploading to "${hostname}"`);
            const auth = encodeURIComponent(uploadInfo.auth);
            const url = `https://${hostname}${media}/${fileEncSha256B64}?auth=${auth}&token=${fileEncSha256B64}${serverThumb}`;
            let result;
            try {
                if (maxContentLengthBytes && reqBody.length > maxContentLengthBytes) {
                    throw new boom_1.Boom(`Body too large for "${hostname}"`, { statusCode: 413 });
                }
                const response = await fetchWithTimeout(url, {
                    ...options,
                    method: 'POST',
                    headers: {
                        ...options.headers || {},
                        'Content-Type': 'application/octet-stream',
                        'Origin': Defaults_1.DEFAULT_ORIGIN
                    },
                    body: reqBody,
                    timeout: timeoutMs,
                });
                result = await response.json();
                if ((result === null || result === void 0 ? void 0 : result.url) || (result === null || result === void 0 ? void 0 : result.directPath)) {
                    urls = {
                        mediaUrl: result.url,
                        directPath: result.direct_path,
                        handle: result.handle,
                        meta_hmac: result.meta_hmac,
                        fbid: result.fbid,
                        ts: result.ts,
                        thumbnailDirectPath: result.thumbnail_info?.thumbnail_direct_path,
                        thumbnailSha256: result.thumbnail_info?.thumbnail_sha256
                    };
                    break;
                }
                else {
                    uploadInfo = await refreshMediaConn(true);
                    throw new Error(`upload failed, reason: ${JSON.stringify(result)}`);
                }
            }
            catch (error) {
                if (error.response) {
                    try {
                        result = await error.response.json();
                    }
                    catch (_) {
                        result = undefined;
                    }
                }
                const isLast = hostname === ((_b = hosts[uploadInfo.hosts.length - 1]) === null || _b === void 0 ? void 0 : _b.hostname);
                logger.warn({ trace: error.stack, uploadResult: result }, `Error in uploading to ${hostname} ${isLast ? '' : ', retrying...'}`);
            }
        }
        if (!urls) {
            throw new boom_1.Boom('Media upload failed on all hosts', { statusCode: 500 });
        }
        return urls;
    };
};
exports.getWAUploadToServer = getWAUploadToServer;
const getMediaRetryKey = (mediaKey) => {
    return (0, crypto_1.hkdf)(mediaKey, 32, { info: 'WhatsApp Media Retry Notification' });
};
const encryptMediaRetryRequest = async (key, mediaKey, meId) => {
    const recp = { stanzaId: key.id };
    const recpBuffer = WAProto_1.proto.ServerErrorReceipt.encode(recp).finish();
    const iv = Crypto.randomBytes(12);
    const retryKey = await getMediaRetryKey(mediaKey);
    const ciphertext = (0, crypto_1.aesEncryptGCM)(recpBuffer, retryKey, iv, Buffer.from(key.id));
    const req = {
        tag: 'receipt',
        attrs: {
            id: key.id,
            to: (0, WABinary_1.jidNormalizedUser)(meId),
            type: 'server-error'
        },
        content: [
            {
                tag: 'encrypt',
                attrs: {},
                content: [
                    { tag: 'enc_p', attrs: {}, content: ciphertext },
                    { tag: 'enc_iv', attrs: {}, content: iv }
                ]
            },
            {
                tag: 'rmr',
                attrs: {
                    jid: key.remoteJid,
                    'from_me': (!!key.fromMe).toString(),
                    participant: key.participant || undefined
                }
            }
        ]
    };
    return req;
};
exports.encryptMediaRetryRequest = encryptMediaRetryRequest;
const decodeMediaRetryNode = (node) => {
    const rmrNode = (0, WABinary_1.getBinaryNodeChild)(node, 'rmr');
    const event = {
        key: {
            id: node.attrs.id,
            remoteJid: rmrNode.attrs.jid,
            fromMe: rmrNode.attrs.from_me === 'true',
            participant: rmrNode.attrs.participant
        }
    };
    const errorNode = (0, WABinary_1.getBinaryNodeChild)(node, 'error');
    if (errorNode) {
        const errorCode = +errorNode.attrs.code;
        event.error = new boom_1.Boom(`Failed to re-upload media (${errorCode})`, { data: errorNode.attrs, statusCode: (0, exports.getStatusCodeForMediaRetry)(errorCode) });
    }
    else {
        const encryptedInfoNode = (0, WABinary_1.getBinaryNodeChild)(node, 'encrypt');
        const ciphertext = (0, WABinary_1.getBinaryNodeChildBuffer)(encryptedInfoNode, 'enc_p');
        const iv = (0, WABinary_1.getBinaryNodeChildBuffer)(encryptedInfoNode, 'enc_iv');
        if (ciphertext && iv) {
            event.media = { ciphertext, iv };
        }
        else {
            event.error = new boom_1.Boom('Failed to re-upload media (missing ciphertext)', { statusCode: 404 });
        }
    }
    return event;
};
exports.decodeMediaRetryNode = decodeMediaRetryNode;
const decryptMediaRetryData = async ({ ciphertext, iv }, mediaKey, msgId) => {
    const retryKey = await getMediaRetryKey(mediaKey);
    const plaintext = (0, crypto_1.aesDecryptGCM)(ciphertext, retryKey, iv, Buffer.from(msgId));
    return WAProto_1.proto.MediaRetryNotification.decode(plaintext);
};
exports.decryptMediaRetryData = decryptMediaRetryData;
const getStatusCodeForMediaRetry = (code) => MEDIA_RETRY_STATUS_MAP[code];
exports.getStatusCodeForMediaRetry = getStatusCodeForMediaRetry;
const MEDIA_RETRY_STATUS_MAP = {
    [WAProto_1.proto.MediaRetryNotification.ResultType.SUCCESS]: 200,
    [WAProto_1.proto.MediaRetryNotification.ResultType.DECRYPTION_ERROR]: 412,
    [WAProto_1.proto.MediaRetryNotification.ResultType.NOT_FOUND]: 404,
    [WAProto_1.proto.MediaRetryNotification.ResultType.GENERAL_ERROR]: 418,
};
function __importStar(arg0) {
    throw new Error('Function not implemented.');
}