import { Base } from "../base.modal";

export interface RecordType extends Base {

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

  place: {
    type: string
    distance: number
    name: string
  }

  athlete: {
    id: string,
    name: string
    alias: string
  }
}
