import { Base } from "../base.modal"

export interface Athlete extends Base {
  alias: string
  name: string
  email: string
  birth: Date | number | string
  contact: {
    phone: string
    email: string
  }
  emmergencyContact: {
    name: string
    phone: string
    relationship: string
  }
  isCoach: boolean
  medicInformation: {
    blodType: string
    considerations: string
  }
  photoURL: string
  providerId: string

}
