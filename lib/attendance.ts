import type { SchoolClassOccurrence } from './school'

export type AttendanceMethod = 'qr' | 'name' | 'id'
export interface AttendanceRecord {
  id: string
  schoolId: string
  occurrenceId: string
  studentId: string
  actorId: string
  recordedAt: number
  method: AttendanceMethod
}
export interface AttendanceCandidate {
  studentId?: string
  name: string
  numericId?: string
  photoURL?: string
  inSchool: boolean
  enrolled: boolean
  pending: boolean
  attended: boolean
}
export type AttendanceFailure =
  | 'cancelled'
  | 'blocked'
  | 'outside_school'
  | 'not_enrolled'
  | 'full'
  | 'promote_required'
  | 'promotion_denied'

/** Attendance never approves an enrollment. Adding a person requires explicit consent. */
export function attendanceEnrollmentPolicy({
  occurrence,
  enrolled,
  inSchool,
  blocked,
  director,
  addToClass,
  linkToSchool,
  promoteToGroup,
}: {
  occurrence: Pick<SchoolClassOccurrence, 'status' | 'type' | 'classFull' | 'studentIds'>
  enrolled: boolean
  inSchool: boolean
  blocked: boolean
  director: boolean
  addToClass: boolean
  linkToSchool: boolean
  promoteToGroup: boolean
}): AttendanceFailure | null {
  if (occurrence.status === 'cancelled') return 'cancelled'
  if (blocked) return 'blocked'
  if (enrolled) return null
  if (!inSchool && !linkToSchool) return 'outside_school'
  if (!addToClass) return 'not_enrolled'
  if (occurrence.classFull || occurrence.studentIds.length >= 100) return 'full'
  if (occurrence.type === 'individual' && occurrence.studentIds.length) {
    if (!promoteToGroup) return 'promote_required'
    if (!director) return 'promotion_denied'
  }
  return null
}

export const ATTENDANCE_MESSAGES: Record<AttendanceFailure, string> = {
  cancelled: 'Esta clase está cancelada.',
  blocked: 'El horario está bloqueado. Desbloquéalo antes de pasar lista.',
  outside_school: 'Este atleta aún no pertenece a la escuela. Confirma su incorporación.',
  not_enrolled: 'Este atleta no está inscrito en la clase. Confirma que deseas agregarlo.',
  full: 'La clase alcanzó su capacidad o tiene el cupo cerrado. La dirección debe revisar el cupo antes de agregar atletas.',
  promote_required: 'Esta clase particular ya tiene alumno. Confirma el cambio a grupal.',
  promotion_denied: 'La dirección debe convertir esta clase a grupal antes de agregar otro atleta.',
}
