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
  for (const s of input.students) {
    if (s.status !== 'active') continue
    students.add(s.studentUserId || s.additionalProfileId || s.id)
  }
  for (const m of input.memberships) {
    if (m.status !== 'active') continue
    const roles = rolesOf(m)
    if (roles.includes('student')) students.add(m.userId)
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
