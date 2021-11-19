import { useEffect, useState } from 'react'

export default function EventStatus({ status = 'RUNNING' }) {
  const [eventStatus, setEventStatus] = useState(undefined)
  useEffect(() => {
    setEventStatus(EVENT_STATUS[status])
  }, [status])
  const EVENT_STATUS = {
    RUNNING: {
      label: 'En marcha',
      color: 'bg-green-600'
    },
    FINISH: {
      label: 'Finalizado',
      color: 'bg-blue-400'
    },
    CALCEL: {
      label: 'Cancelado',
      color: 'bg-red-200'
    },
    FULL: {
      label: 'Lleno',
      color: 'bg-blue-200'
    }
  }
  return (
    <div className="  z-10 absolute  flex justify-center items-center -left-3 top-5 -rotate-45 transform">
      <div className={`px-1 rounded-xl font-bold ${eventStatus?.color}`}>
        {eventStatus?.label}
      </div>
    </div>
  )
}
