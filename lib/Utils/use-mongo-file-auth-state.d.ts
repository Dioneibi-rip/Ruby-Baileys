import { AuthenticationState } from '../Types'

export declare const useMongoFileAuthState: (collection: {
    findOne: (filter: { _id: string }) => Promise<unknown>
    updateOne: (filter: { _id: string }, update: { $set: Record<string, unknown> }, options: { upsert: boolean }) => Promise<unknown>
    deleteOne: (filter: { _id: string }) => Promise<unknown>
    bulkWrite?: (operations: Array<Record<string, unknown>>, options: { ordered: boolean }) => Promise<unknown>
}) => Promise<{
    state: AuthenticationState
    saveCreds: () => Promise<void>
}>