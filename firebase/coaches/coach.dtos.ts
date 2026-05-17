import type { CoachPublic, CoachPrivate } from './coach.model'

export type UpsertCoachPublicDto = Partial<
  Omit<CoachPublic, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>

export type UpsertCoachPrivateDto = Partial<
  Omit<CoachPrivate, 'id' | 'updatedAt'>
>
