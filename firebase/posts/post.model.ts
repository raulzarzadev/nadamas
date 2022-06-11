import { Base } from "../base.modal"

export interface Post extends Base {
  title: string
  content: string
  isPublic: boolean,
  image: string,
  images: string[]
  teamId: string,
}
