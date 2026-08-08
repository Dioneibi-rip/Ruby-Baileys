"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPairingQRData = exports.getCompanionPlatformDisplay = exports.getCompanionPlatformId = exports.getCompanionWebClientType = exports.CompanionWebClientType = void 0;
var CompanionWebClientType;
(function (CompanionWebClientType) {
    CompanionWebClientType[CompanionWebClientType["UNKNOWN"] = 0] = "UNKNOWN";
    CompanionWebClientType[CompanionWebClientType["CHROME"] = 1] = "CHROME";
    CompanionWebClientType[CompanionWebClientType["EDGE"] = 2] = "EDGE";
    CompanionWebClientType[CompanionWebClientType["FIREFOX"] = 3] = "FIREFOX";
    CompanionWebClientType[CompanionWebClientType["IE"] = 4] = "IE";
    CompanionWebClientType[CompanionWebClientType["OPERA"] = 5] = "OPERA";
    CompanionWebClientType[CompanionWebClientType["SAFARI"] = 6] = "SAFARI";
    CompanionWebClientType[CompanionWebClientType["ELECTRON"] = 7] = "ELECTRON";
    CompanionWebClientType[CompanionWebClientType["UWP"] = 8] = "UWP";
    CompanionWebClientType[CompanionWebClientType["OTHER_WEB_CLIENT"] = 9] = "OTHER_WEB_CLIENT";
})(CompanionWebClientType || (exports.CompanionWebClientType = CompanionWebClientType = {}));
const BROWSER_TO_COMPANION_WEB_CLIENT = {
    Chrome: CompanionWebClientType.CHROME,
    Edge: CompanionWebClientType.EDGE,
    Firefox: CompanionWebClientType.FIREFOX,
    IE: CompanionWebClientType.IE,
    Opera: CompanionWebClientType.OPERA,
    Safari: CompanionWebClientType.SAFARI
};
const getCompanionWebClientType = ([os, browserName]) => {
    if (browserName === 'Desktop') {
        return os === 'Windows' ? CompanionWebClientType.UWP : CompanionWebClientType.ELECTRON;
    }
    return BROWSER_TO_COMPANION_WEB_CLIENT[browserName] || CompanionWebClientType.OTHER_WEB_CLIENT;
};
exports.getCompanionWebClientType = getCompanionWebClientType;
const getCompanionPlatformId = (browser) => {
    return (0, exports.getCompanionWebClientType)(browser).toString();
};
exports.getCompanionPlatformId = getCompanionPlatformId;
/**
 * Builds the `companion_platform_display` value shown on the phone's
 * "Linked devices" screen.
 *
 * The server validates this string. Custom `browser` tuples frequently contain
 * emoji, newlines, parentheses or very long vanity names, which can get the
 * whole `link_code_companion_reg` node rejected as bad-request. Restrict it to a
 * conservative charset and length, and fall back to a known-good label.
 */
const getCompanionPlatformDisplay = (browser) => {
    const os = `${browser?.[0] ?? ''}`.trim();
    const browserName = `${browser?.[1] ?? ''}`.trim();
    const sanitize = (value) => value
        // Strip anything outside the safe ASCII range, incl. emoji and newlines.
        .replace(/[^\x20-\x7E]/g, '')
        // Parentheses are structural in the "Name (OS)" format.
        .replace(/[()]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 32);
    const safeBrowser = sanitize(browserName) || 'Chrome';
    const safeOs = sanitize(os) || 'Linux';
    return `${safeBrowser} (${safeOs})`;
};
exports.getCompanionPlatformDisplay = getCompanionPlatformDisplay;
const buildPairingQRData = (ref, noiseKeyB64, identityKeyB64, advB64, browser) => {
    return ('https://wa.me/settings/linked_devices#' +
        [ref, noiseKeyB64, identityKeyB64, advB64, (0, exports.getCompanionPlatformId)(browser)].join(','));
};
exports.buildPairingQRData = buildPairingQRData;
