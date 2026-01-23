"use strict"

Object.defineProperty(exports, "__esModule", { value: true })

const { Boom } = require("@hapi/boom")
const { createHash } = require("crypto")
const { proto } = require("../../WAProto")
const {
  KEY_BUNDLE_TYPE,
  WA_ADV_ACCOUNT_SIG_PREFIX,
  WA_ADV_DEVICE_SIG_PREFIX,
  WA_ADV_HOSTED_ACCOUNT_SIG_PREFIX
} = require("../Defaults/constants")
const {
  jidDecode,
  getBinaryNodeChild,
  S_WHATSAPP_NET
} = require("../WABinary")
const {
  Curve,
  hmacSign
} = require("./crypto")
const { encodeBigEndian } = require("./generics")
const { createSignalIdentity } = require("./signal")

/* =========================
   USER AGENT (FIXED)
   ========================= */
const getUserAgent = (config) => {
  return {
    appVersion: {
      primary: config.version[0],
      secondary: config.version[1],
      tertiary: config.version[2]
    },
    // 🔧 CRÍTICO: ANDROID para pairing por código
    platform: proto.ClientPayload.UserAgent.Platform.ANDROID,
    releaseChannel: proto.ClientPayload.UserAgent.ReleaseChannel.RELEASE,
    osVersion: "13",
    device: "Pixel 7",
    osBuildNumber: "TQ3A.230805.001",
    localeLanguageIso6391: "en",
    // 🔧 MCC/MNC reales
    mcc: "310",
    mnc: "260",
    localeCountryIso31661Alpha2: config.countryCode
  }
}

/* =========================
   WEB INFO
   ========================= */
const PLATFORM_MAP = {
  "Mac OS": proto.ClientPayload.WebInfo.WebSubPlatform.DARWIN,
  "Windows": proto.ClientPayload.WebInfo.WebSubPlatform.WIN32
}

const getWebInfo = (config) => {
  let webSubPlatform = proto.ClientPayload.WebInfo.WebSubPlatform.WEB_BROWSER

  if (
    config.syncFullHistory &&
    PLATFORM_MAP[config.browser[0]] &&
    config.browser[1] === "Desktop"
  ) {
    webSubPlatform = PLATFORM_MAP[config.browser[0]]
  }

  return { webSubPlatform }
}

/* =========================
   CLIENT PAYLOAD
   ========================= */
const getClientPayload = (config) => {
  const payload = {
    connectType: proto.ClientPayload.ConnectType.WIFI_UNKNOWN,
    connectReason: proto.ClientPayload.ConnectReason.USER_ACTIVATED,
    userAgent: getUserAgent(config)
  }

  // ⚠️ Solo webInfo cuando es necesario
  if (config.useWebInfo) {
    payload.webInfo = getWebInfo(config)
  }

  return payload
}

/* =========================
   LOGIN NODE
   ========================= */
const generateLoginNode = (userJid, config) => {
  const { user, device } = jidDecode(userJid)

  const payload = {
    ...getClientPayload(config),
    passive: true,
    pull: true,
    username: +user,
    device,
    lidDbMigrated: false
  }

  return proto.ClientPayload.fromObject(payload)
}

/* =========================
   PLATFORM TYPE (FIXED)
   ========================= */
const getPlatformType = () => {
  // 🔧 Forzado: evita identidades inconsistentes
  return proto.DeviceProps.PlatformType.ANDROID_PHONE
}

/* =========================
   REGISTRATION NODE
   ========================= */
const generateRegistrationNode = (
  { registrationId, signedPreKey, signedIdentityKey },
  config
) => {
  // 🔧 Hash correcto y coherente con la versión
  const appVersionBuf = createHash("md5")
    .update(config.version.join("."))
    .digest()

  const companion = {
    os: "Android",
    platformType: getPlatformType(),
    requireFullSync: config.syncFullHistory,
    historySyncConfig: {
      storageQuotaMb: 10240,
      inlineInitialPayloadInE2EeMsg: true,
      recentSyncDaysLimit: undefined,
      supportCallLogHistory: false,
      supportBotUserAgentChatHistory: true,
      supportCagReactionsAndPolls: true,
      supportBizHostedMsg: true,
      supportRecentSyncChunkMessageCountTuning: true,
      supportHostedGroupMsg: true,
      supportFbidBotChatHistory: true,
      supportAddOnHistorySyncMigration: undefined,
      supportMessageAssociation: true,
      supportGroupHistory: false,
      onDemandReady: undefined,
      supportGuestChat: undefined
    },
    // 🔧 MISMA versión que config.version
    version: {
      primary: config.version[0],
      secondary: config.version[1],
      tertiary: config.version[2]
    }
  }

  const companionProto = proto.DeviceProps.encode(companion).finish()

  const registerPayload = {
    ...getClientPayload(config),
    passive: false,
    pull: false,
    devicePairingData: {
      buildHash: appVersionBuf,
      deviceProps: companionProto,
      eRegid: encodeBigEndian(registrationId),
      eKeytype: KEY_BUNDLE_TYPE,
      eIdent: signedIdentityKey.public,
      eSkeyId: encodeBigEndian(signedPreKey.keyId, 3),
      eSkeyVal: signedPreKey.keyPair.public,
      eSkeySig: signedPreKey.signature
    }
  }

  return proto.ClientPayload.fromObject(registerPayload)
}

/* =========================
   PAIR SUCCESS
   ========================= */
const configureSuccessfulPairing = (
  stanza,
  { advSecretKey, signedIdentityKey, signalIdentities }
) => {
  const msgId = stanza.attrs.id
  const pairSuccessNode = getBinaryNodeChild(stanza, "pair-success")
  const deviceIdentityNode = getBinaryNodeChild(pairSuccessNode, "device-identity")
  const platformNode = getBinaryNodeChild(pairSuccessNode, "platform")
  const deviceNode = getBinaryNodeChild(pairSuccessNode, "device")
  const businessNode = getBinaryNodeChild(pairSuccessNode, "biz")

  if (!deviceIdentityNode || !deviceNode) {
    throw new Boom("Missing device-identity or device in pair success node", {
      data: stanza
    })
  }

  const bizName = businessNode?.attrs.name
  const jid = deviceNode.attrs.jid
  const lid = deviceNode.attrs.lid

  const { details, hmac, accountType } =
    proto.ADVSignedDeviceIdentityHMAC.decode(deviceIdentityNode.content)

  let hmacPrefix = Buffer.from([])

  if (accountType === proto.ADVEncryptionType.HOSTED) {
    hmacPrefix = WA_ADV_HOSTED_ACCOUNT_SIG_PREFIX
  }

  const advSign = hmacSign(
    Buffer.concat([hmacPrefix, details]),
    Buffer.from(advSecretKey, "base64")
  )

  if (Buffer.compare(hmac, advSign) !== 0) {
    throw new Boom("Invalid account signature")
  }

  const account = proto.ADVSignedDeviceIdentity.decode(details)
  const { accountSignatureKey, accountSignature, details: deviceDetails } = account
  const deviceIdentity = proto.ADVDeviceIdentity.decode(deviceDetails)

  const accountSignaturePrefix =
    deviceIdentity.deviceType === proto.ADVEncryptionType.HOSTED
      ? WA_ADV_HOSTED_ACCOUNT_SIG_PREFIX
      : WA_ADV_ACCOUNT_SIG_PREFIX

  const accountMsg = Buffer.concat([
    accountSignaturePrefix,
    deviceDetails,
    signedIdentityKey.public
  ])

  if (!Curve.verify(accountSignatureKey, accountMsg, accountSignature)) {
    throw new Boom("Failed to verify account signature")
  }

  const deviceMsg = Buffer.concat([
    WA_ADV_DEVICE_SIG_PREFIX,
    deviceDetails,
    signedIdentityKey.public,
    accountSignatureKey
  ])

  account.deviceSignature = Curve.sign(
    signedIdentityKey.private,
    deviceMsg
  )

  const identity = createSignalIdentity(lid, accountSignatureKey)
  const accountEnc = encodeSignedDeviceIdentity(account, false)

  const reply = {
    tag: "iq",
    attrs: {
      to: S_WHATSAPP_NET,
      type: "result",
      id: msgId
    },
    content: [
      {
        tag: "pair-device-sign",
        attrs: {},
        content: [
          {
            tag: "device-identity",
            attrs: { "key-index": deviceIdentity.keyIndex.toString() },
            content: accountEnc
          }
        ]
      }
    ]
  }

  const authUpdate = {
    account,
    me: { id: jid, name: bizName, lid },
    signalIdentities: [...(signalIdentities || []), identity],
    platform: platformNode?.attrs.name
  }

  return { creds: authUpdate, reply }
}

/* =========================
   ENCODE
   ========================= */
const encodeSignedDeviceIdentity = (account, includeSignatureKey) => {
  account = { ...account }

  if (!includeSignatureKey || !account.accountSignatureKey?.length) {
    account.accountSignatureKey = null
  }

  return proto.ADVSignedDeviceIdentity.encode(account).finish()
}

module.exports = {
  generateLoginNode,
  generateRegistrationNode,
  configureSuccessfulPairing,
  encodeSignedDeviceIdentity
}
