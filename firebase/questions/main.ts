import { where } from "firebase/firestore";
import { FirebaseCRUD } from "../FirebaseCRUD";
import { CreateQuestionDto, UpdateQuestionDto } from "./dto";

const COLLECTION_NAME = 'questions'c

const questionCRUD = new FirebaseCRUD(COLLECTION_NAME)
export const createQuestion = (item: CreateQuestionDto) => questionCRUD.create(item)
export const editQuestion = (itemId: string, item: UpdateQuestionDto) => questionCRUD.update(itemId, item)
export const deleteQuestion = (itemId: string) => questionCRUD.delete(itemId)
export const getQuestion = (itemId: string) => questionCRUD.get(itemId)
export const listenQuestion = (itemId: string, cb: CallableFunction) => questionCRUD.listen(itemId, cb)
export const listenUserQuestions = (userId: string, cb: CallableFunction) => questionCRUD.listenDocs([where('userId', '==', userId || null)], cb)
