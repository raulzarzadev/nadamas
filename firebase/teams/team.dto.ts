import { Team } from "./team.model";


export interface CreateAthleteDto extends Pick<Team, 'name' | 'id' > {


}
