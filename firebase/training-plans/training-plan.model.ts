import type { TrainingCycle } from '@/lib/training-planner'

export interface TrainingPlan {
  id: string
  userId: string
  createdAt: number
  cycles: TrainingCycle[]
}
