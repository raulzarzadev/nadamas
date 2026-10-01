import type { SchoolGender } from './school'

export interface AdditionalProfile {
  id: string
  ownerId: string
  name: string
  birthDate: string
  gender: SchoolGender
  createdAt: number
  updatedAt: number
}

export function validProfileBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    date.getTime() <= Date.now()
  )
}
