import { useEffect, useState } from 'react'

export default function EventStatus({ status = 'RUNNING' }) {
  const [eventStatus, setEventStatus] = useState(undefined)
  useEffect(() => {
    setEventStatus(EVENT_STATUS[status])
  }, [status])
  const EVENT_STATUS = {
    RUNNING: {
      label: 'En marcha',
      color: 'bg-success'
    },
    FINISH: {
      label: 'Finalizado',
      color: 'bg-primary'
    },
    CANCEL: {
      label: 'Cancelado',
      color: 'bg-danger'
    },
    FULL: {
      label: 'Sin lugares',
      color: 'bg-secondary'
    }
  }
  return (
    <div className="  absolute  flex justify-center items-center -left-3 top-5 -rotate-45 transform ">
      <div className={`px-1 rounded-xl font-bold ${eventStatus?.color}`}>
        {eventStatus?.label}
      </div>
    </div>
  )
}
