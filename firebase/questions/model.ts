import { Option } from "./Option.model"

export interface Question {
  text: string
  options: Option[]
  key: string,
  testId?: string,
}
