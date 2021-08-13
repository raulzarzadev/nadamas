import { dayLabels } from '@/src/utils/Dates'

export default function CoachScheduleDisplay({
  schedule = [],
  setSchedule = () => {}
}) {
  const handleRemoveHour = ({ day, hour }) => {
    const res = schedule[day]?.filter((time) => time !== hour)
    setSchedule({ ...schedule, [day]: res })
  }
  console.log(schedule)

  return (
    <div>
      {Object.keys(schedule).map((day) => (
        <>
          {dayLabels[day] && !!schedule[day].length && (
            <div key={day} className="flex w-full ">
              <div className="w-2/6 text-right p-1 pr-2">{dayLabels[day]}</div>
              <div className="w-3/6 flex items-center ">
                {schedule[day].sort()?.map((hour) => (
                  <div key={hour} className="relative mx-2">
                    {hour}
                    <span className="absolute -top-2 -right-2">
                      <button
                        className="text-xs cursor-pointer"
                        onClick={() => {
                          handleRemoveHour({ day, hour })
                        }}
                      >
                        x
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ))}
    </div>
  )
}
