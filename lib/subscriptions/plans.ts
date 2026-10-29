import { NADAMAS_PRICING } from '../pricing'
import type { SchoolSubscription } from './model'

export type SeatKind = 'teacher' | 'student'
export type SchoolPlanName = 'basic' | 'custom' | 'unlimited'

export interface SchoolPlanLimits {
  plan: SchoolPlanName
  /** null means no limit. */
  teachers: number | null
  students: number | null
}

export interface SeatUsage {
  teachers: number
  students: number
}

export type SeatMembership = {
  userId: string
  status?: string
  role?: string
  roles?: string[]
}

export type SeatStudent = {
  id: string
  status?: string
  studentUserId?: string
  additionalProfileId?: string
  guardianIds?: string[]
  managerIds?: string[]
}

export function schoolPlanLimits(sub: SchoolSubscription | null): SchoolPlanLimits {
  if (sub?.paymentExempt) {
    if (sub.customLimits) {
      return {
        plan: 'custom',
        teachers: sub.customLimits.teachers,
        students: sub.customLimits.students,
      }
    }
    return { plan: 'unlimited', teachers: null, students: null }
  }
  return { plan: 'basic', ...NADAMAS_PRICING.basicLimits }
}

const rolesOf = (m: SeatMembership) => [...(m.roles ?? []), ...(m.role ? [m.role] : [])]

export function seatKeys(input: { memberships: SeatMembership[]; students: SeatStudent[] }): {
  teachers: Set<string>
  students: Set<string>
} {
  const teachers = new Set<string>()
  const students = new Set<string>()
  // A guardian's own `student` membership is not a seat: a parent with 3 children counts 3.
  const guardians = new Set<string>()
  const ownRoster = new Set<string>()
  for (const s of input.students) {
    if (s.studentUserId) ownRoster.add(s.studentUserId)
    if (s.status !== 'active') continue
    students.add(s.studentUserId || s.additionalProfileId || s.id)
    for (const id of [...(s.guardianIds ?? []), ...(s.managerIds ?? [])]) guardians.add(id)
  }
  for (const m of input.memberships) {
    if (m.status !== 'active') continue
    const roles = rolesOf(m)
    const guardianOnly = guardians.has(m.userId) && !ownRoster.has(m.userId)
    if (roles.includes('student') && !guardianOnly) students.add(m.userId)
    if (roles.includes('teacher') && !roles.includes('director')) teachers.add(m.userId)
  }
  return { teachers, students }
}

export function seatUsage(keys: { teachers: Set<string>; students: Set<string> }): SeatUsage {
  return { teachers: keys.teachers.size, students: keys.students.size }
}

export function planLimitMessage(limits: SchoolPlanLimits): string {
  if (limits.plan === 'basic') {
    return `Llegaste al límite de tu plan Básico (${limits.teachers} profes / ${limits.students} alumnos). Contáctanos para un plan personalizado.`
  }
  return `Llegaste al límite de tu plan (${limits.teachers} profes / ${limits.students} alumnos). Contáctanos para ampliarlo.`
}

export function hasSeat(limits: SchoolPlanLimits, usage: SeatUsage, kind: SeatKind): boolean {
  const limit = kind === 'teacher' ? limits.teachers : limits.students
  const used = kind === 'teacher' ? usage.teachers : usage.students
  return limit === null || used < limit
}

export function planUsageLabel(limits: SchoolPlanLimits, usage: SeatUsage): string {
  if (limits.plan === 'unlimited') return 'Sin límite'
  const name = limits.plan === 'basic' ? 'Plan Básico' : 'Plan Personalizado'
  return `${name} · ${usage.teachers} de ${limits.teachers} profes · ${usage.students} de ${limits.students} alumnos`
}

/** True when any seat kind is above its limit (e.g. the school was over before limits existed). */
export function planOverLimit(limits: SchoolPlanLimits, usage: SeatUsage): boolean {
  return (
    (limits.teachers !== null && usage.teachers > limits.teachers) ||
    (limits.students !== null && usage.students > limits.students)
  )
}

export function planOverLimitMessage(limits: SchoolPlanLimits): string {
  return limits.plan === 'basic'
    ? 'Tu escuela supera los límites del plan Básico. Contáctanos para un plan personalizado.'
    : 'Tu escuela supera los límites de su plan. Contáctanos para ampliarlo.'
}
