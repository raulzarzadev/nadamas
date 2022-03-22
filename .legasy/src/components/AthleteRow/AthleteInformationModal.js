import { format } from '@/legasy/src/utils/Dates'
import Modal from '@/legasy/src/components/Modals/Modal'

export default function AthleteInformationModal({ open, handleOpen, athlete }) {
  const {
    birth,
    blodType,
    email,
    mobile,
    showBirthday,
    name,
    lastName,
    goals
  } = athlete
  return (
    <Modal open={open} handleOpen={handleOpen} title="Información de alumno"> 
      <div className="text-sm">
        <div>{`${name} ${lastName}`}</div>
        <div>{goals}</div>
        <div>{blodType}</div>
        <div>{email}</div>
        <div>{mobile}</div>
        <div>{showBirthday ? format(birth,'dd MMMM yy') : 'Hidden'}</div>
      </div>
    </Modal>
  )
}
