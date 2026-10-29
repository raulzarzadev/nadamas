'use client'

import { useState } from 'react'
import CoachClassTrainings from './CoachClassTrainings'
import TrainingPlanner from './TrainingPlanner'

export default function CoachTrainingWorkspace() {
  const [createRequest, setCreateRequest] = useState(0)
  return (
    <>
      <TrainingPlanner onCreateSession={() => setCreateRequest((value) => value + 1)} />
      <CoachClassTrainings createRequest={createRequest} />
    </>
  )
}
