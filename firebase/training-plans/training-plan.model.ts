import type { TrainingCycle } from '@/lib/training-planner'

export type TrainingPlanVisibility = 'private' | 'public'

export interface TrainingPlanAuthor {
  name: string
  photo: string
  role: 'coach' | 'athlete'
}

export interface TrainingPlanSummary {
  title: string
  goal: string
  content: string
  startDate: string
  endDate: string
  sessionWeekdays: number[]
  authorName: string
  authorPhoto: string
  authorRole: 'coach' | 'athlete'
}

export interface TrainingPlan {
  id: string
  userId: string
  createdAt: number
  cycles: TrainingCycle[]
  visibility?: TrainingPlanVisibility
  summary?: TrainingPlanSummary
  subscriberCount?: number
}
