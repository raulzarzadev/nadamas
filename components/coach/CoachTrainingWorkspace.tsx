'use client'

import { useState } from 'react'
import AthleteSearchBar from '@/components/athlete/AthleteSearchBar'
import PublicSelectedSession from '@/components/training/PublicSelectedSession'
import { useTrainingSelection } from '@/lib/client/training-selection'
import CoachClassTrainings from './CoachClassTrainings'
import TrainingPlanner from './TrainingPlanner'

export default function CoachTrainingWorkspace() {
  const { selection, select } = useTrainingSelection('coach')
  const [createRequest, setCreateRequest] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  return (
    <>
      <AthleteSearchBar
        defaultTab="plans"
        open={searchOpen}
        onOpenChange={setSearchOpen}
        hideTrigger
        trainingRole="coach"
        selectedTraining={selection}
        onSelectTraining={select}
      />
      <TrainingPlanner
        selection={selection}
        onSelectTraining={select}
        onSearch={() => setSearchOpen(true)}
        onCreateSession={() => setCreateRequest((value) => value + 1)}
      />
      <PublicSelectedSession selection={selection} accountRole="coach" onSelectTraining={select} />
      <CoachClassTrainings
        createRequest={createRequest}
        selection={selection}
        onSelectTraining={select}
      />
    </>
  )
}
