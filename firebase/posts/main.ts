import { orderBy, where } from "firebase/firestore";
import { FirebaseCRUD } from "../FirebaseCRUD";
import { Post } from "./post.model";

const COLLECTION_NAME = 'posts'

const postCRUD = new FirebaseCRUD(COLLECTION_NAME)
export const createPost = (item: Post) => postCRUD.create(item)
export const editPost = (itemId: string, item: Post) => postCRUD.update(itemId, item)
export const deletePost = (itemId: string) => postCRUD.delete(itemId)
export const getPost = (itemId: string) => postCRUD.get(itemId)
export const listenPost = (itemId: string, cb: CallableFunction) => postCRUD.listen(itemId, cb)
export const listenUserPosts = (userId: string, cb: CallableFunction) => postCRUD.listenDocs([where('userId', '==', userId || null)], cb)
export const listenTeamPosts = (teamId: string, cb: CallableFunction) => postCRUD.listenDocs([where('teamId', '==', teamId || null), orderBy('createdAt','desc')], cb)
