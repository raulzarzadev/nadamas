import { SCHOOL_PALETTES } from '@/lib/school'
import { getTenantSchool } from '@/lib/server/tenant-school'

export async function GET() {
  const school = await getTenantSchool()
  if (!school) return Response.redirect('https://nadamas.app/manifest.json')
  const palette =
    SCHOOL_PALETTES.find((item) => item.value === school.palette) || SCHOOL_PALETTES[0]
  return Response.json(
    {
      id: '/',
      name: school.name,
      short_name: school.name,
      description: school.description,
      lang: 'es-MX',
      display: 'standalone',
      scope: '/',
      start_url: '/',
      theme_color: palette.primary,
      background_color: palette.surface,
      icons: [{ src: school.logoUrl || '/tenant-icon', sizes: 'any', purpose: 'any' }],
    },
    {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'Content-Type': 'application/manifest+json',
      },
    }
  )
}
