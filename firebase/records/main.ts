import { where } from "firebase/firestore";
import { FirebaseCRUD } from "../FirebaseCRUD";
import { RecordType } from "./records.model";

const RecordFirebaseCRUD = new FirebaseCRUD('records_V2')

class Record {
  create(newItem: RecordType) {
    return RecordFirebaseCRUD.create(newItem)
  };
  update(itemId: string, newItem: any) {
    return RecordFirebaseCRUD.update(itemId, newItem)
  };
  delete(itemId: string) {
    return RecordFirebaseCRUD.delete(itemId)
  };
  get(itemId: string) {
    return RecordFirebaseCRUD.get(itemId)
  };
  listen(itemId: string, cb: CallableFunction) {
    RecordFirebaseCRUD.listen(itemId, cb)
  };
  listenUserRecords(cb: CallableFunction) {
    RecordFirebaseCRUD.listenUserDocs(cb)
  };
  listenAthleteRecords(athleteId: string, cb: CallableFunction) {
    RecordFirebaseCRUD.listenMany([where('athleteId', '==', athleteId)], cb)
  }
}

export const RecordCRUD = new Record()

