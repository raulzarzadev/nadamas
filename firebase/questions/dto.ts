import { Question } from "./model"

export interface CreateQuestionDto extends Omit<Question, 'id' | 'createdAt' | 'updatedAt' > {
}


export interface UpdateQuestionDto extends Partial<CreateQuestionDto> {

}

export interface FindQuestionDto extends Partial<Readonly<Omit<Question, 'tags'>>> {
  tags: ReadonlyArray<string>
}

