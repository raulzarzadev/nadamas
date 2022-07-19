import { Base } from "../base.modal"

export interface Entry extends Base {
  content: JSON
  options: {
    publishedAsAnonymous: boolean,
    isPublic: boolean
  },
  userInfo: {
    id: string,
    alias?: string
  }
  userId: string
  lovedBy: string[]
}
