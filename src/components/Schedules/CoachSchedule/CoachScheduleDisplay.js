import Modal from '@comps/Modals/Modal'
import { dayLabels } from '@/src/utils/Dates'
import { useState } from 'react'
import Button from '@comps/inputs/Button'

export default function CoachScheduleDisplay({
  schedule = undefined,
  setSchedule = () => {}
}) {
  console.log(`schedule`, schedule)

  const handleRemoveHour = () => {
    const { day, hour } = deleteDisplay
    // console.log({hour, days:[day]});
    // const res = schedule[day]?.filter((time) => time !== hour)
    const getDaysWithSchedule = (time, schedule) => {
      let res = []
      for (const day in schedule) {
        if (Object.hasOwnProperty.call(schedule, day)) {
          if (schedule[day].includes(time)) res.push(parseInt(day))
        }
      }
      return res
    }
    const newDaysList = getDaysWithSchedule(hour, schedule).filter(
      (d) => d !== parseInt(day)
    )

    setSchedule({ hour, days: newDaysList })
  }
  const [deleteDisplay, setDeleteDisplay] = useState(null)
  const handeleOpenDeleteModal = () => {
    setModalDeleteOpen(!modalDeleteOpen)
  }
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false)

  return (
    <div className="">
      {schedule &&
        Object?.keys(schedule)?.map((day) => (
          <div key={day} className="">
            {dayLabels[day] && !!schedule[day].length && (
              <div className="flex w-full ">
                <div className="w-2/6 text-right p-1 pr-2">
                  {dayLabels[day]}
                </div>
                <div className="w-4/6 flex items-center overflow-auto  ">
                  {schedule[day].sort()?.map((hour, i) => (
                    <button
                      key={i}
                      className="relative m-1 bg-gray-600 p-1 rounded-md shadow-md hover:shadow-none "
                      onClick={() => {
                        handeleOpenDeleteModal()
                        setDeleteDisplay({ day, hour })
                      }}
                    >
                      {hour}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      <Modal
        open={modalDeleteOpen}
        handleOpen={setModalDeleteOpen}
        title="Elimina horario"
      >
        <div className="flex flex-col">
          <h4>Eliminar este horario:</h4>
          <div>
            <div>{dayLabels[deleteDisplay?.day]}</div>
            <div className="relative m-1 bg-gray-600 p-1 rounded-md shadow-md ">
              {deleteDisplay?.hour}
            </div>
          </div>
          <div className="my-4">
            <Button
              variant="danger"
              onClick={() => {
                handleRemoveHour()
                handeleOpenDeleteModal()
              }}
            >
              Elimina
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
