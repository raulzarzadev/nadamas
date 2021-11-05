import { getAthlete } from '@/firebase/athletes'
import Button from '@comps/inputs/Button'
import MemberRow from '@comps/Teams/MemberRow'
import { useEffect, useState } from 'react'

export default function ParticipantsRows({
  athletesIds,
  handleRemoveMember = (athleteId) => {}
}) {
  return (
    <div className="">
      {!athletesIds.length && 'No hay solicitudes'}
      {athletesIds?.map((athlete) => (
        <MemberRow
          key={athlete}
          athlete={athlete}
          handleRemoveMember={handleRemoveMember}
        />
      ))}
    </div>
  )
}
