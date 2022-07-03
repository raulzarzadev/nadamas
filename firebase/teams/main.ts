import { where } from "firebase/firestore";
import { FirebaseCRUD } from "../FirebaseCRUD";
import { TypeTeam } from "./team.model";

const TeamCRUD_V2 = new FirebaseCRUD('teams')

export class Team {

  create(item: object): Promise<void | { ok: boolean; type: string; res: any; }> {
    return TeamCRUD_V2.create(item)
  }
  update(itemId: string, item: object): Promise<void | { ok: boolean; type: string; res: any; }> {
    return TeamCRUD_V2.update(itemId, item)
  }
  delete(itemId: string): Promise<void | { ok: boolean; type: string; res: any; }> {
    return TeamCRUD_V2.delete(itemId)
  }
  get(itemId: string): Promise<{ id: any; }> {
    return TeamCRUD_V2.get(itemId)
  }
  listen(itemId: string, cb: CallableFunction): Promise<void> {
    return TeamCRUD_V2.listen(itemId, cb)
  }

  listenUserTeams(cb: CallableFunction) {
    TeamCRUD_V2.listenUserDocs(cb)
  }


  members(itemId: TypeTeam['id']) {
    return TeamCRUD_V2.listen(itemId, (data: any) => data.members)
  }
}


export const TeamCRUD = new Team()
