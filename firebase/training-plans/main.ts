import { where } from 'firebase/firestore'
import type { TrainingCycle } from '@/lib/training-planner'
import { FirebaseCRUD } from '../FirebaseCRUD'
import type { TrainingPlan } from './training-plan.model'

const store = new FirebaseCRUD('trainingPlans')

class TrainingPlans {
  async list(userId: string): Promise<TrainingPlan[]> {
    return (await store.getMany([where('userId', '==', userId)])) as TrainingPlan[]
  }
  create(cycles: TrainingCycle[]) {
    return store.create({ cycles })
  }
  update(id: string, cycles: TrainingCycle[]) {
    return store.update(id, { cycles })
  }
  delete(id: string) {
    return store.delete(id)
  }
}
export const TrainingPlanCRUD = new TrainingPlans()
