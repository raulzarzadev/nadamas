import { ImageResponse } from 'next/og'
import { coachDisplayPhoto } from '@/lib/coach-photo'
import { getPublicAthleteDetail } from '@/lib/server/public-athlete'
import { getPublicCoachDetail } from '@/lib/server/public-coach'
import { resolveSlug } from '@/lib/server/slugs'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Perfil en nadamas.app'

const OCEAN = '#0A2540'
const AQUA = '#0EA5C4'

// Fetch the profile photo and inline it as a data URI so the OG renderer never
// depends on the remote host being reachable at render time.
async function toDataUri(url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const type = res.headers.get('content-type') || 'image/jpeg'
    const base64 = Buffer.from(await res.arrayBuffer()).toString('base64')
    return `data:${type};base64,${base64}`
  } catch {
    return null
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '🏊'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const target = await resolveSlug(id)

  let name = 'nadamas.app'
  let subtitle = 'Coach de natación'
  let photo: string | null = null

  if (target?.kind === 'coach') {
    const detail = await getPublicCoachDetail(target.uid)
    if (detail) {
      name = detail.name
      subtitle = 'Coach de natación'
      photo = coachDisplayPhoto(detail.coach)
    }
  } else if (target?.kind === 'athlete') {
    const detail = await getPublicAthleteDetail(target.uid)
    if (detail) {
      name = detail.name
      subtitle = 'Nadador'
      photo = detail.photoURL
    }
  }

  const photoData = await toDataUri(photo)

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 56,
        padding: '0 96px',
        background: `linear-gradient(135deg, ${AQUA} 0%, ${OCEAN} 100%)`,
        color: 'white',
        fontFamily: 'sans-serif',
      }}
    >
      {photoData ? (
        // biome-ignore lint/performance/noImgElement: ImageResponse only supports <img>
        <img
          src={photoData}
          width={300}
          height={300}
          alt=""
          style={{
            width: 300,
            height: 300,
            borderRadius: 32,
            objectFit: 'cover',
            border: '6px solid rgba(255,255,255,0.85)',
          }}
        />
      ) : (
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.18)',
            fontSize: 120,
            fontWeight: 800,
          }}
        >
          {initials(name)}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontSize: 30, fontWeight: 700, opacity: 0.85, letterSpacing: 2 }}>
          nadamas.app
        </div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, marginTop: 12 }}>{name}</div>
        <div style={{ fontSize: 40, fontWeight: 600, opacity: 0.92, marginTop: 16 }}>
          {subtitle}
        </div>
        <div style={{ fontSize: 30, fontWeight: 500, opacity: 0.8, marginTop: 28 }}>
          Reserva tus clases de natación
        </div>
      </div>
    </div>,
    size
  )
}
