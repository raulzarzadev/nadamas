import { Base } from "../base.modal";
import { Reward } from "../reward/Reward.model";

export interface RecordType extends Base {
  awards: Reward[]
  athleteId: string
  date: any

  event: {
    id: any
    dates: {
      startAt: any
      endAt: any
    }
    name: string | null
    type: string
  },

  race: {
    type: string
    style: string
    milisecods: number
    distance: number
    date: any
  }


  location: {
    fieldType: string
    fieldSize: string
    name: string
  }

  athlete: {
    id: string,
    name: string
    alias: string
  }
}
