import { orderBy, where } from "firebase/firestore";
import { FirebaseCRUD } from "../FirebaseCRUD";
import { Entry } from "./entry.model";

const COLLECTION_NAME = 'entries'

const EntryCRUD = new FirebaseCRUD(COLLECTION_NAME)
export const createEntry = (item: Entry) => EntryCRUD.create(item)
export const editEntry = (itemId: string, item: Entry) => EntryCRUD.update(itemId, item)
export const deleteEntry = (itemId: string) => EntryCRUD.delete(itemId)
export const getEntry = (itemId: string) => EntryCRUD.get(itemId)
export const listenEntry = (itemId: string, cb: CallableFunction) => EntryCRUD.listen(itemId, cb)
export const listenUserEntries = (userId: string, cb: CallableFunction) => EntryCRUD.listenDocs([where('userId', '==', userId || null)], cb)
export const listenAllEntries = (cb: CallableFunction) => EntryCRUD.listenAll(cb)
