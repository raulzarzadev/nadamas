import { Answer } from "../models/answer.model";
import { Question } from "../models/question.model";
import { Test } from "../models/test.model";

export class TestMemoryService implements Test {

  id: string;
  title: string;
  date: Date;
  questions: Question[];
  currentLevel: number;
  answers: Answer[];



  addQuestion(question: Question) {
    this.questions.push(question)
  }

  removeQuestion(keyQuestion: Question['key']) {
    const questionsCleaned = this.questions.filter(q => q.key === keyQuestion)
    this.questions = questionsCleaned
  }

  addAnswer(answer: Answer) {
    this.answers.push(answer)
  }

  removeAnswer(answerKey: Answer['questionKey']) {
    this.answers.filter((answer) => answer.questionKey === answerKey)
  }
  

  addPoints(points: number) {
    this.currentLevel += points
  }
  subPoints(points: number) {
    this.currentLevel -= points
  }

}
