import { Question } from "../questions/model";
import { Answer } from "./answer.model";

export interface Test {
  id: string,
  questions: Question[]
  answers: Answer[]
  result: number
  title: string
  date: Date
}
