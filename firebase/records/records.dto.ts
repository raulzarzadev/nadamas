import { RecordType } from "./records.model";

export interface CreateRecordDto extends Pick<RecordType, 'race'> {

}
