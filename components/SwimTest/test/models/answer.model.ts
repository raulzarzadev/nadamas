import { Question } from "./question.model";

export interface Answer {
  value: number,
  text: string,
  questionKey: Question['key']
  id:string
}
