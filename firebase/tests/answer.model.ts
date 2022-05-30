import { Option } from "../questions/Option.model";

export interface Answer {
  id: string,
  questionId: string,
  answer: Option
  points: number
}
