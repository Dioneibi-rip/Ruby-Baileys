#!/usr/bin/env node
'use strict'

const { createHash } = require('crypto')
const { existsSync, readFileSync } = require('fs')
const { join } = require('path')

const root = process.cwd()
const upstreamRoot = process.argv[2] || '/tmp/baileys-upstream/Baileys-master'
const pairs = [
  ['lib/Defaults/baileys-version.json', 'src/Defaults/baileys-version.json'],
  ['lib/Defaults/index.js', 'src/Defaults/index.ts'],
  ['lib/Socket/Client/websocket.js', 'src/Socket/Client/websocket.ts'],
  ['lib/Socket/socket.js', 'src/Socket/socket.ts'],
  ['lib/Socket/index.js', 'src/Socket/index.ts'],
  ['lib/Utils/generics.js', 'src/Utils/browser-utils.ts']
]

const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 16)

for (const [localRel, upstreamRel] of pairs) {
  const local = join(root, localRel)
  const upstream = join(upstreamRoot, upstreamRel)
  if (!existsSync(local)) {
    console.warn(`missing local: ${localRel}`)
    continue
  }
  if (!existsSync(upstream)) {
    console.warn(`missing upstream: ${upstreamRel}`)
    continue
  }
  console.log(`${localRel}\n  local:    ${digest(local)}\n  upstream: ${digest(upstream)}`)
}
