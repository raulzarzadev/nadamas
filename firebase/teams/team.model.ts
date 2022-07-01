import { Base } from "../base.modal"

export interface TypeTeam extends Base {
  
  name: string
  
  coach: string
  
  coaches: string[]
  
  description: string
  
  isPublic: boolean
  
  joinRequests: string[]
  
  members: string[]
}
