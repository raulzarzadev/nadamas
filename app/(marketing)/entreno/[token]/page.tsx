import { createHash } from 'node:crypto'
import type { DocumentData } from 'firebase-admin/firestore'
import { notFound } from 'next/navigation'
import SharedSessionView from '@/components/coach/SharedSessionView'
import { normalizeClassTraining } from '@/lib/class-training'
import { adminDb } from '@/lib/server/firebase-admin'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Entreno compartido', robots: { index: false, follow: false } }
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  let data: DocumentData | undefined
  if (/^[\w-]{43}$/.test(token)) {
    const hash = createHash('sha256').update(token).digest('hex')
    data = (await adminDb.collection('sharedTrainingSessions').doc(hash).get()).data()
  } else if (/^[\w-]{1,128}$/.test(token)) {
    data = (await adminDb.collection('athleteTrainingSessions').doc(token).get()).data()
    if (data?.visibility !== 'public') notFound()
  } else {
    notFound()
  }
  if (!data) notFound()
  const blocks = normalizeClassTraining(data.training) || []
  return (
    <main className="mx-auto grid max-w-2xl gap-4 px-4 py-8">
      <h1 className="text-2xl font-extrabold">
        {typeof data.title === 'string' ? data.title : 'Entrenamiento'}
      </h1>
      {typeof data.description === 'string' && data.description && (
        <p className="whitespace-pre-wrap text-sm text-(--c-text-2)">{data.description}</p>
      )}
      <SharedSessionView blocks={blocks} />
    </main>
  )
}
