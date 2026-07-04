import CoachPublicProfile from '@comps/coach/CoachPublicProfile'
import WidgetFrameResizer from '@comps/widget/WidgetFrameResizer'
import type { CSSProperties } from 'react'
import { getPublicCoachDetail } from '@/lib/server/public-coach'

export const dynamic = 'force-dynamic'

function normalizeColor(value?: string) {
  if (!value) return null
  return /^#[0-9a-f]{6}$/i.test(value) ? value : null
}

export default async function CoachEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ color?: string }>
}) {
  const { id } = await params
  const query = searchParams ? await searchParams : {}
  const detail = await getPublicCoachDetail(id)
  const color = normalizeColor(query.color)

  if (!detail) {
    return (
      <WidgetFrameResizer>
        <main className="px-4 py-6">
          <div className="rounded-2xl border border-[var(--c-border)] bg-white p-4 text-sm font-semibold text-[var(--c-ocean)]">
            No encontramos horarios para este coach.
          </div>
        </main>
      </WidgetFrameResizer>
    )
  }

  return (
    <WidgetFrameResizer>
      <main
        className="mx-auto w-full max-w-3xl bg-white px-4 py-5"
        style={
          color
            ? ({
                '--c-aqua': color,
                '--c-aqua-strong': color,
              } as CSSProperties)
            : undefined
        }
      >
        <CoachPublicProfile
          coach={detail.coach}
          name={detail.name}
          bookedSlots={detail.bookedSlots}
          blockedSlots={detail.blockedSlots}
        />
      </main>
    </WidgetFrameResizer>
  )
}
