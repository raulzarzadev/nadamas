import { where } from 'firebase/firestore'
import {
  decodeTrainingCycles,
  encodeTrainingCycles,
  type StoredTrainingCycle,
} from '@/lib/training-plan-storage'
import type { TrainingCycle } from '@/lib/training-planner'
import { FirebaseCRUD } from '../FirebaseCRUD'
import type { TrainingPlan } from './training-plan.model'

const store = new FirebaseCRUD('trainingPlans')

class TrainingPlans {
  async list(userId: string): Promise<TrainingPlan[]> {
    const plans = (await store.getMany([where('userId', '==', userId)])) as (Omit<
      TrainingPlan,
      'cycles'
    > & { cycles: StoredTrainingCycle[] })[]
    return plans.map((plan) => ({ ...plan, cycles: decodeTrainingCycles(plan.cycles) }))
  }
  create(cycles: TrainingCycle[]) {
    return store.create({ cycles: encodeTrainingCycles(cycles) })
  }
  update(id: string, cycles: TrainingCycle[]) {
    return store.update(id, { cycles: encodeTrainingCycles(cycles) })
  }
  delete(id: string) {
    return store.delete(id)
  }
}
export const TrainingPlanCRUD = new TrainingPlans()
