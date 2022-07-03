import { Athlete } from "./athlete.model";


export interface CreateAthleteDto extends Pick<Athlete, 'name' | 'id' | 'email'> {


}
