import { Option } from "./Option.model";
import { Question } from "./model";

export class QuestionSerivices implements Question {

  text: string;
  options: Option[];
  key: string;

  edit(newData: Question) {
    const { text, options, key } = newData
    this.text = text
    this.options = options
    this.key = key
  }
  remove(questionId){
    console.log('remove question ', questionId)
  }

  addOption(option: Option) {
    this.options.push(option)
  }
  removeOption(optionId: Option['id']) {
    this.options = [...this.options].filter((op) => op.id === optionId)
  }


}
