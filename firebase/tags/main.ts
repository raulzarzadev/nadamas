import { FirebaseCRUD } from "../FirebaseCRUD";
import { Tag } from "./tag.model";

const COLLECTION_NAME = 'tags'

const tagCRUD = new FirebaseCRUD(COLLECTION_NAME)
export const createTag = (item: Tag) => tagCRUD.create(item)
export const editTag = (itemId: string, item: Tag) => tagCRUD.update(itemId, item)
export const deleteTag = (itemId: string) => tagCRUD.delete(itemId)
export const getTag = (itemId: string) => tagCRUD.get(itemId)
export const getTags = () => tagCRUD.getAll()
export const listenTags = (cb: CallableFunction) => tagCRUD.listenAll(cb)
