import { FirebaseCRUD } from "../FirebaseCRUD";
import { TypeTeam } from "./team.model";

const TeamCRUD_V2 = new FirebaseCRUD('teamsV2')

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

  members(itemId: TypeTeam['id']) {
    return TeamCRUD_V2.listen(itemId, (data: any) => data.members)
  }




}
