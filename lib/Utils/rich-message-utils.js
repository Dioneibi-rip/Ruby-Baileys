"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapToBotForwardedMessage = exports.botMetadataCertificate = exports.botMetadataSignature = exports.prepareRichResponseMessage = exports.toUnified = exports.tokenizeCode = void 0;
const crypto_1 = require("crypto");
const WAProto_1 = require("../../WAProto");
const DONATE_URL = 'https://github.com/Dioneibi-rip/Ruby-baileys';
const LEXER_REGEX = /(\/\/.*|\/\*[\s\S]*?\*\/|#.*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[\s\S]*?`)|(\b[a-zA-Z_]\w*\b)(?=\s*\()|(\b[a-zA-Z_]\w*\b)|(\b\d+(?:\.\d+)?\b)|(\s+|[^\w\s]+)/g;
const CodeHighlightType = { DEFAULT: 0, KEYWORD: 1, METHOD: 2, STRING: 3, NUMBER: 4, COMMENT: 5, 0: 'DEFAULT', 1: 'KEYWORD', 2: 'METHOD', 3: 'STRING', 4: 'NUMBER', 5: 'COMMENT' };
const RichSubMessageType = { UNKNOWN: 0, GRID_IMAGE: 1, TEXT: 2, INLINE_IMAGE: 3, TABLE: 4, CODE: 5, DYNAMIC: 6, MAP: 7, LATEX: 8, CONTENT_ITEMS: 9 };
const LANGUAGE_KEYWORDS = {
    javascript: new Set(['await', 'async', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'from', 'function', 'if', 'import', 'in', 'let', 'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'yield']),
    typescript: new Set(['await', 'async', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'finally', 'for', 'from', 'function', 'if', 'implements', 'import', 'in', 'interface', 'let', 'new', 'private', 'protected', 'public', 'return', 'switch', 'this', 'throw', 'try', 'type', 'typeof', 'var', 'void', 'while', 'yield']),
    python: new Set(['and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'if', 'import', 'in', 'is', 'lambda', 'None', 'not', 'or', 'pass', 'raise', 'return', 'True', 'try', 'while', 'with', 'yield'])
};
const NOOP = new Set([]);
const tokenizeCode = (code, language = 'javascript') => {
    const keywords = LANGUAGE_KEYWORDS[language] || NOOP;
    const blocks = [];
    LEXER_REGEX.lastIndex = 0;
    let match;
    while ((match = LEXER_REGEX.exec(code)) !== null) {
        if (match[1]) blocks.push({ highlightType: CodeHighlightType.COMMENT, codeContent: match[1] });
        else if (match[2]) blocks.push({ highlightType: CodeHighlightType.STRING, codeContent: match[2] });
        else if (match[3]) blocks.push({ highlightType: keywords.has(match[3]) ? CodeHighlightType.KEYWORD : CodeHighlightType.METHOD, codeContent: match[3] });
        else if (match[4]) blocks.push({ highlightType: keywords.has(match[4]) ? CodeHighlightType.KEYWORD : CodeHighlightType.DEFAULT, codeContent: match[4] });
        else if (match[5]) blocks.push({ highlightType: CodeHighlightType.NUMBER, codeContent: match[5] });
        else blocks.push({ highlightType: CodeHighlightType.DEFAULT, codeContent: match[6] });
    }
    return blocks;
};
exports.tokenizeCode = tokenizeCode;
const toUnified = (submessages, uuid) => ({
    response_id: uuid || (0, crypto_1.randomUUID)(),
    sections: submessages.map((submessage) => {
        switch (submessage.messageType) {
            case RichSubMessageType.CODE: {
                const codeMetadata = submessage.codeMetadata;
                return { view_model: { primitive: { language: codeMetadata.codeLanguage, code_blocks: codeMetadata.codeBlocks.map((block) => ({ content: block.codeContent, type: CodeHighlightType[block.highlightType] })), __typename: 'GenAICodeUXPrimitive' }, __typename: 'GenAISingleLayoutViewModel' } };
            }
            case RichSubMessageType.TABLE: {
                const tableMetadata = submessage.tableMetadata;
                return { view_model: { primitive: { title: tableMetadata.title, rows: tableMetadata.rows.map((row) => ({ is_header: row.isHeading, cells: row.items, markdown_cells: row.items.map((item) => ({ text: item })) })), __typename: 'GenATableUXPrimitive' }, __typename: 'GenAISingleLayoutViewModel' } };
            }
            case RichSubMessageType.TEXT:
                return { view_model: { primitive: { text: submessage.messageText, inline_entities: submessage.inlineEntities || [], __typename: 'GenAIMarkdownTextUXPrimitive' }, __typename: 'GenAISingleLayoutViewModel' } };
            default:
                return {};
        }
    })
});
exports.toUnified = toUnified;
const prepareRichResponseMessage = (content) => {
    let { alignment, code, contentText, disclaimerText, footerText, headerText, imageText, inlineImage, items, language, latex, links, noHeading, richResponse, table, tapLinkUrl, title } = content;
    let submessages = [];
    if (Array.isArray(richResponse)) {
        submessages = richResponse.map((submessage) => {
            if (submessage.text) return { messageType: RichSubMessageType.TEXT, messageText: submessage.text, inlineEntities: submessage.inlineEntities };
            if (submessage.code) return { messageType: RichSubMessageType.CODE, codeMetadata: { codeLanguage: submessage.language || 'javascript', codeBlocks: Array.isArray(submessage.code) ? submessage.code : (0, exports.tokenizeCode)(submessage.code, submessage.language || 'javascript') } };
            if (submessage.items) return { messageType: RichSubMessageType.CONTENT_ITEMS, contentItemsMetadata: { itemsMetadata: submessage.items, contentType: WAProto_1.proto.AIRichResponseMessage.AIRichResponseContentItemsMetadata.ContentType.CAROUSEL } };
            if (submessage.inlineImage) return { messageType: RichSubMessageType.INLINE_IMAGE, imageMetadata: { imageUrl: submessage.inlineImage, imageText: submessage.imageText, alignment: submessage.alignment, tapLinkUrl: submessage.tapLinkUrl } };
            if (submessage.latex) return { messageType: RichSubMessageType.LATEX, latexMetadata: { text: submessage.text, expressions: submessage.latex } };
            if (submessage.table) return { messageType: RichSubMessageType.TABLE, tableMetadata: { title: submessage.title, rows: submessage.table } };
            return submessage;
        });
    }
    else {
        if (headerText) submessages.push({ messageType: RichSubMessageType.TEXT, messageText: headerText });
        if (contentText) submessages.push({ messageType: RichSubMessageType.TEXT, messageText: contentText });
        if (code) { language || (language = 'javascript'); submessages.push({ messageType: RichSubMessageType.CODE, codeMetadata: { codeLanguage: language, codeBlocks: (0, exports.tokenizeCode)(code, language) } }); }
        if (items) submessages.push({ messageType: RichSubMessageType.CONTENT_ITEMS, contentItemsMetadata: { itemsMetadata: items, contentType: WAProto_1.proto.AIRichResponseMessage.AIRichResponseContentItemsMetadata.ContentType.CAROUSEL } });
        if (inlineImage) submessages.push({ messageType: RichSubMessageType.INLINE_IMAGE, imageMetadata: { imageUrl: inlineImage, imageText, alignment, tapLinkUrl } });
        if (latex) submessages.push({ messageType: RichSubMessageType.LATEX, latexMetadata: { text: contentText, expressions: latex } });
        if (links) links.forEach((linkField, index) => {
            const prefix = 'SS_' + index;
            const url = linkField.url || DONATE_URL;
            submessages.push({ messageType: RichSubMessageType.TEXT, messageText: linkField.text + ` {{${prefix}}}¹{{/${prefix}}} `, inlineEntities: [{ key: prefix, metadata: { reference_id: index + 1, reference_url: url, reference_title: linkField.title || 'Reference', reference_display_name: linkField.displayName || 'Reference', sources: linkField.sources || [], __typename: 'GenAISearchCitationItem' } }] });
        });
        if (table) submessages.push({ messageType: RichSubMessageType.TABLE, tableMetadata: { title, rows: table.map((items, index) => ({ isHeading: !noHeading && index === 0, items })) } });
        if (footerText) submessages.push({ messageType: RichSubMessageType.TEXT, messageText: footerText });
    }
    const uuid = (0, crypto_1.randomUUID)();
    const richResponseMessage = WAProto_1.proto.AIRichResponseMessage.create({ submessages, messageType: WAProto_1.proto.AIRichResponseMessage.AIRichResponseMessageType.AI_RICH_RESPONSE_TYPE_STANDARD, unifiedResponse: { data: Buffer.from(JSON.stringify((0, exports.toUnified)(submessages, uuid))) }, contextInfo: { isForwarded: true, forwardingScore: 1, forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' }, forwardOrigin: 4 } });
    const message = (0, exports.wrapToBotForwardedMessage)(richResponseMessage);
    if (disclaimerText) message.messageContextInfo.botMetadata.messageDisclaimerText = disclaimerText;
    message.messageContextInfo.botMetadata.botResponseId = uuid;
    return message;
};
exports.prepareRichResponseMessage = prepareRichResponseMessage;
const botMetadataSignature = () => (0, crypto_1.randomBytes)(64);
exports.botMetadataSignature = botMetadataSignature;
const botMetadataCertificate = (length = 685) => { const certificate = (0, crypto_1.randomBytes)(length); certificate[0] = 48; certificate[1] = 130; return certificate; };
exports.botMetadataCertificate = botMetadataCertificate;
const wrapToBotForwardedMessage = (richResponseMessage) => ({ messageContextInfo: { botMetadata: { verificationMetadata: { proofs: [{ certificateChain: [(0, exports.botMetadataCertificate)(), (0, exports.botMetadataCertificate)(892)], version: 1, useCase: 1, signature: (0, exports.botMetadataSignature)() }] } } }, botForwardedMessage: { message: { richResponseMessage } } });
exports.wrapToBotForwardedMessage = wrapToBotForwardedMessage;
