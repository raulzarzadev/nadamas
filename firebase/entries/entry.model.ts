import { Base } from "../base.modal"
import { Tag } from "../tags/tag.model"

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
  lovedBy: string[],
  tags: Tag['id'][]
}
