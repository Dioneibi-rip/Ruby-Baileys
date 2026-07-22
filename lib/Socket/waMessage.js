const WAProto = require('../../WAProto').proto;
const crypto = require('crypto');
const { delay } = require('../Utils/generics');

const getPrimaryChannel = () => {
    const channels = Object.values((global === null || global === void 0 ? void 0 : global.ch) || {});
    return channels[0] || undefined;
};

class waMessage {
    constructor(utils, waUploadToServer, relayMessageFn) {
        this.utils = utils;
        this.relayMessage = relayMessageFn
        this.waUploadToServer = waUploadToServer;
    }

    detectType(content) {
        if (content.requestPaymentMessage) return 'PAYMENT';
        if (content.productMessage) return 'PRODUCT';
        if (content.interactiveMessage) return 'INTERACTIVE';
        if (content.albumMessage) return 'ALBUM';
        if (content.eventMessage) return 'EVENT';
        if (content.pollResultMessage) return 'POLL_RESULT'
        return null;
    }

    async handlePayment(content, quoted) {
        const data = content.requestPaymentMessage;
        let notes = {};

        if (data.sticker?.stickerMessage) {
            notes = {
                stickerMessage: {
                    ...data.sticker.stickerMessage,
                    contextInfo: {
                        stanzaId: quoted?.key?.id,
                        participant: quoted?.key?.participant || content.sender,
                        quotedMessage: quoted?.message
                    }
                }
            };
        } else if (data.note) {
            notes = {
                extendedTextMessage: {
                    text: data.note,
                    contextInfo: {
                        stanzaId: quoted?.key?.id,
                        participant: quoted?.key?.participant || content.sender,
                        quotedMessage: quoted?.message
                    }
                }
            };
        }

        return {
            requestPaymentMessage: WAProto.Message.RequestPaymentMessage.fromObject({
                expiryTimestamp: data.expiry || 0,
                amount1000: data.amount || 0,
                currencyCodeIso4217: data.currency || "IDR",
                requestFrom: data.from || "0@s.whatsapp.net",
                noteMessage: notes,
                background: data.background ?? {
                    id: "DEFAULT",
                    placeholderArgb: 0xFFF0F0F0
                }
            })
        };
    }

    async handleProduct(content, jid, quoted) {
        const {
            title, 
            description, 
            thumbnail,
            productId, 
            retailerId, 
            url, 
            body = "", 
            footer = "", 
            buttons = []
        } = content.productMessage;

        const { imageMessage } = await this.utils.generateWAMessageContent(
            { image: { url: thumbnail }}, 
            { upload: this.waUploadToServer }
        );

        return {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: body },
                        footer: { text: footer },
                        header: {
                            title,
                            hasMediaAttachment: true,
                            productMessage: {
                                product: {
                                    productImage: imageMessage,
                                    productId,
                                    title,
                                    description,
                                    currencyCode: "IDR",
                                    priceAmount1000: null,
                                    retailerId,
                                    url,
                                    productImageCount: 1
                                },
                                businessOwnerJid: "0@s.whatsapp.net"
                            }
                        },
                        nativeFlowMessage: { buttons }
                    }
                }
            }
        };
    }

    async handleInteractive(content, jid, quoted) {
        const {
            title,
            footer,
            thumbnail,
            buttons = [],
            nativeFlowMessage
        } = content.interactiveMessage;

        if (thumbnail) {
            const media = await this.utils.prepareWAMessageMedia(
                { image: { url: thumbnail } },
                { upload: this.waUploadToServer }
            );
            
            return {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: WAProto.Message.InteractiveMessage.create({
                            body: { text: title },
                            footer: { text: footer },
                            header: {
                                title: "",
                                hasMediaAttachment: true,
                                ...media
                            },
                            nativeFlowMessage: nativeFlowMessage || { buttons }
                        })
                    }
                }
            };
        }

        return {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: WAProto.Message.InteractiveMessage.create({
                        body: { text: title },
                        footer: { text: footer },
                        header: {
                            title: "",
                            hasMediaAttachment: false
                        },
                        nativeFlowMessage: nativeFlowMessage || { buttons }
                    })
                }
            }
        };
    }

    async handleAlbum(content, jid, quoted) {
        const array = content.albumMessage;
        const album = await this.utils.generateWAMessageFromContent(jid, {
            messageContextInfo: {
                messageSecret: crypto.randomBytes(32),
            },
            albumMessage: {
                expectedImageCount: array.filter((a) => a.hasOwnProperty("image")).length,
                expectedVideoCount: array.filter((a) => a.hasOwnProperty("video")).length,
            },
        }, {
            userJid: this.utils.generateMessageID().split('@')[0] + '@s.whatsapp.net',
            quoted,
            upload: this.waUploadToServer
        });

        await this.relayMessage(jid, album.message, {
            messageId: album.key.id,
        });

        for (let content of array) {
            try {
                const mediaType = content.image ? 'image' : content.video ? 'video' : null;
                if (!mediaType) {
                    continue;
                }

                const media = content[mediaType];
                const mediaUrl = media?.url;
                let mediaBuffer = mediaUrl;

                if (typeof mediaUrl === 'string') {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 30000);
                    try {
                        const response = await fetch(mediaUrl, { signal: controller.signal });
                        if (!response.ok) {
                            throw new Error(`Failed to fetch media: ${response.status}`);
                        }
                        mediaBuffer = Buffer.from(await response.arrayBuffer());
                    }
                    finally {
                        clearTimeout(timeout);
                    }
                }

                const img = await this.utils.generateWAMessage(jid, {
                    ...content,
                    [mediaType]: mediaBuffer,
                    ...(media?.caption ? { caption: media.caption } : {}),
                }, {
                    upload: this.waUploadToServer,
                });

                img.message.messageContextInfo = {
                    ...(img.message.messageContextInfo || {}),
                    messageAssociation: {
                        associationType: 1,
                        parentMessageKey: album.key,
                    },
                };

                const primaryChannel = getPrimaryChannel();
                if (primaryChannel) {
                    img.message.forwardedNewsletterMessageInfo = {
                        newsletterJid: primaryChannel,
                        serverMessageId: 1,
                        newsletterName: "Canal",
                        contentType: 1,
                        timestamp: new Date().toISOString(),
                        senderName: "Riyoo",
                        content: "Message",
                        priority: "high",
                        status: "sent",
                    };
                }

                img.message.disappearingMode = {
                    initiator: 3,
                    trigger: 4,
                    initiatorDeviceJid: jid,
                    initiatedByExternalService: true,
                    initiatedByUserDevice: true,
                    initiatedBySystem: true,
                    initiatedByServer: true,
                    initiatedByAdmin: true,
                    initiatedByUser: true,
                    initiatedByApp: true,
                    initiatedByBot: true,
                    initiatedByMe: true,
                };

                await this.relayMessage(jid, img.message, {
                    messageId: img.key.id,
                    quoted: {
                        key: {
                            remoteJid: album.key.remoteJid,
                            id: album.key.id,
                            fromMe: true,
                            participant: this.utils.generateMessageID().split('@')[0] + '@s.whatsapp.net',
                        },
                        message: album.message,
                    },
                });
                await delay(500);
            } catch (error) {
                console.warn('Failed to send album item:', error?.message || error);
            }
        }
        return album;
    }   

    async handleEvent(content, jid, quoted) {
        const eventData = content.eventMessage;
        
        const msg = await this.utils.generateWAMessageFromContent(jid, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2,
                        messageSecret: crypto.randomBytes(32),
                        supportPayload: JSON.stringify({
                            version: 2,
                            is_ai_message: true,
                            should_show_system_message: true,
                            ticket_id: crypto.randomBytes(16).toString('hex')
                        })
                    },
                    eventMessage: {
                        contextInfo: {
                            mentionedJid: [jid],
                            participant: jid,
                            remoteJid: "status@broadcast",
                            ...(getPrimaryChannel() ? {
                            forwardedNewsletterMessageInfo: {
                                newsletterName: "Canal",
                                newsletterJid: getPrimaryChannel(),
                                serverMessageId: 1
                            }
                            } : {}),
                        },
                        isCanceled: eventData.isCanceled || false,
                        name: eventData.name,
                        description: eventData.description,
                        location: eventData.location || {
                            degreesLatitude: 0,
                            degreesLongitude: 0,
                            name: "Location"
                        },
                        joinLink: eventData.joinLink || '',
                        startTime: typeof eventData.startTime === 'string' ? parseInt(eventData.startTime) : eventData.startTime || Date.now(),
                        endTime: typeof eventData.endTime === 'string' ? parseInt(eventData.endTime) : eventData.endTime || Date.now() + 3600000,
                        extraGuestsAllowed: eventData.extraGuestsAllowed !== false
                    }
                }
            }
        }, { quoted });
        
        await this.relayMessage(jid, msg.message, {
            messageId: msg.key.id
        });
        return msg;
    }
        
    async handlePollResult(content, jid, quoted) {
        const pollData = content.pollResultMessage;
        
        const msg = await this.utils.generateWAMessageFromContent(jid, {
            pollResultSnapshotMessage: {
                name: pollData.name,
                pollVotes: pollData.pollVotes.map(vote => ({
                    optionName: vote.optionName,
                    optionVoteCount: typeof vote.optionVoteCount === 'number' 
                    ? vote.optionVoteCount.toString() 
                    : vote.optionVoteCount
                }))
            }
        }, {
            userJid: this.utils.generateMessageID().split('@')[0] + '@s.whatsapp.net',
            quoted
        });
        
        await this.relayMessage(jid, msg.message, {
            messageId: msg.key.id
        });
       
        return msg;
    }
}

module.exports = waMessage;
