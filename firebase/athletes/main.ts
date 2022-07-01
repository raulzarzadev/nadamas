import { FirebaseCRUD } from "../FirebaseCRUD";

const AthleteCRUD = new FirebaseCRUD('atheltes')

export class Athlete {

  create(item: object): Promise<void | { ok: boolean; type: string; res: any; }> {
    return AthleteCRUD.create(item)
  }
  update(itemId: string, item: object): Promise<void | { ok: boolean; type: string; res: any; }> {
    return AthleteCRUD.update(itemId, item)
  }
  delete(itemId: string): Promise<void | { ok: boolean; type: string; res: any; }> {
    return AthleteCRUD.delete(itemId)
  }
  get(itemId: string): Promise<{ id: any; }> {
    return AthleteCRUD.get(itemId)
  }
  listen(itemId: string, cb: CallableFunction): Promise<void> {
    return AthleteCRUD.listen(itemId, cb)
  }


}
