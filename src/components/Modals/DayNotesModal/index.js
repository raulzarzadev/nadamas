import { updateAttendanceList } from '@/firebase/attendance'
import { format } from '@/src/utils/Dates'
import { ClipboardIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import Textarea from '@comps/inputs/Textarea'
import { useEffect, useState } from 'react'
import Modal from '../Modal'

export default function DayNotesModal({ schedule, date, notes }) {
  const [openNotes, setOpenNotes] = useState(false)
  const handleOpenNotes = () => {
    setOpenNotes(!openNotes)
  }
  const handleSubmit = (form) => {
    updateAttendanceList(form)
      .then((res) => console.log('RES', res))
      .catch((err) => console.log('err', err))
    setOpenNotes(false)
  }
  const handleChange = ({ target }) => {
    setForm({ ...form, [target.name]: target.value })
  }
  const [form, setForm] = useState({})
  useEffect(() => {
    setForm({ ...form, content: notes })
  }, [notes])
  return (
    <>
      <Button iconOnly size="xs" variant="outline" onClick={handleOpenNotes}>
        <ClipboardIcon />
      </Button>
      <Modal
        handleOpen={handleOpenNotes}
        open={openNotes}
        title={`Notas de clase ${schedule}`}
      >
        <div>
          {format(date, 'EEEE dd MMM')}
          <span className="mx-3">{schedule}</span>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit({ schedule, date, notes: form.content })
            }}
          >
            <Textarea
              rows={6}
              value={form.content}
              name="content"
              onChange={handleChange}
            />
            <div className="p-4 pb-0">
              <Button size="sm">Guardar</Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  )
}
