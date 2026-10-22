import { useRole } from '@/context/RoleContext'
import { useUser } from '@/context/UserContext'
import type { TrainingPlanAuthor } from '@/firebase/training-plans/training-plan.model'
import { publicNameFromUser } from '@/lib/public-name'

export function useTrainingPlanAuthor(): TrainingPlanAuthor {
  const { user } = useUser()
  const { roles } = useRole()
  return {
    name: publicNameFromUser(user),
    photo: user?.photoURL || user?.photoUrl || '',
    role: roles.coach ? 'coach' : 'athlete',
  }
}
