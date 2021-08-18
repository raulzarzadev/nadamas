import { getAthleteSchedule, updateAthleteSchedule } from '@/firebase/client'
import { useAuth } from '@/src/context/AuthContext'
import { formatObjectTimeToString } from '@/src/utils/Hours'
import { AddIcon } from '@/src/utils/Icons'
import { set } from 'date-fns'
import { useEffect, useState } from 'react'
import Button from '@comps/inputs/Button'
import PickerDays from '../inputs/PickerDays'
import PickerTime from '../inputs/PickerTime'
import CoachScheduleDisplay from './CoachScheduleDisplay'

export default function CoachSchedule() {
  const { user, userSchedule } = useAuth()
  useEffect(() => {
    if (user) {
      getAthleteSchedule(user.id)
        .then((res) => setSchedule(res.schedule))
        .catch((err) => console.log(err))
    }
  }, [user])

  const [schedule, setSchedule] = useState({})

  const handleAddSchedule = (newSchedule) => {
    setSchedule(formatNewSchedule(newSchedule, schedule))
  }

  /* useEffect(() => {
    updateAthleteSchedule({
      isCoach: true,
      athleteId: user.id,
      schedule,
      owner: user.name
    })
  }, [schedule])
 */
  return (
    <div>
      <div>
        <ScheduleSelect
          /* schedule={schedule}
           */
          handleAddSchedule={handleAddSchedule}
        />
        <CoachScheduleDisplay schedule={schedule} setSchedule={setSchedule} />
      </div>
    </div>
  )
}

const ScheduleSelect = ({ schedule = {}, handleAddSchedule = () => {} }) => {
  /*  const initalFormState = { hour: '--:--', days: [] }
  const [form, setForm] = useState(initalFormState) */
  /* 

  const _handleSetTime = (time) => {
    setForm({ ...form, hour: time })
  }
  const _handleSetDays = (days) => {
    setForm({ ...form, days })
  }

  let daysActivesForThisSchedule = []
  Object.keys(schedule).forEach((day) => {
    if (schedule[day].includes(form.hour)) {
      daysActivesForThisSchedule.push(day)
    }
  }) */

  /*   useEffect(()=>{
    handleAddSchedule(form)
  },[form.days]) */
  /* 
  useEffect(() => {
    // Find days whit form.hour inside and set days select
    let daysWithThisTime = []
    Object.keys(schedule).forEach((day) => {
      if (schedule[day].includes(form.hour)) {
        daysWithThisTime = [...daysWithThisTime, parseInt(day)]
      }
      setDays(daysWithThisTime)
    })
  }, [form.hour]) */

  const [time, setTime] = useState('--:--')
  const [days, setDays] = useState([])

  const handleSetDays = (days) => {
    handleAddSchedule({ hour: formatObjectTimeToString({ time }), days })
    setDays(days)
  }

  const handleSetTime = (time) => {
    setTime(time)
  }

  /* useEffect(() => {
   let daysWithThisTime = []
   Object.keys(schedule).forEach((day) => {
     if (schedule[day].includes(form.hour)) {
       daysWithThisTime = [...daysWithThisTime, parseInt(day)]
     }
    })
    setDays(daysWithThisTime)
  }, [time]) */

  return (
    <>
      <h5 className="text-center mt-4 font-bold">
        Crear / editar nuevo horario
      </h5>
      <div className="flex flex-col items-center px-2 justify-center">
        <PickerTime handleSetTime={handleSetTime} />
        <PickerDays days={days} handleSetDays={handleSetDays} />
      </div>
    </>
  )
}

const formatNewSchedule = (
  newSchedule = { days: [], hour: '' },
  oldSchedule = { day: [''] }
) => {
  let res = { ...oldSchedule }
  let { hour, days } = newSchedule

  //Encuetra todas las coincidencias dentro de old  de hour && days

  days.forEach(day =>{

  } )

  /* console.log('days', days)

  Object.keys(res).forEach((d) => {
    days.forEach(day => {
      if (!res[day]) return res[day] = [hour]
      if (!res[day].includes(hour)){
        console.log('if')
        res[day].push(hour)
      }
    })
  }) */
  
  /* 
   if (!res[d]) return (res[d] = [hour])
    if (days.includes(hour)) {
      console.log('if')
    } else {
      console.log('else')
      res[d].push(hour)
    }
  /* 
  days.forEach((day) => {
    if (!res[day]) return (res[day] = [hour])
    if (!res[day].includes(hour)) {
      res[day].push(hour)
      console.log('if')
    } else {
      console.log('else')
      res[day].splice(res[day].indexOf(hour), 1)
    }
  }) */

  return res
}
/* 
console.log('PASO')

  let res = { ...oldSchedule }

  const newDaysList = newSchedule.days
  const newHour = newSchedule.hour

  const alreadyExist = () => {
    let already
    newDaysList.forEach((day) => {
      if (!res[day]) res[day] = []
      already = res[day].includes(newHour)
    })
    return !!already
  }
  if(alreadyExist()){
    res[]
  }
   */
/* 
  
  //* / newshedule = {days:[], hour:""}
  // oldschedule = {1:["17:00","16:00"],2:[]}
  let res = { ...oldSchedule }
  console.log('res', res)
  console.log(newSchedule)
  const newHour = newSchedule.hour
  newSchedule.days.forEach((day) => {
    console.log('res[day]', res[day])
    
    if (!res[day]) res[day] = []
    if (!res[day].includes(newHour)) {
      res[day].push(newHour)
    } else {
      res[day].splice(res[day].indexOf(newHour), 1)
    }
    
  })
  console.log('res', res)
  //res : {day:[]}  */
/* 
  let res = { ...oldSchedule }
  const hour = newSchedule.hour
  newSchedule.days.forEach((day) => {
    if (!oldSchedule[day]) oldSchedule[day] = []
    
    if (oldSchedule[day].includes(hour)) {
      //quitalo
      console.log('incluye')
      res[day].splice(res[day].indexOf(hour), 1)
    } else {
      //agregalo
      res[day].push(hour)
      console.log('no lo incluye')
    }
  })
  return res */

/* 
  
   days.forEach((day) => {
    if (!res[day]) return res[day] = [hour]
    if (res[day].includes(hour)) {
      console.log('res[day].includes(hour)', res)
      res[day].splice(res[day].indexOf(hour), 1)
    } else {
      res[day].push(hour)
    }
  })
  */
