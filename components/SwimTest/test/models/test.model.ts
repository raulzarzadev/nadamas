import { Answer } from "./answer.model"
import { Question } from "./question.model"

export interface Test {
  id: string
  title: string
  date: Date
  questions: Question[]
  currentLevel: number
  answers: Answer[]
}
