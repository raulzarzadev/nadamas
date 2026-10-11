'use client'

import { useState } from 'react'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { StudentProgress } from '@/lib/coach-student-progress'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import AgendaAddStudentModal, { type AddStudentPayload } from './AgendaAddStudentModal'

export interface CreatedStudentPayload {
  athleteId: string
  name: string
  email: string | null
  phone?: string
  totalClasses: number
  progress: StudentProgress
  entries: []
}

export default function AddStudentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (student: CreatedStudentPayload) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(students: AddStudentPayload[]) {
    if (busy) return false
    setBusy(true)
    setError('')
    try {
      let existing: CreatedStudentPayload[] = []
      if (students.some((student) => student.athleteId)) {
        const response = await getAuthed('/api/coach/students')
        existing = (await response.json()).students || []
      }
      const saved: CreatedStudentPayload[] = []
      for (const student of students) {
        if (student.athleteId) {
          const found = existing.find((item) => item.athleteId === student.athleteId)
          if (found) saved.push(found)
        } else {
          const response = await postAuthed('/api/coach/students', {
            name: student.athleteName,
            email: student.athleteEmail || '',
            phone: student.athletePhone || '',
          })
          saved.push((await response.json()).student)
        }
      }
      for (const student of saved) onCreated(student)
      onClose()
      return true
    } catch (err) {
      reportInternalError('COACH_STUDENT_CREATE', err)
      setError(GENERIC_USER_ERROR)
      return false
    } finally {
      setBusy(false)
    }
  }
  return (
    <AgendaAddStudentModal
      standalone
      slotLabel=""
      busy={busy}
      submitError={error}
      onClose={onClose}
      onSubmit={submit}
    />
  )
}
