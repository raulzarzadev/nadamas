import { where } from 'firebase/firestore'
import {
  decodeTrainingCycles,
  encodeTrainingCycles,
  type StoredTrainingCycle,
} from '@/lib/training-plan-storage'
import { buildTrainingPlanSummary } from '@/lib/training-plan-summary'
import type { TrainingCycle } from '@/lib/training-planner'
import { FirebaseCRUD } from '../FirebaseCRUD'
import type {
  TrainingPlan,
  TrainingPlanAuthor,
  TrainingPlanVisibility,
} from './training-plan.model'

const store = new FirebaseCRUD('trainingPlans')
const subscriptions = new FirebaseCRUD('trainingPlanSubscriptions')

type StoredTrainingPlan = Omit<TrainingPlan, 'cycles'> & { cycles: StoredTrainingCycle[] }

const decodePlan = (plan: StoredTrainingPlan): TrainingPlan => ({
  ...plan,
  cycles: decodeTrainingCycles(plan.cycles),
})

const isMissingOrDenied = (error: unknown) => {
  const code = (error as { code?: string } | null)?.code
  return code === 'permission-denied' || code === 'not-found'
}

class TrainingPlans {
  async list(userId: string): Promise<TrainingPlan[]> {
    const plans = (await store.getMany([where('userId', '==', userId)])) as StoredTrainingPlan[]
    return plans.map(decodePlan)
  }
  async get(id: string): Promise<TrainingPlan | null> {
    try {
      const plan = (await store.get(id)) as StoredTrainingPlan | null
      return plan ? decodePlan(plan) : null
    } catch (error) {
      if (isMissingOrDenied(error)) return null
      throw error
    }
  }
  async listPublic(): Promise<TrainingPlan[]> {
    const plans = (await store.getMany([
      where('visibility', '==', 'public'),
    ])) as StoredTrainingPlan[]
    return plans.map(decodePlan)
  }
  async listSubscribed(uid: string): Promise<TrainingPlan[]> {
    const subs = (await subscriptions.getMany([where('uid', '==', uid)])) as {
      planId?: string
    }[]
    const plans = await Promise.all(
      subs.filter((sub) => sub.planId).map((sub) => this.get(sub.planId as string))
    )
    return plans.filter((plan): plan is TrainingPlan => plan !== null)
  }
  create(cycles: TrainingCycle[], author: TrainingPlanAuthor) {
    return store.create({
      cycles: encodeTrainingCycles(cycles),
      visibility: 'private',
      summary: buildTrainingPlanSummary(cycles, author),
    })
  }
  update(id: string, cycles: TrainingCycle[], author: TrainingPlanAuthor) {
    return store.update(id, {
      cycles: encodeTrainingCycles(cycles),
      summary: buildTrainingPlanSummary(cycles, author),
    })
  }
  setVisibility(id: string, visibility: TrainingPlanVisibility) {
    return store.update(id, { visibility })
  }
  delete(id: string) {
    return store.delete(id)
  }
}
export const TrainingPlanCRUD = new TrainingPlans()
