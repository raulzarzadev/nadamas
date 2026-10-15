import { NextResponse } from 'next/server'
import type { Booking } from '@/lib/coach-booking'
import { studentProgressId } from '@/lib/coach-student-progress'
import { type SchoolStudent, schoolMembershipHasRole } from '@/lib/school'
import { studentSchoolBookings } from '@/lib/school-student-history'
import { createProfileInvitation } from '@/lib/server/athlete-profile-invitations'
import { sendAthleteProfileInvitationEmail } from '@/lib/server/emails'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { requirePersonalCoach } from '@/lib/server/personal-class-access'
import { requireSchoolAccess } from '@/lib/server/school-access'

export const runtime = 'nodejs'
export async function POST(request: Request) {
  let pending: Awaited<ReturnType<typeof createProfileInvitation>> | undefined
  try {
    const body = await request.json()
    const studentId = typeof body.studentId === 'string' ? body.studentId : ''
    const schoolId = typeof body.schoolId === 'string' ? body.schoolId : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (
      !studentId ||
      studentId.includes('/') ||
      studentId.length > 128 ||
      schoolId.includes('/') ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 160
    )
      return NextResponse.json({ error: 'Revisa el correo del atleta.' }, { status: 400 })
    let coachId: string
    let profile: { name: string; phone: string; birthDate: string; gender: string }
    if (schoolId) {
      const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher'])
      if (access.response) return access.response
      coachId = access.caller.uid
      const student = await adminDb.collection('schoolStudents').doc(studentId).get()
      const data = student.data()
      if (!data || data.schoolId !== schoolId || data.additionalProfileId)
        return NextResponse.json(
          { error: 'Este registro no puede vincularse a una cuenta personal.' },
          { status: 400 }
        )
      if (!access.globalAdmin && !schoolMembershipHasRole(access.membership, 'director')) {
        const [classes, bookings] = await Promise.all([
          adminDb.collection('schoolClassOccurrences').where('schoolId', '==', schoolId).get(),
          adminDb.collection('bookings').where('coachId', '==', coachId).get(),
        ])
        const hasAgendaStudent = studentSchoolBookings(
          bookings.docs.map((doc) => doc.data() as Booking),
          { ...data, id: studentId } as SchoolStudent,
          coachId
        ).some((booking) => booking.status !== 'cancelled')
        if (
          data.createdBy !== coachId &&
          !hasAgendaStudent &&
          !classes.docs.some(
            (doc) =>
              doc.data().teacherIds?.includes(coachId) && doc.data().studentIds?.includes(studentId)
          )
        )
          return NextResponse.json({ error: 'No tienes acceso a este atleta.' }, { status: 403 })
      }
      profile = {
        name: data.name || '',
        phone: data.phone || '',
        birthDate: data.birthDate || '',
        gender: data.gender || 'otro',
      }
      await student.ref.update({ studentEmail: email, updatedAt: Date.now() })
    } else {
      const access = await requirePersonalCoach(request)
      if (access.response) return access.response
      coachId = access.uid
      const progress = await adminDb
        .collection('coachStudentProgress')
        .doc(studentProgressId(coachId, studentId))
        .get()
      let data = progress.data()
      if (!data) {
        const bookings = await adminDb.collection('bookings').where('coachId', '==', coachId).get()
        const booking = bookings.docs
          .find(
            (doc) =>
              doc.data().athleteId === studentId &&
              !doc.data().schoolId &&
              doc.data().status !== 'cancelled'
          )
          ?.data()
        if (booking) {
          data = {
            id: progress.id,
            coachId,
            athleteId: studentId,
            athleteName: booking.athleteName || '',
            athleteEmail: booking.athleteEmail || '',
            athletePhone: booking.athletePhone || '',
            level: 1,
            coachAssessment: 1,
            lastNote: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          await progress.ref.set(data)
        }
      }
      if (!studentId.startsWith('manual_') && !studentId.startsWith('manual:')) {
        const account = await adminAuth.getUser(studentId)
        if (account.email?.toLowerCase() !== email)
          return NextResponse.json(
            { error: 'Este atleta ya está ligado a una cuenta con otro correo.' },
            { status: 409 }
          )
      }
      if (!data)
        return NextResponse.json(
          { error: 'Guarda los datos del atleta antes de verificar su correo.' },
          { status: 400 }
        )
      profile = {
        name: data.athleteName || '',
        phone: data.athletePhone || '',
        birthDate: data.birthDate || '',
        gender: data.gender || 'otro',
      }
      await progress.ref.update({ athleteEmail: email, updatedAt: Date.now() })
    }
    pending = await createProfileInvitation({ coachId, studentId, schoolId, email, profile })
    const origin = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nadamas.app').replace(/\/$/, '')
    const sent = await sendAthleteProfileInvitationEmail({
      email,
      name: profile.name,
      inviteUrl: `${origin}/athlete/profile-invitations/${pending.token}`,
    })
    if (sent?.skipped) throw new Error('EMAIL_UNAVAILABLE')
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (pending) await pending.ref.update({ status: 'failed' }).catch(() => {})
    console.error('[ATHLETE_PROFILE_INVITATION_SEND]', error)
    return NextResponse.json(
      { error: 'No pudimos enviar la invitación. Espera un momento e inténtalo de nuevo.' },
      { status: 400 }
    )
  }
}
