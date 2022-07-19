import { arrayRemove, arrayUnion, orderBy, where } from "firebase/firestore";
import { FirebaseCRUD } from "../FirebaseCRUD";
import { Entry } from "./entry.model";

const COLLECTION_NAME = 'entries'

const EntryCRUD = new FirebaseCRUD(COLLECTION_NAME)
export const createEntry = (item: Entry) => EntryCRUD.create(item)
export const editEntry = (itemId: string, item: Entry) => EntryCRUD.update(itemId, item)
export const deleteEntry = (itemId: string) => EntryCRUD.delete(itemId)
export const getEntry = (itemId: string) => EntryCRUD.get(itemId)
export const listenEntry = (itemId: string, cb: CallableFunction) => EntryCRUD.listen(itemId, cb)
export const listenUserEntries = (cb: CallableFunction) => EntryCRUD.listenUserDocs(cb)
export const listenAllEntries = (cb: CallableFunction) => EntryCRUD.listenAll(cb)
export const listenPublicEntries = (cb: CallableFunction) => EntryCRUD.listenMany([where('options.isPublic', '==', true)], cb)
export const lovedEntryBy = (itemId, userId) => EntryCRUD.update(itemId, {
  lovedBy: arrayUnion(userId)
})
export const unlovedEntryBy = (itemId, userId) => {
  EntryCRUD.update(itemId, {
    lovedBy: arrayRemove(userId)
  })
}
