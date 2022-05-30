import { FirebaseCRUD } from "../FirebaseCRUD";
import { Test } from "./model";

const testsCRUD = new FirebaseCRUD('tests')

export const createTest = (test: Test) => testsCRUD.create(test)
export const updateTest = (testId: string, newTest: Test) => testsCRUD.update(testId, newTest)
export const deleteTest = (testId: string) => testsCRUD.delete(testId)
export const getTest = (testId: string) => testsCRUD.get(testId)
export const listen = (testId: string, cb: CallableFunction) => testsCRUD.listen(testId, cb)
