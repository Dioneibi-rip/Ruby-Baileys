"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareAlbumMessageContent = exports.assertMediaContent = exports.downloadMediaMessage = exports.aggregateMessageKeysNotFromMe = exports.updateMessageWithPollUpdate = exports.updateMessageWithReaction = exports.updateMessageWithReceipt = exports.getDevice = exports.extractMessageContent = exports.normalizeMessageContent = exports.getContentType = exports.generateWAMessage = exports.generateWAMessageFromContent = exports.generateWAMessageContent = exports.generateForwardMessageContent = exports.prepareDisappearingMessageSettingContent = exports.prepareWAMessageMedia = exports.generateLinkPreviewIfRequired = exports.extractUrlFromText = void 0;
exports.getAggregateVotesInPollMessage = getAggregateVotesInPollMessage;
const boom_1 = require("@hapi/boom");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const WAProto_1 = require("../../WAProto");
const Defaults_1 = require("../Defaults");
const Types_1 = require("../Types");
const WABinary_1 = require("../WABinary");
const crypto_2 = require("./crypto");
const generics_1 = require("./generics");
const messages_media_1 = require("./messages-media");
const rich_message_utils_1 = require("./rich-message-utils");
const MIMETYPE_MAP = {
    image: 'image/jpeg',
    video: 'video/mp4',
    document: 'application/pdf',
    audio: 'audio/ogg; codecs=opus',
    sticker: 'image/webp',
    stickerPack: 'image/webp',
    'product-catalog-image': 'image/jpeg',
};
const MessageTypeProto = {
    'image': Types_1.WAProto.Message.ImageMessage,
    'video': Types_1.WAProto.Message.VideoMessage,
    'audio': Types_1.WAProto.Message.AudioMessage,
    'sticker': Types_1.WAProto.Message.StickerMessage,
    'document': Types_1.WAProto.Message.DocumentMessage,
};
const ButtonType = WAProto_1.proto.Message.ButtonsMessage.HeaderType;

const prepareNativeFlowButtons = (message) => {
    const buttons = message.nativeFlow || message.interactiveButtons || [];
    return Types_1.WAProto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
        buttons: buttons.map(button => ({
            name: button.name,
            buttonParamsJson: button.buttonParamsJson || button.paramsJson || '{}'
        })),
        messageParamsJson: message.messageParamsJson,
        messageVersion: message.messageVersion || 1
    });
};
const hasValidInteractiveHeader = (message) => !!(message.imageMessage || message.videoMessage || message.documentMessage || message.productMessage || message.locationMessage);
const hasValidCarouselHeader = (message) => !!(message.imageMessage || message.videoMessage || message.productMessage);
const hasOwn = (message, property) => Object.prototype.hasOwnProperty.call(message || {}, property);
const hasNonNullishProperty = (message, property) => hasOwn(message, property) && message[property] != null;
const isStickerPackWebPBuffer = (buf) => (buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50);
const applyExternalAdReplyLinkPreview = async (extendedTextMessage, externalAdReply, options) => {
    const sourceUrl = externalAdReply.sourceUrl || externalAdReply.url || externalAdReply.mediaUrl;
    if (!extendedTextMessage || !sourceUrl) {
        return;
    }
    extendedTextMessage.matchedText = extendedTextMessage.matchedText || sourceUrl;
    extendedTextMessage.title = extendedTextMessage.title || externalAdReply.title;
    extendedTextMessage.description = extendedTextMessage.description || externalAdReply.body || externalAdReply.subTitle;
    extendedTextMessage.previewType = typeof extendedTextMessage.previewType !== 'undefined'
        ? extendedTextMessage.previewType
        : (externalAdReply.previewType || externalAdReply.previewtype || 0);
    extendedTextMessage.inviteLinkGroupTypeV2 = extendedTextMessage.inviteLinkGroupTypeV2 || 0;
    const thumbnail = externalAdReply.thumbnail || externalAdReply.jpegThumbnail;
    if (!thumbnail) {
        return;
    }
    if (!Buffer.isBuffer(thumbnail)) {
        throw new boom_1.Boom('externalAdReply.thumbnail must be a Buffer', { statusCode: 400 });
    }
    extendedTextMessage.jpegThumbnail = extendedTextMessage.jpegThumbnail || thumbnail;
    if (!options.upload) {
        return;
    }
    try {
        const { imageMessage } = await (0, exports.prepareWAMessageMedia)({ image: thumbnail }, {
            ...options,
            mediaTypeOverride: 'thumbnail-link'
        });
        if (imageMessage) {
            extendedTextMessage.jpegThumbnail = imageMessage.jpegThumbnail || extendedTextMessage.jpegThumbnail;
            extendedTextMessage.thumbnailDirectPath = imageMessage.directPath;
            extendedTextMessage.thumbnailSha256 = imageMessage.fileSha256;
            extendedTextMessage.thumbnailEncSha256 = imageMessage.fileEncSha256;
            extendedTextMessage.mediaKey = imageMessage.mediaKey;
            extendedTextMessage.mediaKeyTimestamp = imageMessage.mediaKeyTimestamp;
            extendedTextMessage.thumbnailHeight = imageMessage.height;
            extendedTextMessage.thumbnailWidth = imageMessage.width;
        }
    }
    catch (error) {
        options.logger?.warn?.({ trace: error.stack }, 'failed to upload externalAdReply thumbnail-link preview');
    }
};
const isAnimatedStickerPackWebP = (buf) => {
    if (!isStickerPackWebPBuffer(buf)) {
        return false;
    }
    let offset = 12;
    while (offset < buf.length - 8) {
        const fourCC = buf.toString('ascii', offset, offset + 4);
        const chunkSize = buf.readUInt32LE(offset + 4);
        if (fourCC === 'VP8X') {
            const flagsOffset = offset + 8;
            if (flagsOffset < buf.length && (buf[flagsOffset] & 0x02)) {
                return true;
            }
        }
        else if (fourCC === 'ANIM' || fourCC === 'ANMF') {
            return true;
        }
        offset += 8 + chunkSize + (chunkSize % 2);
    }
    return false;
};
const getStickerPackStickerMedia = (sticker) => {
    if (sticker && typeof sticker === 'object' && !Buffer.isBuffer(sticker) && !(sticker instanceof Uint8Array)) {
        return sticker.data || sticker.sticker || sticker.media || sticker;
    }
    return sticker;
};
const prepareWAStickerPackMessage = async (message, options) => {
    const { zipSync } = require('fflate');
    const pack = message.stickerPack;
    const { stickers, cover, name, publisher, description } = pack;
    const stickerPackId = pack.packId || pack.stickerPackId || pack.id || (0, generics_1.generateMessageIDV2)();
    if (!cover) {
        throw new boom_1.Boom('stickerPack.cover is required', { statusCode: 400 });
    }
    if (!Array.isArray(stickers) || stickers.length === 0) {
        throw new boom_1.Boom('Sticker pack must contain at least one sticker', { statusCode: 400 });
    }
    if (stickers.length > 120) {
        throw new boom_1.Boom('Sticker pack exceeds the maximum limit of 120 stickers', { statusCode: 400 });
    }
    const _sharp = await import('sharp').catch(() => null);
    const lib = _sharp ? { sharp: _sharp } : null;
    const stickerData = {};
    const stickerPromises = stickers.map(async (sticker, index) => {
        const stickerMedia = getStickerPackStickerMedia(sticker);
        const { stream } = await (0, messages_media_1.getStream)(stickerMedia, options.options);
        const buffer = await (0, messages_media_1.toBuffer)(stream);
        let webpBuffer;
        let isAnimated = false;
        if (isStickerPackWebPBuffer(buffer)) {
            webpBuffer = buffer;
            isAnimated = isAnimatedStickerPackWebP(buffer);
        }
        else if (lib && 'sharp' in lib) {
            webpBuffer = await lib.sharp.default(buffer).webp().toBuffer();
        }
        else {
            webpBuffer = buffer;
        }
        if (webpBuffer.length > 1024 * 1024) {
            throw new boom_1.Boom(`Sticker at index ${index} exceeds the 1MB size limit`, { statusCode: 400 });
        }
        const fileName = `${index + 1}.webp`;
        stickerData[fileName] = [new Uint8Array(webpBuffer), { level: 0 }];
        const stickerObject = sticker && typeof sticker === 'object' && !Buffer.isBuffer(sticker) && !(sticker instanceof Uint8Array) ? sticker : {};
        return {
            fileName,
            mimetype: MIMETYPE_MAP.sticker,
            isAnimated: stickerObject.isAnimated !== undefined ? stickerObject.isAnimated : isAnimated,
            isLottie: stickerObject.isLottie || false,
            emojis: stickerObject.emojis || [],
            accessibilityLabel: stickerObject.accessibilityLabel || ''
        };
    });
    const stickerMetadata = await Promise.all(stickerPromises);
    const coverBuffer = await (0, messages_media_1.toBuffer)((await (0, messages_media_1.getStream)(cover, options.options)).stream);
    const coverFileName = pack.trayIconFileName || `${stickerPackId}.webp`;
    stickerData[coverFileName] = [new Uint8Array(coverBuffer), { level: 0 }];
    const zipBuffer = Buffer.from(zipSync(stickerData));
    const path_1 = require('path');
    const os_1 = require('os');
    const encryptBuffer = async (buf, mediaKey) => {
        const { cipherKey, iv, macKey } = await (0, messages_media_1.getMediaKeys)(mediaKey, 'sticker-pack');
        const aes = crypto_1.createCipheriv('aes-256-cbc', cipherKey, iv);
        const hmac = crypto_1.createHmac('sha256', macKey).update(iv);
        const encPart1 = aes.update(buf);
        const encPart2 = aes.final();
        hmac.update(encPart1).update(encPart2);
        const mac = hmac.digest().slice(0, 10);
        const encBody = Buffer.concat([encPart1, encPart2, mac]);
        const fileEncSha256 = crypto_1.createHash('sha256').update(encPart1).update(encPart2).update(mac).digest();
        return {
            encBody,
            fileSha256: crypto_1.createHash('sha256').update(buf).digest(),
            fileEncSha256
        };
    };
        const mediaKey = (0, crypto_1.randomBytes)(32);
    
    // 1. Subimos el ZIP usando el Buffer directamente (encBody)
    const zipEnc = await encryptBuffer(zipBuffer, mediaKey);
    const stickerPackUploadResult = await options.upload(zipEnc.encBody, {
        fileEncSha256B64: zipEnc.fileEncSha256.toString('base64'),
        mediaType: 'sticker',
        timeoutMs: options.mediaUploadTimeoutMs
    });
    
    // 2. Subimos el Thumbnail usando el Buffer directamente (encBody)
    const thumbEnc = await encryptBuffer(coverBuffer, mediaKey);
    const thumbUploadResult = await options.upload(thumbEnc.encBody, {
        fileEncSha256B64: thumbEnc.fileEncSha256.toString('base64'),
        mediaType: 'sticker',
        timeoutMs: options.mediaUploadTimeoutMs
    });
    
    const imageDataHash = (0, crypto_2.sha256)(coverBuffer).toString('base64');
    return Types_1.WAProto.Message.fromObject({
        stickerPackMessage: {
            name,
            publisher,
            stickerPackId,
            packDescription: pack.packDescription || description,
            stickerPackOrigin: (_a = pack.stickerPackOrigin) !== null && _a !== void 0 ? _a : Types_1.WAProto.Message.StickerPackMessage.StickerPackOrigin.USER_CREATED,
            stickerPackSize: zipBuffer.length,
            stickers: stickerMetadata,
            fileSha256: zipEnc.fileSha256,
            fileEncSha256: zipEnc.fileEncSha256,
            mediaKey,
            directPath: stickerPackUploadResult.directPath,
            fileLength: zipBuffer.length,
            mediaKeyTimestamp: (0, generics_1.unixTimestampSeconds)(),
            trayIconFileName: coverFileName,
            imageDataHash: pack.imageDataHash || imageDataHash,
            thumbnailDirectPath: thumbUploadResult.directPath,
            thumbnailSha256: thumbEnc.fileSha256,
            thumbnailEncSha256: thumbEnc.fileEncSha256,
            thumbnailHeight: pack.thumbnailHeight || pack.coverHeight || 96,
            thumbnailWidth: pack.thumbnailWidth || pack.coverWidth || 96,
            caption: pack.caption,
            contextInfo: {
                ...((message === null || message === void 0 ? void 0 : message.contextInfo) || pack.contextInfo || {}),
                ...(message.mentions ? { mentionedJid: message.mentions } : {})
            }
        }
    });
};
/**
 * Uses a regex to test whether the string contains a URL, and returns the URL if it does.
 * @param text eg. hello https://google.com
 * @returns the URL, eg. https://google.com
 */
const extractUrlFromText = (text) => { var _a; return (_a = text.match(Defaults_1.URL_REGEX)) === null || _a === void 0 ? void 0 : _a[0]; };
exports.extractUrlFromText = extractUrlFromText;
const generateLinkPreviewIfRequired = async (text, getUrlInfo, logger) => {
    const url = (0, exports.extractUrlFromText)(text);
    if (!!getUrlInfo && url) {
        try {
            const urlInfo = await getUrlInfo(url);
            return urlInfo;
        }
        catch (error) { // ignore if fails
            logger === null || logger === void 0 ? void 0 : logger.warn({ trace: error.stack }, 'url generation failed');
        }
    }
};
exports.generateLinkPreviewIfRequired = generateLinkPreviewIfRequired;
const assertColor = async (color) => {
    let assertedColor;
    if (typeof color === 'number') {
        assertedColor = color > 0 ? color : 0xffffffff + Number(color) + 1;
    }
    else {
        let hex = color.trim().replace('#', '');
        if (hex.length <= 6) {
            hex = 'FF' + hex.padStart(6, '0');
        }
        assertedColor = parseInt(hex, 16);
        return assertedColor;
    }
};
const prepareWAMessageMedia = async (message, options) => {
    if ('stickerPack' in message) {
        return prepareWAStickerPackMessage(message, options);
    }
    const logger = options.logger;
    let mediaType;
    for (const key of Defaults_1.MEDIA_KEYS) {
        if (key in message) {
            mediaType = key;
        }
    }
    if (!mediaType) {
        throw new boom_1.Boom('Invalid media type', { statusCode: 400 });
    }
    const uploadData = {
        ...message,
        media: message[mediaType]
    };
    delete uploadData[mediaType];
    // check if cacheable + generate cache key
    const cacheableKey = typeof uploadData.media === 'object' &&
        ('url' in uploadData.media) &&
        !!uploadData.media.url &&
        !!options.mediaCache && (
    // generate the key
    mediaType + ':' + uploadData.media.url.toString());
    if (mediaType === 'document' && !uploadData.fileName) {
        uploadData.fileName = 'file';
    }
    if (!uploadData.mimetype) {
        uploadData.mimetype = MIMETYPE_MAP[mediaType];
    }
    // check for cache hit
    if (cacheableKey) {
        const mediaBuff = options.mediaCache.get(cacheableKey);
        if (mediaBuff) {
            logger === null || logger === void 0 ? void 0 : logger.debug({ cacheableKey }, 'got media cache hit');
            const obj = Types_1.WAProto.Message.decode(mediaBuff);
            const key = `${mediaType}Message`;
            Object.assign(obj[key], { ...uploadData, media: undefined });
            return obj;
        }
    }
    const requiresDurationComputation = mediaType === 'audio' && typeof uploadData.seconds === 'undefined';
    const requiresThumbnailComputation = (mediaType === 'image' || mediaType === 'video') &&
        (typeof uploadData['jpegThumbnail'] === 'undefined');
    const requiresWaveformProcessing = mediaType === 'audio' && uploadData.ptt === true;
    const requiresAudioBackground = options.backgroundColor && mediaType === 'audio' && uploadData.ptt === true;
    const requiresOriginalForSomeProcessing = requiresDurationComputation || requiresThumbnailComputation;
    const { mediaKey, encWriteStream, bodyPath, fileEncSha256, fileSha256, fileLength, didSaveToTmpPath, } = await (options.newsletter ? messages_media_1.prepareStream : messages_media_1.encryptedStream)(uploadData.media, options.mediaTypeOverride || mediaType, {
        logger,
        saveOriginalFileIfRequired: requiresOriginalForSomeProcessing,
        opts: options.options
    });
    // url safe Base64 encode the SHA256 hash of the body
    const fileEncSha256B64 = (options.newsletter ? fileSha256 : fileEncSha256 !== null && fileEncSha256 !== void 0 ? fileEncSha256 : fileSha256).toString('base64');
    const [{ mediaUrl, directPath, handle, thumbnailDirectPath, thumbnailSha256 }] = await Promise.all([
        (async () => {
            const result = await options.upload(encWriteStream, { fileEncSha256B64, mediaType, timeoutMs: options.mediaUploadTimeoutMs, newsletter: !!options.newsletter });
            logger === null || logger === void 0 ? void 0 : logger.debug({ mediaType, cacheableKey }, 'uploaded media');
            return result;
        })(),
        (async () => {
            try {
                if (requiresThumbnailComputation) {
                    const { thumbnail, originalImageDimensions } = await (0, messages_media_1.generateThumbnail)(bodyPath, mediaType, options);
                    uploadData.jpegThumbnail = thumbnail;
                    if (!uploadData.width && originalImageDimensions) {
                        uploadData.width = originalImageDimensions.width;
                        uploadData.height = originalImageDimensions.height;
                        logger === null || logger === void 0 ? void 0 : logger.debug('set dimensions');
                    }
                    logger === null || logger === void 0 ? void 0 : logger.debug('generated thumbnail');
                }
                if (requiresDurationComputation) {
                    uploadData.seconds = await (0, messages_media_1.getAudioDuration)(bodyPath);
                    logger === null || logger === void 0 ? void 0 : logger.debug('computed audio duration');
                }
                if (requiresWaveformProcessing) {
                    uploadData.waveform = await (0, messages_media_1.getAudioWaveform)(bodyPath, logger);
                    logger === null || logger === void 0 ? void 0 : logger.debug('processed waveform');
                }
                if (requiresAudioBackground) {
                    uploadData.backgroundArgb = await assertColor(options.backgroundColor);
                    logger === null || logger === void 0 ? void 0 : logger.debug('computed backgroundColor audio status');
                }
            }
            catch (error) {
                logger === null || logger === void 0 ? void 0 : logger.warn({ trace: error.stack }, 'failed to obtain extra info');
            }
        })(),
    ])
        .finally(async () => {
        if (!Buffer.isBuffer(encWriteStream)) {
            encWriteStream.destroy();
        }
        // remove tmp files
        if (didSaveToTmpPath && bodyPath) {
            try {
                await fs_1.promises.access(bodyPath);
                await fs_1.promises.unlink(bodyPath);
                logger === null || logger === void 0 ? void 0 : logger.debug('removed tmp file');
            }
            catch (error) {
                logger === null || logger === void 0 ? void 0 : logger.warn('failed to remove tmp file');
            }
        }
    });
    const obj = Types_1.WAProto.Message.fromObject({
        [`${mediaType}Message`]: MessageTypeProto[mediaType].fromObject({
            url: handle ? undefined : mediaUrl,
            directPath,
            mediaKey: mediaKey,
            fileEncSha256: fileEncSha256,
            fileSha256,
            thumbnailDirectPath,
            thumbnailSha256,
            fileLength,
            mediaKeyTimestamp: handle ? undefined : (0, generics_1.unixTimestampSeconds)(),
            ...uploadData,
            media: undefined
        })
    });
    if (uploadData.ptv) {
        obj.ptvMessage = obj.videoMessage;
        delete obj.videoMessage;
    }
    if (cacheableKey) {
        logger === null || logger === void 0 ? void 0 : logger.debug({ cacheableKey }, 'set cache');
        options.mediaCache.set(cacheableKey, Types_1.WAProto.Message.encode(obj).finish());
    }
    return obj;
};
exports.prepareWAMessageMedia = prepareWAMessageMedia;
const prepareDisappearingMessageSettingContent = (ephemeralExpiration) => {
    ephemeralExpiration = ephemeralExpiration || 0;
    const content = {
        ephemeralMessage: {
            message: {
                protocolMessage: {
                    type: Types_1.WAProto.Message.ProtocolMessage.Type.EPHEMERAL_SETTING,
                    ephemeralExpiration
                }
            }
        }
    };
    return Types_1.WAProto.Message.fromObject(content);
};
exports.prepareDisappearingMessageSettingContent = prepareDisappearingMessageSettingContent;
/**
 * Generate forwarded message content like WA does
 * @param message the message to forward
 * @param options.forceForward will show the message as forwarded even if it is from you
 */
const generateForwardMessageContent = (message, forceForward) => {
    var _a;
    let content = message.message;
    if (!content) {
        throw new boom_1.Boom('no content in message', { statusCode: 400 });
    }
    // hacky copy
    content = (0, exports.normalizeMessageContent)(content);
    content = WAProto_1.proto.Message.decode(WAProto_1.proto.Message.encode(content).finish());
    let key = Object.keys(content)[0];
    let score = ((_a = content[key].contextInfo) === null || _a === void 0 ? void 0 : _a.forwardingScore) || 0;
    score += message.key.fromMe && !forceForward ? 0 : 1;
    if (key === 'conversation') {
        content.extendedTextMessage = { text: content[key] };
        delete content.conversation;
        key = 'extendedTextMessage';
    }
    if (score > 0) {
        content[key].contextInfo = { forwardingScore: score, isForwarded: true };
    }
    else {
        content[key].contextInfo = {};
    }
    return content;
};
exports.generateForwardMessageContent = generateForwardMessageContent;
const generateWAMessageContent = async (message, options) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    var _p, _q;
    let m = {};
    if ('raw' in message && message.raw) {
        const { raw, ...rawMessage } = message;
        return rawMessage;
    }
    if (hasNonNullishProperty(message, 'code') ||
        hasNonNullishProperty(message, 'links') ||
        hasNonNullishProperty(message, 'table') ||
        hasNonNullishProperty(message, 'richResponse')) {
        m = (0, rich_message_utils_1.prepareRichResponseMessage)(message);
    }
    else if ('text' in message) {
        const extContent = { text: message.text };
        let urlInfo = message.linkPreview;
        if (typeof urlInfo === 'undefined') {
            urlInfo = await (0, exports.generateLinkPreviewIfRequired)(message.text, options.getUrlInfo, options.logger);
        }
        if (urlInfo) {
            extContent.matchedText = urlInfo['matched-text'];
            extContent.jpegThumbnail = urlInfo.jpegThumbnail;
            extContent.description = urlInfo.description;
            extContent.title = urlInfo.title;
            extContent.previewType = 0;
            const img = urlInfo.highQualityThumbnail;
            if (img) {
                extContent.thumbnailDirectPath = img.directPath;
                extContent.mediaKey = img.mediaKey;
                extContent.mediaKeyTimestamp = img.mediaKeyTimestamp;
                extContent.thumbnailWidth = img.width;
                extContent.thumbnailHeight = img.height;
                extContent.thumbnailSha256 = img.fileSha256;
                extContent.thumbnailEncSha256 = img.fileEncSha256;
            }
        }
        if (options.backgroundColor) {
            extContent.backgroundArgb = await assertColor(options.backgroundColor);
        }
        if (options.font) {
            extContent.font = options.font;
        }
        m.extendedTextMessage = extContent;
    }
    else if ('contacts' in message) {
        const contactLen = message.contacts.contacts.length;
        if (!contactLen) {
            throw new boom_1.Boom('require atleast 1 contact', { statusCode: 400 });
        }
        if (contactLen === 1) {
            m.contactMessage = Types_1.WAProto.Message.ContactMessage.fromObject(message.contacts.contacts[0]);
        }
        else {
            m.contactsArrayMessage = Types_1.WAProto.Message.ContactsArrayMessage.fromObject(message.contacts);
        }
    }
    else if ('location' in message) {
        m.locationMessage = Types_1.WAProto.Message.LocationMessage.fromObject(message.location);
    }
    else if ('react' in message) {
        if (!message.react.senderTimestampMs) {
            message.react.senderTimestampMs = Date.now();
        }
        m.reactionMessage = Types_1.WAProto.Message.ReactionMessage.fromObject(message.react);
    }
    else if ('delete' in message) {
        m.protocolMessage = {
            key: message.delete,
            type: Types_1.WAProto.Message.ProtocolMessage.Type.REVOKE
        };
    }
    else if ('forward' in message) {
        m = (0, exports.generateForwardMessageContent)(message.forward, message.force);
    }
    else if ('disappearingMessagesInChat' in message) {
        const exp = typeof message.disappearingMessagesInChat === 'boolean' ?
            (message.disappearingMessagesInChat ? Defaults_1.WA_DEFAULT_EPHEMERAL : 0) :
            message.disappearingMessagesInChat;
        m = (0, exports.prepareDisappearingMessageSettingContent)(exp);
    }
    else if ('groupInvite' in message) {
        m.groupInviteMessage = {};
        m.groupInviteMessage.inviteCode = message.groupInvite.inviteCode;
        m.groupInviteMessage.inviteExpiration = message.groupInvite.inviteExpiration;
        m.groupInviteMessage.caption = message.groupInvite.text;
        m.groupInviteMessage.groupJid = message.groupInvite.jid;
        m.groupInviteMessage.groupName = message.groupInvite.subject;
        //TODO: use built-in interface and get disappearing mode info etc.
        //TODO: cache / use store!?
        if (options.getProfilePicUrl) {
            const pfpUrl = await options.getProfilePicUrl(message.groupInvite.jid, 'preview');
            if (pfpUrl) {
                const resp = await fetch(pfpUrl);
                if (resp.ok) {
                    m.groupInviteMessage.jpegThumbnail = Buffer.from(await resp.arrayBuffer());
                }
            }
        }
    }
    else if ('pin' in message) {
        m.pinInChatMessage = {};
        m.messageContextInfo = {};
        m.pinInChatMessage.key = message.pin;
        m.pinInChatMessage.type = message.type;
        m.pinInChatMessage.senderTimestampMs = Date.now();
        m.messageContextInfo.messageAddOnDurationInSecs = message.type === 1 ? message.time || 86400 : 0;
    }
    else if ('keep' in message) {
        m.keepInChatMessage = {};
        m.keepInChatMessage.key = message.keep;
        m.keepInChatMessage.keepType = message.type;
        m.keepInChatMessage.timestampMs = Date.now();
    }
    else if ('call' in message) {
        m = {
            scheduledCallCreationMessage: {
                scheduledTimestampMs: (_a = message.call.time) !== null && _a !== void 0 ? _a : Date.now(),
                callType: (_b = message.call.type) !== null && _b !== void 0 ? _b : 1,
                title: message.call.title
            }
        };
    }
    else if ('paymentInvite' in message) {
        m.paymentInviteMessage = {
            serviceType: message.paymentInvite.type,
            expiryTimestamp: message.paymentInvite.expiry
        };
    }
    else if ('buttonReply' in message) {
        switch (message.type) {
            case 'template':
                m.templateButtonReplyMessage = {
                    selectedDisplayText: message.buttonReply.displayText,
                    selectedId: message.buttonReply.id,
                    selectedIndex: message.buttonReply.index,
                };
                break;
            case 'plain':
                m.buttonsResponseMessage = {
                    selectedButtonId: message.buttonReply.id,
                    selectedDisplayText: message.buttonReply.displayText,
                    type: WAProto_1.proto.Message.ButtonsResponseMessage.Type.DISPLAY_TEXT,
                };
                break;
        }
    }
    else if ('ptv' in message && message.ptv) {
        const { videoMessage } = await (0, exports.prepareWAMessageMedia)({ video: message.video }, options);
        m.ptvMessage = videoMessage;
    }
    else if ('product' in message) {
        const { imageMessage } = await (0, exports.prepareWAMessageMedia)({ image: message.product.productImage }, options);
        m.productMessage = Types_1.WAProto.Message.ProductMessage.fromObject({
            ...message,
            product: {
                ...message.product,
                productImage: imageMessage,
            }
        });
    }
    else if ('order' in message) {
        m.orderMessage = Types_1.WAProto.Message.OrderMessage.fromObject({
            orderId: message.order.id,
            thumbnail: message.order.thumbnail,
            itemCount: message.order.itemCount,
            status: message.order.status,
            surface: message.order.surface,
            orderTitle: message.order.title,
            message: message.order.text,
            sellerJid: message.order.seller,
            token: message.order.token,
            totalAmount1000: message.order.amount,
            totalCurrencyCode: message.order.currency
        });
    }
    else if ('listReply' in message) {
        m.listResponseMessage = { ...message.listReply };
    }
    else if ('poll' in message) {
        (_p = message.poll).selectableCount || (_p.selectableCount = 0);
        (_q = message.poll).toAnnouncementGroup || (_q.toAnnouncementGroup = false);
        if (!Array.isArray(message.poll.values)) {
            throw new boom_1.Boom('Invalid poll values', { statusCode: 400 });
        }
        if (message.poll.selectableCount < 0
            || message.poll.selectableCount > message.poll.values.length) {
            throw new boom_1.Boom(`poll.selectableCount in poll should be >= 0 and <= ${message.poll.values.length}`, { statusCode: 400 });
        }
        m.messageContextInfo = {
            // encKey
            messageSecret: message.poll.messageSecret || (0, crypto_1.randomBytes)(32),
        };
        const pollCreationMessage = {
            name: message.poll.name,
            selectableOptionsCount: message.poll.selectableCount,
            options: message.poll.values.map(optionName => ({ optionName })),
        };
        if (message.poll.toAnnouncementGroup) {
            // poll v2 is for community announcement groups (single select and multiple)
            m.pollCreationMessageV2 = pollCreationMessage;
        }
        else {
            if (message.poll.selectableCount === 1) {
                // poll v3 is for single select polls
                m.pollCreationMessageV3 = pollCreationMessage;
            }
            else {
                // poll for multiple choice polls
                m.pollCreationMessage = pollCreationMessage;
            }
        }
    }
    else if ('event' in message) {
        m.messageContextInfo = {
            messageSecret: message.event.messageSecret || (0, crypto_1.randomBytes)(32),
        };
        m.eventMessage = { ...message.event };
    }
    else if ('inviteAdmin' in message) {
        m.newsletterAdminInviteMessage = {};
        m.newsletterAdminInviteMessage.inviteExpiration = message.inviteAdmin.inviteExpiration;
        m.newsletterAdminInviteMessage.caption = message.inviteAdmin.text;
        m.newsletterAdminInviteMessage.newsletterJid = message.inviteAdmin.jid;
        m.newsletterAdminInviteMessage.newsletterName = message.inviteAdmin.subject;
        m.newsletterAdminInviteMessage.jpegThumbnail = message.inviteAdmin.thumbnail;
    }
    else if ('requestPayment' in message) {
        const sticker = ((_c = message === null || message === void 0 ? void 0 : message.requestPayment) === null || _c === void 0 ? void 0 : _c.sticker) ?
            await (0, exports.prepareWAMessageMedia)({ sticker: (_d = message === null || message === void 0 ? void 0 : message.requestPayment) === null || _d === void 0 ? void 0 : _d.sticker, ...options }, options)
            : null;
        let notes = {};
        if ((_e = message === null || message === void 0 ? void 0 : message.requestPayment) === null || _e === void 0 ? void 0 : _e.sticker) {
            notes = {
                stickerMessage: {
                    ...sticker === null || sticker === void 0 ? void 0 : sticker.stickerMessage,
                    contextInfo: (_f = message === null || message === void 0 ? void 0 : message.requestPayment) === null || _f === void 0 ? void 0 : _f.contextInfo
                }
            };
        }
        else if (message.requestPayment.note) {
            notes = {
                extendedTextMessage: {
                    text: message.requestPayment.note,
                    contextInfo: (_g = message === null || message === void 0 ? void 0 : message.requestPayment) === null || _g === void 0 ? void 0 : _g.contextInfo,
                }
            };
        }
        else {
            throw new boom_1.Boom('Invalid media type', { statusCode: 400 });
        }
        m.requestPaymentMessage = Types_1.WAProto.Message.RequestPaymentMessage.fromObject({
            expiryTimestamp: message.requestPayment.expiry,
            amount1000: message.requestPayment.amount,
            currencyCodeIso4217: message.requestPayment.currency,
            requestFrom: message.requestPayment.from,
            noteMessage: { ...notes },
            background: (_h = message.requestPayment.background) !== null && _h !== void 0 ? _h : null,
        });
    }
    else if ('sharePhoneNumber' in message) {
        m.protocolMessage = {
            type: WAProto_1.proto.Message.ProtocolMessage.Type.SHARE_PHONE_NUMBER
        };
    }
    else if ('requestPhoneNumber' in message) {
        m.requestPhoneNumberMessage = {};
    }
    else if ('album' in message) {
        const imageMessages = message.album.filter(item => 'image' in item);
        const videoMessages = message.album.filter(item => 'video' in item);
        m.albumMessage = WAProto_1.proto.Message.AlbumMessage.fromObject({
            expectedImageCount: imageMessages.length,
            expectedVideoCount: videoMessages.length,
        });
    }
    else if ('document' in message) {
        m = await (0, exports.prepareWAMessageMedia)(message, options);
        if (m.documentMessage) {
            if (typeof message.pageCount !== 'undefined') {
                m.documentMessage.pageCount = message.pageCount;
            }
            if (typeof message.jpegThumbnail !== 'undefined') {
                m.documentMessage.jpegThumbnail = typeof message.jpegThumbnail === 'string'
                    ? Buffer.from(message.jpegThumbnail, 'base64')
                    : message.jpegThumbnail;
            }
        }
    }
    else {
        m = await (0, exports.prepareWAMessageMedia)(message, options);
    }
    const adReplyContent = hasNonNullishProperty(message, 'externalAdReply')
        ? message.externalAdReply
        : message.contextInfo?.externalAdReply;
    if (adReplyContent) {
        const messageType = Object.keys(m)[0];
        const key = m[messageType];
        const content = { ...adReplyContent };
        const sourceUrl = content.sourceUrl || content.url || content.mediaUrl || 'https://github.com/Dioneibi-rip/Ruby-baileys';
        const thumbnail = content.thumbnail || content.jpegThumbnail;
        if (thumbnail && !Buffer.isBuffer(thumbnail)) {
            throw new boom_1.Boom('externalAdReply.thumbnail must be a Buffer', { statusCode: 400 });
        }
        if (m.extendedTextMessage) {
            await applyExternalAdReplyLinkPreview(m.extendedTextMessage, { ...content, sourceUrl, thumbnail }, options);
        }
        const externalAdReply = {
            ...content,
            body: content.body || content.subTitle,
            mediaType: content.mediaType || content.mediatype || 1,
            previewType: content.previewType || content.previewtype || 0,
            mediaUrl: content.mediaUrl || sourceUrl,
            renderLargerThumbnail: typeof content.renderLargerThumbnail !== 'undefined' ? content.renderLargerThumbnail : (typeof content.renderlargerthumbnail !== 'undefined' ? content.renderlargerthumbnail : content.largeThumbnail),
            sourceUrl,
            thumbnail,
            jpegThumbnail: content.jpegThumbnail || thumbnail,
            thumbnailUrl: content.thumbnailUrl || (sourceUrl ? `${sourceUrl}?update=${Date.now()}` : undefined),
            title: content.title || 'Ruby-Baileys'
        };
        delete externalAdReply.subTitle;
        delete externalAdReply.largeThumbnail;
        delete externalAdReply.url;
        delete externalAdReply.mediatype;
        delete externalAdReply.previewtype;
        delete externalAdReply.renderlargerthumbnail;
        if (key) {
            key.contextInfo = key.contextInfo || {};
            key.contextInfo.externalAdReply = { ...key.contextInfo.externalAdReply, ...externalAdReply };
        }
    }
    if ('buttons' in message && !!message.buttons) {
        const buttonsMessage = {
            buttons: message.buttons.map(b => ({ ...b, type: WAProto_1.proto.Message.ButtonsMessage.Button.Type.RESPONSE }))
        };
        if ('text' in message) {
            buttonsMessage.contentText = message.text;
            buttonsMessage.headerType = ButtonType.EMPTY;
        }
        else {
            if ('caption' in message) {
                buttonsMessage.contentText = message.caption;
            }
            const type = Object.keys(m)[0].replace('Message', '').toUpperCase();
            buttonsMessage.headerType = ButtonType[type];
            Object.assign(buttonsMessage, m);
        }
        if ('title' in message && !!message.title) {
            buttonsMessage.text = message.title,
                buttonsMessage.headerType = ButtonType.TEXT;
        }
        if ('footer' in message && !!message.footer) {
            buttonsMessage.footerText = message.footer;
        }
        if ('contextInfo' in message && !!message.contextInfo) {
            buttonsMessage.contextInfo = message.contextInfo;
        }
        if ('mentions' in message && !!message.mentions) {
            buttonsMessage.contextInfo = { mentionedJid: message.mentions };
        }
        m = { buttonsMessage };
    }
    else if ('templateButtons' in message && !!message.templateButtons) {
        const msg = {
            hydratedButtons: message.hasOwnProperty("templateButtons") ? message.templateButtons : message.templateButtons
        };
        if ('text' in message) {
            msg.hydratedContentText = message.text;
        }
        else {
            if ('caption' in message) {
                msg.hydratedContentText = message.caption;
            }
            Object.assign(msg, m);
        }
        if ('footer' in message && !!message.footer) {
            msg.hydratedFooterText = message.footer;
        }
        m = {
            templateMessage: {
                fourRowTemplate: msg,
                hydratedTemplate: msg
            }
        };
    }
    if ('sections' in message && !!message.sections) {
        const listMessage = {
            sections: message.sections,
            buttonText: message.buttonText,
            title: message.title,
            footerText: message.footer,
            description: message.text,
            listType: WAProto_1.proto.Message.ListMessage.ListType.SINGLE_SELECT
        };
        m = { listMessage };
    }
    if ('nativeFlow' in message && !!message.nativeFlow) {
        const interactiveMessage = {
            nativeFlowMessage: prepareNativeFlowButtons(message)
        };
        if ('bizJid' in message && !!message.bizJid) {
            interactiveMessage.collectionMessage = {
                bizJid: message.bizJid,
                id: message.id,
                messageVersion: 1
            };
        }
        else if ('shopSurface' in message && !!message.shopSurface) {
            interactiveMessage.shopStorefrontMessage = {
                surface: message.shopSurface,
                id: message.id,
                messageVersion: 1
            };
        }
        if ('text' in message) {
            interactiveMessage.body = { text: message.text };
        }
        else {
            if ('caption' in message) {
                const isValidHeader = hasValidInteractiveHeader(m);
                if (!isValidHeader) {
                    throw new boom_1.Boom('Invalid media type for interactive message header', { statusCode: 400 });
                }
                interactiveMessage.header = {
                    title: message.title || '',
                    subtitle: message.subtitle || '',
                    hasMediaAttachment: isValidHeader
                };
                interactiveMessage.body = { text: message.caption };
            }
            if ('thumbnail' in message && !!message.thumbnail) {
                interactiveMessage.jpegThumbnail = message.thumbnail;
            }
            Object.assign(interactiveMessage.header || (interactiveMessage.header = {}), m);
        }
        if ('footer' in message && !!message.footer) {
            interactiveMessage.footer = { text: message.footer };
        }
        if ('contextInfo' in message && !!message.contextInfo) {
            interactiveMessage.contextInfo = message.contextInfo;
        }
        if ('mentions' in message && !!message.mentions) {
            interactiveMessage.contextInfo = { mentionedJid: message.mentions };
        }
        m = { interactiveMessage };
    }
    else if ('cards' in message && !!message.cards) {
const slides=await Promise.all(message.cards.map(async(slide)=>{
const{image,video,product,title,body,footer,buttons}=slide;
let header;
if(product){
const{imageMessage}=await(0,exports.prepareWAMessageMedia)({image:product.productImage,...options},options);
header={productMessage:{product:{...product,productImage:imageMessage},...slide}};
}else if(image){
header=await(0,exports.prepareWAMessageMedia)({image:image,...options},options);
}else if(video){
header=await(0,exports.prepareWAMessageMedia)({video:video,...options},options);
}
const nativeFlowMessage = Types_1.WAProto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: buttons || [] });
return Types_1.WAProto.Message.InteractiveMessage.fromObject({header:{title,hasMediaAttachment:true,...header},body:{text:body},footer:{text:footer},nativeFlowMessage});
}));
const interactiveMessage=Types_1.WAProto.Message.InteractiveMessage.fromObject({carouselMessage:{cards:slides}});
if('text'in message){
interactiveMessage.body={text:message.text};
interactiveMessage.header={title:message.title,subtitle:message.subtitle,hasMediaAttachment:false};
}
if('footer'in message&&!!message.footer){
interactiveMessage.footer={text:message.footer};
}
interactiveMessage.contextInfo={...(message.contextInfo||{}),...(message.mentions?{mentionedJid:message.mentions}:{})};
m={interactiveMessage};
}
    else if ('interactiveButtons' in message && !!message.interactiveButtons) {
        const interactiveMessage = {
            nativeFlowMessage: Types_1.WAProto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                buttons: message.interactiveButtons,
            })
        };
        if ('text' in message) {
            interactiveMessage.body = {
                text: message.text
            };
        }
        else if ('caption' in message) {
            interactiveMessage.body = {
                text: message.caption
            };
            interactiveMessage.header = {
                title: message.title,
                subtitle: message.subtitle,
                hasMediaAttachment: (_j = message === null || message === void 0 ? void 0 : message.media) !== null && _j !== void 0 ? _j : false,
            };
            Object.assign(interactiveMessage.header, m);
        }
        if ('footer' in message && !!message.footer) {
            interactiveMessage.footer = {
                text: message.footer
            };
        }
        if ('title' in message && !!message.title) {
            interactiveMessage.header = {
                title: message.title,
                subtitle: message.subtitle,
                hasMediaAttachment: (_k = message === null || message === void 0 ? void 0 : message.media) !== null && _k !== void 0 ? _k : false,
            };
            Object.assign(interactiveMessage.header, m);
        }
        if ('contextInfo' in message && !!message.contextInfo) {
            interactiveMessage.contextInfo = message.contextInfo;
        }
        if ('mentions' in message && !!message.mentions) {
            interactiveMessage.contextInfo = { mentionedJid: message.mentions };
        }
        m = { interactiveMessage };
    }
    if ('shop' in message && !!message.shop) {
        const interactiveMessage = {
            shopStorefrontMessage: Types_1.WAProto.Message.InteractiveMessage.ShopMessage.fromObject({
                surface: message.shop,
                id: message.id
            })
        };
        if ('text' in message) {
            interactiveMessage.body = {
                text: message.text
            };
        }
        else if ('caption' in message) {
            interactiveMessage.body = {
                text: message.caption
            };
            interactiveMessage.header = {
                title: message.title,
                subtitle: message.subtitle,
                hasMediaAttachment: (_l = message === null || message === void 0 ? void 0 : message.media) !== null && _l !== void 0 ? _l : false,
            };
            Object.assign(interactiveMessage.header, m);
        }
        if ('footer' in message && !!message.footer) {
            interactiveMessage.footer = {
                text: message.footer
            };
        }
        if ('title' in message && !!message.title) {
            interactiveMessage.header = {
                title: message.title,
                subtitle: message.subtitle,
                hasMediaAttachment: (_m = message === null || message === void 0 ? void 0 : message.media) !== null && _m !== void 0 ? _m : false,
            };
            Object.assign(interactiveMessage.header, m);
        }
        if ('contextInfo' in message && !!message.contextInfo) {
            interactiveMessage.contextInfo = message.contextInfo;
        }
        if ('mentions' in message && !!message.mentions) {
            interactiveMessage.contextInfo = { mentionedJid: message.mentions };
        }
        m = { interactiveMessage };
    }
    if ('viewOnce' in message && !!message.viewOnce) {
        m = { viewOnceMessage: { message: m } };
    }
    if ('mentions' in message && ((_o = message.mentions) === null || _o === void 0 ? void 0 : _o.length)) {
        const [messageType] = Object.keys(m);
        m[messageType] = m[messageType] || {};
        m[messageType].contextInfo = m[messageType].contextInfo || {};
        m[messageType].contextInfo.mentionedJid = message.mentions;
    }
    if ('edit' in message) {
        m = {
            protocolMessage: {
                key: message.edit,
                editedMessage: m,
                timestampMs: Date.now(),
                type: Types_1.WAProto.Message.ProtocolMessage.Type.MESSAGE_EDIT
            }
        };
    }
    if ('contextInfo' in message && !!message.contextInfo) {
        const [messageType] = Object.keys(m);
        m[messageType] = m[messageType] || {};
        m[messageType].contextInfo = {
            ...message.contextInfo,
            ...m[messageType].contextInfo,
            externalAdReply: m[messageType].contextInfo?.externalAdReply || message.contextInfo.externalAdReply
        };
    }
    return Types_1.WAProto.Message.fromObject(m);
};
exports.generateWAMessageContent = generateWAMessageContent;
const generateWAMessageFromContent = (jid, message, options) => {
    // set timestamp to now
    // if not specified
    if (!options.timestamp) {
        options.timestamp = new Date();
    }
    const innerMessage = (0, exports.normalizeMessageContent)(message);
    const key = (0, exports.getContentType)(innerMessage);
    const timestamp = (0, generics_1.unixTimestampSeconds)(options.timestamp);
    const { quoted, userJid } = options;
    // only set quoted if isn't a newsletter message
    if (quoted && !(0, WABinary_1.isJidNewsletter)(jid)) {
        const participant = quoted.key.fromMe ? userJid : (quoted.participant || quoted.key.participant || quoted.key.remoteJid);
        let quotedMsg = (0, exports.normalizeMessageContent)(quoted.message);
        const msgType = (0, exports.getContentType)(quotedMsg);
        // strip any redundant properties
        if (quotedMsg) {
            quotedMsg = WAProto_1.proto.Message.fromObject({ [msgType]: quotedMsg[msgType] });
            const quotedContent = quotedMsg[msgType];
            if (typeof quotedContent === 'object' && quotedContent && 'contextInfo' in quotedContent) {
                delete quotedContent.contextInfo;
            }
            const contextInfo = innerMessage[key].contextInfo || {};
            contextInfo.participant = (0, WABinary_1.jidNormalizedUser)(participant);
            contextInfo.stanzaId = quoted.key.id;
            contextInfo.quotedMessage = quotedMsg;
            // if a participant is quoted, then it must be a group
            // hence, remoteJid of group must also be entered
            if (jid !== quoted.key.remoteJid) {
                contextInfo.remoteJid = quoted.key.remoteJid;
            }
            innerMessage[key].contextInfo = contextInfo;
        }
    }
    if (
    // if we want to send a disappearing message
    !!(options === null || options === void 0 ? void 0 : options.ephemeralExpiration) &&
        // and it's not a protocol message -- delete, toggle disappear message
        key !== 'protocolMessage' &&
        // already not converted to disappearing message
        key !== 'ephemeralMessage' &&
        // newsletter not accept disappearing messages
        !(0, WABinary_1.isJidNewsletter)(jid)) {
        innerMessage[key].contextInfo = {
            ...(innerMessage[key].contextInfo || {}),
            expiration: options.ephemeralExpiration || Defaults_1.WA_DEFAULT_EPHEMERAL,
            //ephemeralSettingTimestamp: options.ephemeralOptions.eph_setting_ts?.toString()
        };
    }
    message = Types_1.WAProto.Message.fromObject(message);
    const messageJSON = {
        key: {
            remoteJid: jid,
            fromMe: true,
            id: (options === null || options === void 0 ? void 0 : options.messageId) || (0, generics_1.generateMessageIDV2)(),
        },
        message: message,
        messageTimestamp: timestamp,
        messageStubParameters: [],
        participant: (0, WABinary_1.isJidGroup)(jid) || (0, WABinary_1.isJidStatusBroadcast)(jid) ? userJid : undefined,
        status: Types_1.WAMessageStatus.PENDING
    };
    return Types_1.WAProto.WebMessageInfo.fromObject(messageJSON);
};
exports.generateWAMessageFromContent = generateWAMessageFromContent;
const generateWAMessage = async (jid, content, options) => {
    var _a;
    // ensure msg ID is with every log
    options.logger = (_a = options === null || options === void 0 ? void 0 : options.logger) === null || _a === void 0 ? void 0 : _a.child({ msgId: options.messageId });
    return (0, exports.generateWAMessageFromContent)(jid, await (0, exports.generateWAMessageContent)(content, { newsletter: (0, WABinary_1.isJidNewsletter)(jid), ...options }), options);
};
exports.generateWAMessage = generateWAMessage;
/** Get the key to access the true type of content */
const getContentType = (content) => {
    if (content) {
        const keys = Object.keys(content);
        const key = keys.find(k => (k === 'conversation' || k.includes('Message')) && k !== 'senderKeyDistributionMessage');
        return key;
    }
};
exports.getContentType = getContentType;
/**
 * Normalizes ephemeral, view once messages to regular message content
 * Eg. image messages in ephemeral messages, in view once messages etc.
 * @param content
 * @returns
 */
const normalizeMessageContent = (content) => {
    if (!content) {
        return undefined;
    }
    // set max iterations to prevent an infinite loop
    for (let i = 0; i < 5; i++) {
        const inner = getFutureProofMessage(content);
        if (!inner) {
            break;
        }
        content = inner.message;
    }
    return content;
    function getFutureProofMessage(message) {
        return ((message === null || message === void 0 ? void 0 : message.ephemeralMessage)
            || (message === null || message === void 0 ? void 0 : message.viewOnceMessage)
            || (message === null || message === void 0 ? void 0 : message.documentWithCaptionMessage)
            || (message === null || message === void 0 ? void 0 : message.viewOnceMessageV2)
            || (message === null || message === void 0 ? void 0 : message.viewOnceMessageV2Extension)
            || (message === null || message === void 0 ? void 0 : message.editedMessage)
            || (message === null || message === void 0 ? void 0 : message.groupMentionedMessage)
            || (message === null || message === void 0 ? void 0 : message.botInvokeMessage)
            || (message === null || message === void 0 ? void 0 : message.lottieStickerMessage)
            || (message === null || message === void 0 ? void 0 : message.eventCoverImage)
            || (message === null || message === void 0 ? void 0 : message.statusMentionMessage)
            || (message === null || message === void 0 ? void 0 : message.pollCreationOptionImageMessage)
            || (message === null || message === void 0 ? void 0 : message.associatedChildMessage)
            || (message === null || message === void 0 ? void 0 : message.groupStatusMentionMessage)
            || (message === null || message === void 0 ? void 0 : message.pollCreationMessageV4)
            || (message === null || message === void 0 ? void 0 : message.pollCreationMessageV5)
            || (message === null || message === void 0 ? void 0 : message.statusAddYours)
            || (message === null || message === void 0 ? void 0 : message.groupStatusMessage)
            || (message === null || message === void 0 ? void 0 : message.limitSharingMessage)
            || (message === null || message === void 0 ? void 0 : message.botTaskMessage)
            || (message === null || message === void 0 ? void 0 : message.questionMessage)
            || (message === null || message === void 0 ? void 0 : message.groupStatusMessageV2)
            || (message === null || message === void 0 ? void 0 : message.botForwardedMessage));
    }
};
exports.normalizeMessageContent = normalizeMessageContent;
/**
 * Extract the true message content from a message
 * Eg. extracts the inner message from a disappearing message/view once message
 */
const extractMessageContent = (content) => {
    var _a, _b, _c, _d, _e, _f;
    const extractFromTemplateMessage = (msg) => {
        if (msg.imageMessage) {
            return { imageMessage: msg.imageMessage };
        }
        else if (msg.documentMessage) {
            return { documentMessage: msg.documentMessage };
        }
        else if (msg.videoMessage) {
            return { videoMessage: msg.videoMessage };
        }
        else if (msg.locationMessage) {
            return { locationMessage: msg.locationMessage };
        }
        else {
            return {
                conversation: 'contentText' in msg
                    ? msg.contentText
                    : ('hydratedContentText' in msg ? msg.hydratedContentText : '')
            };
        }
    };
    content = (0, exports.normalizeMessageContent)(content);
    if (content === null || content === void 0 ? void 0 : content.buttonsMessage) {
        return extractFromTemplateMessage(content.buttonsMessage);
    }
    if ((_a = content === null || content === void 0 ? void 0 : content.templateMessage) === null || _a === void 0 ? void 0 : _a.hydratedFourRowTemplate) {
        return extractFromTemplateMessage((_b = content === null || content === void 0 ? void 0 : content.templateMessage) === null || _b === void 0 ? void 0 : _b.hydratedFourRowTemplate);
    }
    if ((_c = content === null || content === void 0 ? void 0 : content.templateMessage) === null || _c === void 0 ? void 0 : _c.hydratedTemplate) {
        return extractFromTemplateMessage((_d = content === null || content === void 0 ? void 0 : content.templateMessage) === null || _d === void 0 ? void 0 : _d.hydratedTemplate);
    }
    if ((_e = content === null || content === void 0 ? void 0 : content.templateMessage) === null || _e === void 0 ? void 0 : _e.fourRowTemplate) {
        return extractFromTemplateMessage((_f = content === null || content === void 0 ? void 0 : content.templateMessage) === null || _f === void 0 ? void 0 : _f.fourRowTemplate);
    }
    return content;
};
exports.extractMessageContent = extractMessageContent;
/**
 * Returns the device predicted by message ID
 */
const getDevice = (id) => /^3A.{18}$/.test(id) ? 'ios' :
    /^3E.{20}$/.test(id) ? 'web' :
        /^(.{21}|.{32})$/.test(id) ? 'android' :
            /^(3F|.{18}$)/.test(id) ? 'desktop' :
                'unknown';
exports.getDevice = getDevice;
/** Upserts a receipt in the message */
const updateMessageWithReceipt = (msg, receipt) => {
    msg.userReceipt = msg.userReceipt || [];
    const recp = msg.userReceipt.find(m => m.userJid === receipt.userJid);
    if (recp) {
        Object.assign(recp, receipt);
    }
    else {
        msg.userReceipt.push(receipt);
    }
};
exports.updateMessageWithReceipt = updateMessageWithReceipt;
/** Update the message with a new reaction */
const updateMessageWithReaction = (msg, reaction) => {
    const authorID = (0, generics_1.getKeyAuthor)(reaction.key);
    const reactions = (msg.reactions || [])
        .filter(r => (0, generics_1.getKeyAuthor)(r.key) !== authorID);
    reaction.text = reaction.text || '';
    reactions.push(reaction);
    msg.reactions = reactions;
};
exports.updateMessageWithReaction = updateMessageWithReaction;
/** Update the message with a new poll update */
const updateMessageWithPollUpdate = (msg, update) => {
    var _a, _b;
    const authorID = (0, generics_1.getKeyAuthor)(update.pollUpdateMessageKey);
    const reactions = (msg.pollUpdates || [])
        .filter(r => (0, generics_1.getKeyAuthor)(r.pollUpdateMessageKey) !== authorID);
    if ((_b = (_a = update.vote) === null || _a === void 0 ? void 0 : _a.selectedOptions) === null || _b === void 0 ? void 0 : _b.length) {
        reactions.push(update);
    }
    msg.pollUpdates = reactions;
};
exports.updateMessageWithPollUpdate = updateMessageWithPollUpdate;
/**
 * Aggregates all poll updates in a poll.
 * @param msg the poll creation message
 * @param meId your jid
 * @returns A list of options & their voters
 */
function getAggregateVotesInPollMessage({ message, pollUpdates }, meId) {
    var _a, _b, _c;
    const opts = ((_a = message === null || message === void 0 ? void 0 : message.pollCreationMessage) === null || _a === void 0 ? void 0 : _a.options) || ((_b = message === null || message === void 0 ? void 0 : message.pollCreationMessageV2) === null || _b === void 0 ? void 0 : _b.options) || ((_c = message === null || message === void 0 ? void 0 : message.pollCreationMessageV3) === null || _c === void 0 ? void 0 : _c.options) || [];
    const voteHashMap = opts.reduce((acc, opt) => {
        const hash = (0, crypto_2.sha256)(Buffer.from(opt.optionName || '')).toString();
        acc[hash] = {
            name: opt.optionName || '',
            voters: []
        };
        return acc;
    }, {});
    for (const update of pollUpdates || []) {
        const { vote } = update;
        if (!vote) {
            continue;
        }
        for (const option of vote.selectedOptions || []) {
            const hash = option.toString();
            let data = voteHashMap[hash];
            if (!data) {
                voteHashMap[hash] = {
                    name: 'Unknown',
                    voters: []
                };
                data = voteHashMap[hash];
            }
            voteHashMap[hash].voters.push((0, generics_1.getKeyAuthor)(update.pollUpdateMessageKey, meId));
        }
    }
    return Object.values(voteHashMap);
}
/** Given a list of message keys, aggregates them by chat & sender. Useful for sending read receipts in bulk */
const aggregateMessageKeysNotFromMe = (keys) => {
    const keyMap = {};
    for (const { remoteJid, id, participant, fromMe } of keys) {
        if (!fromMe) {
            const uqKey = `${remoteJid}:${participant || ''}`;
            if (!keyMap[uqKey]) {
                keyMap[uqKey] = {
                    jid: remoteJid,
                    participant: participant,
                    messageIds: []
                };
            }
            keyMap[uqKey].messageIds.push(id);
        }
    }
    return Object.values(keyMap);
};
exports.aggregateMessageKeysNotFromMe = aggregateMessageKeysNotFromMe;
const REUPLOAD_REQUIRED_STATUS = [410, 404];
/**
 * Downloads the given message. Throws an error if it's not a media message
 */
const downloadMediaMessage = async (message, type, options, ctx) => {
    const result = await downloadMsg()
        .catch(async (error) => {
        var _a;
        if (ctx) {
            // check if the message requires a reupload
            if (REUPLOAD_REQUIRED_STATUS.includes(error?.status || error?.response?.status)) {
                ctx.logger.info({ key: message.key }, 'sending reupload media request...');
                message = await ctx.reuploadRequest(message);
                const result = await downloadMsg();
                return result;
            }
        }
        throw error;
    });
    return result;
    async function downloadMsg() {
        const mContent = (0, exports.extractMessageContent)(message.message);
        if (!mContent) {
            throw new boom_1.Boom('No message present', { statusCode: 400, data: message });
        }
        const contentType = (0, exports.getContentType)(mContent);
        let mediaType = contentType === null || contentType === void 0 ? void 0 : contentType.replace('Message', '');
        const media = mContent[contentType];
        if (!media || typeof media !== 'object' || (!('url' in media) && !('thumbnailDirectPath' in media))) {
            throw new boom_1.Boom(`"${contentType}" message is not a media message`);
        }
        let download;
        if ('thumbnailDirectPath' in media && !('url' in media)) {
            download = {
                directPath: media.thumbnailDirectPath,
                mediaKey: media.mediaKey
            };
            mediaType = 'thumbnail-link';
        }
        else {
            download = media;
        }
        const stream = await (0, messages_media_1.downloadContentFromMessage)(download, mediaType, options);
        if (type === 'buffer') {
            const bufferArray = [];
            for await (const chunk of stream) {
                bufferArray.push(chunk);
            }
            return Buffer.concat(bufferArray);
        }
        return stream;
    }
};
exports.downloadMediaMessage = downloadMediaMessage;
/** Checks whether the given message is a media message; if it is returns the inner content */
const assertMediaContent = (content) => {
    content = (0, exports.extractMessageContent)(content);
    const mediaContent = (content === null || content === void 0 ? void 0 : content.documentMessage)
        || (content === null || content === void 0 ? void 0 : content.imageMessage)
        || (content === null || content === void 0 ? void 0 : content.videoMessage)
        || (content === null || content === void 0 ? void 0 : content.audioMessage)
        || (content === null || content === void 0 ? void 0 : content.stickerMessage)
        || (content === null || content === void 0 ? void 0 : content.stickerPackMessage);
    if (!mediaContent) {
        throw new boom_1.Boom('given message is not a media message', { statusCode: 400, data: content });
    }
    return mediaContent;
};
exports.assertMediaContent = assertMediaContent;

const prepareAlbumMessageContent = async (jid, albums, options) => {
    const socket = options.sock || options.suki || {};
    const relayMessage = socket.relayMessage;
    const uploadToServer = socket.waUploadToServer || options.upload;
    if (typeof relayMessage !== 'function') {
        throw new boom_1.Boom('album messages require a relayMessage function', { statusCode: 400 });
    }
    if (typeof uploadToServer !== 'function') {
        throw new boom_1.Boom('album messages require a media upload function', { statusCode: 400 });
    }
    if (!Array.isArray(albums) || !albums.length) {
        throw new boom_1.Boom('album messages require at least one image or video item', { statusCode: 400 });
    }
    const albumMsg = (0, exports.generateWAMessageFromContent)(jid, {
        albumMessage: WAProto_1.proto.Message.AlbumMessage.fromObject({
            expectedImageCount: albums.filter(item => item && 'image' in item).length,
            expectedVideoCount: albums.filter(item => item && 'video' in item).length
        })
    }, options);
    await relayMessage(jid, albumMsg.message, {
        messageId: albumMsg.key.id,
        useCachedGroupMetadata: options.useCachedGroupMetadata,
        additionalAttributes: options.additionalAttributes,
        statusJidList: options.statusJidList,
        additionalNodes: options.additionalNodes,
        AI: options.ai || options.AI
    });
    const messages = [];
    for (const media of albums) {
        let mediaMsg;
        const upload = async (encFilePath, opts) => uploadToServer(encFilePath, {
            ...opts,
            newsletter: (0, WABinary_1.isJidNewsletter)(jid)
        });
        if (media && 'image' in media) {
            mediaMsg = await (0, exports.generateWAMessage)(jid, { ...media, image: media.image }, {
                ...options,
                userJid: options.userJid,
                upload
            });
        }
        else if (media && 'video' in media) {
            mediaMsg = await (0, exports.generateWAMessage)(jid, { ...media, video: media.video }, {
                ...options,
                userJid: options.userJid,
                upload
            });
        }
        else {
            throw new boom_1.Boom('album items must be image or video messages', { statusCode: 400, data: media });
        }
        mediaMsg.message.messageContextInfo = {
            ...(mediaMsg.message.messageContextInfo || {}),
            messageSecret: (0, crypto_1.randomBytes)(32),
            messageAssociation: {
                associationType: 1,
                parentMessageKey: albumMsg.key
            }
        };
        messages.push(mediaMsg);
    }
    return messages;
};
exports.prepareAlbumMessageContent = prepareAlbumMessageContent;

const toJid = (id) => {
    if (!id)
        return '';
    if (id.endsWith('@lid'))
        return id.replace('@lid', '@s.whatsapp.net');
    if (id.includes('@'))
        return id;
    return `${id}@s.whatsapp.net`;
};
exports.toJid = toJid;
const getSenderLid = (message) => {
    const sender = message.key.participant || message.key.remoteJid;
    const user = (0, WABinary_1.jidDecode)(sender)?.user || '';
    const lid = (0, WABinary_1.jidEncode)(user, 'lid');
    console.log('sender lid:', lid);
    return { jid: sender, lid };
};
exports.getSenderLid = getSenderLid;
