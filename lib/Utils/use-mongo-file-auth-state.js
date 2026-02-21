"use strict"

Object.defineProperty(exports, "__esModule", { value: true })

const WAProto_1 = require("../../WAProto")
const auth_utils_1 = require("./auth-utils")
const generics_1 = require("./generics")

/*
code from amiruldev readjusted by @irull2nd, don't delete WM!
*/
const useMongoFileAuthState = async (collection) => {
  const writeData = (data,id) => {
    const informationToStore = JSON.parse(
      JSON.stringify(data, generics_1.BufferJSON.replacer)
    )
    const update = {
      $set: {
        ...informationToStore,
      },
    }

    return collection.updateOne({_id: id},update, {upsert: true})
  }

  const readData = async (id) => {
    try {
      const data = await collection.findOne({_id: id})
      if (!data) {
        return null
      }

      const serialized = JSON.stringify(data)
      return JSON.parse(serialized, generics_1.BufferJSON.reviver)
    } catch (err) {
      const errorWithContext = new Error(`Failed to read auth state for key: ${id}`)
      errorWithContext.cause = err
      throw errorWithContext
    }
  }

  const creds = (await readData('creds')) || auth_utils_1.initAuthCreds()

  return {
    state: {
      creds,
      keys: {
        get: async (type,ids)=> {
          const data = {}
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`)

              if(type === "app-state-sync-key" && value){
                value = WAProto_1.proto.Message.AppStateSyncKeyData.fromObject(value)
              }

              data[id] = value
            })
          )

          return data
        },
        set: async (data) => {
          const operations = []

          for (const category of Object.keys(data)) {
            for (const id of Object.keys(data[category])) {
              const value = data[category][id]
              const key = `${category}-${id}`
              if (value) {
                const informationToStore = JSON.parse(
                  JSON.stringify(value, generics_1.BufferJSON.replacer)
                )

                operations.push({
                  updateOne: {
                    filter: { _id: key },
                    update: { $set: informationToStore },
                    upsert: true
                  }
                })
              } else {
                operations.push({
                  deleteOne: {
                    filter: { _id: key }
                  }
                })
              }
            }
          }

          if (!operations.length) {
            return
          }

          if (typeof collection.bulkWrite === 'function') {
            await collection.bulkWrite(operations, { ordered: false })
            return
          }

          await Promise.all(
            operations.map((operation) => {
              if (operation.updateOne) {
                const { filter, update, upsert } = operation.updateOne
                return collection.updateOne(filter, update, { upsert })
              }

              return collection.deleteOne(operation.deleteOne.filter)
            })
          )
        },
      },
    },
    saveCreds: () => {
      return writeData(creds, "creds")
    }
  }
}

module.exports = {
  useMongoFileAuthState
}
