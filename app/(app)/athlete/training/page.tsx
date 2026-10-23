import AthleteSearchBar from '@/components/athlete/AthleteSearchBar'
import TrainingPlanner from '@/components/coach/TrainingPlanner'

export default function AthleteTrainingPage() {
  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-4xl">
        <AthleteSearchBar defaultTab="plans" />
      </div>
      <TrainingPlanner />
    </div>
  )
}
