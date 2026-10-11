'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import ClassDetailsSection from '@/components/coach/ClassDetailsSection'
import Loading from '@/components/Loading'
import { useUser } from '@/context/UserContext'

function ClassDetails() {
  const params = useSearchParams()
  const { user } = useUser()
  const coachId = params.get('coachId') || ''
  const date = params.get('date') || ''
  const time = params.get('time') || ''
  const groupType = params.get('type') === 'grupal' ? 'grupal' : 'particular'
  if (!user) return <Loading />
  if (
    coachId !== (user.uid || user.id) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}$/.test(time)
  )
    return <p>Esta clase no está disponible.</p>
  return (
    <div className="grid gap-4">
      <Link href="/coach/agenda" className="inline-flex min-h-11 items-center font-bold underline">
        ← Volver a horarios
      </Link>
      <h1 className="text-xl font-bold">
        Clase · {date} · {time}
      </h1>
      <ClassDetailsSection slots={[{ coachId, date, startTime: time, groupType }]} canManage />
    </div>
  )
}
export default function CoachClassDetailsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ClassDetails />
    </Suspense>
  )
}
