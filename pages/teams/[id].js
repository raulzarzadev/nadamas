import Team from '@comps/Team'
import { useRouter } from 'next/router'
import { useState } from 'react'
export default function team() {
  const {
    query: { id }
  } = useRouter()
  return (
    <div className="">
      <Team teamId={id} />
    </div>
  )
}
