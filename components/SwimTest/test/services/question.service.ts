import { Answer } from "../models/answer.model";
import { Question } from "../models/question.model";

export class QuestionSerivice implements Question {
  
  text: string;
  options: Answer[];
  key: string;

  edit(newData: Question) {
    const { text, options, key } = newData
    this.text = text
    this.options = options
    this.key = key
  }
  addOption(option: Answer) {
    this.options.push(option)
  }
  removeOption(optionId: Answer['id']) {
    this.options = [...this.options].filter((op) => op.id === optionId)
  }


}
