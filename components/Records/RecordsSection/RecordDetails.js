import { Dates } from "firebase-dates-util"
import { getStyleInfo } from "../../../CONSTANTS/SWIMMING_TESTS"
import ButtonIcon from "../../Inputs/Button/ButtonIcon"
import formatRecord from "../../Inputs/PickerRecord/formatRecord"
import ModalDelete from "../../Modal/ModalDelete"
import { RecordCRUD } from '@firebase/records/main'

const RecordDetails = ({ record, showOptions = false }) => {
  console.log(record)
  const { createdAt, updatedAt, race, id, userId } = record
  const handleDeleteRecord = (id) => {
    console.log(id)
    RecordCRUD.delete(record.id).then(res => console.log(res))
  }
  return (
    <div>
      <div>{race?.distance}m <span>{getStyleInfo(race.style).largeLabel}</span></div>
      <div>
        <span className="text-2xl">
          {formatRecord(race?.record)}
        </span>
      </div>
      <div>
        <span className="text-xs">
          Acutalizado: {Dates.fromNow(updatedAt || createdAt)}
        </span>
      </div>
      {showOptions &&
        <div className="flex justify-evenly pt-4" >
          <ButtonIcon iconName={'edit'} />
          <ModalDelete itemId={record?.id} handleDelete={handleDeleteRecord} />
        </div>
      }
    </div>
  )
}

export default RecordDetails
