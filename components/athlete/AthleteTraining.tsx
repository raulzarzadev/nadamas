'use client'

import { useState } from 'react'
import AthleteSearchBar from '@/components/athlete/AthleteSearchBar'
import TrainingPlanner from '@/components/coach/TrainingPlanner'

// Athlete Entrenos: plan search on top; the planner's empty state can open that same search.
export default function AthleteTraining() {
  const [searchOpen, setSearchOpen] = useState(false)
  // No plans yet: the empty state carries "Buscar entrenos", so the top bar would repeat it.
  const [empty, setEmpty] = useState(false)
  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-4xl">
        <AthleteSearchBar
          defaultTab="plans"
          open={searchOpen}
          onOpenChange={setSearchOpen}
          hideTrigger={empty}
        />
      </div>
      <TrainingPlanner onSearch={() => setSearchOpen(true)} onEmptyChange={setEmpty} />
    </div>
  )
}
