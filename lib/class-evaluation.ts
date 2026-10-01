import { fromZonedTime } from 'date-fns-tz'
import type { Booking } from '@/lib/coach-booking'

export const CLASS_TOPICS = ['technique', 'endurance', 'confidence', 'coordination'] as const
export type ClassTopic = (typeof CLASS_TOPICS)[number]
export const CLASS_TOPIC_LABELS: Record<ClassTopic, string> = {
  technique: 'Técnica',
  endurance: 'Resistencia',
  confidence: 'Confianza',
  coordination: 'Coordinación',
}
export interface ClassEvaluation {
  rating: number
  topics: ClassTopic[]
  publicComment: string
  privateComment: string
}
export interface PublicClassEvaluation extends Omit<ClassEvaluation, 'privateComment'> {
  id: string
  coachId: string
  date: string
  updatedAt: number
}
export function canEvaluateBooking(
  booking: Pick<Booking, 'date' | 'endTime' | 'status' | 'attended'>,
  now = Date.now()
) {
  const end = fromZonedTime(`${booking.date}T${booking.endTime}`, 'America/Mazatlan').getTime()
  return (
    booking.status === 'confirmed' &&
    booking.attended !== false &&
    Number.isFinite(end) &&
    end < now
  )
}
export function parseClassEvaluation(value: unknown): ClassEvaluation | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Partial<ClassEvaluation>
  if (
    !Number.isInteger(data.rating) ||
    !data.rating ||
    data.rating < 1 ||
    data.rating > 5 ||
    !Array.isArray(data.topics) ||
    data.topics.length < 1 ||
    data.topics.length > 4 ||
    !data.topics.every((topic) => CLASS_TOPICS.includes(topic)) ||
    typeof data.publicComment !== 'string' ||
    typeof data.privateComment !== 'string' ||
    data.publicComment.length > 2000 ||
    data.privateComment.length > 2000
  )
    return null
  return {
    rating: data.rating,
    topics: [...new Set(data.topics)],
    publicComment: data.publicComment.trim(),
    privateComment: data.privateComment.trim(),
  }
}

export function publicClassEvaluation(
  id: string,
  data: PublicClassEvaluation
): PublicClassEvaluation {
  return {
    id,
    coachId: data.coachId,
    date: data.date,
    rating: data.rating,
    topics: data.topics,
    publicComment: data.publicComment,
    updatedAt: data.updatedAt,
  }
}
