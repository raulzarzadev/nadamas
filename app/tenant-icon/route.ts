import { SCHOOL_PALETTES } from '@/lib/school'
import { getTenantSchool } from '@/lib/server/tenant-school'

export async function GET() {
  const school = await getTenantSchool()
  if (!school) return Response.redirect('https://nadamas.app/icons/icon_x192.png')
  if (school.logoUrl) return Response.redirect(school.logoUrl)
  const color =
    SCHOOL_PALETTES.find((palette) => palette.value === school.palette)?.primary || '#062b49'
  const initial = school.name
    .charAt(0)
    .toUpperCase()
    .replace(/[<>&"']/g, '')
  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="32" fill="${color}"/><text x="96" y="132" text-anchor="middle" font-family="sans-serif" font-size="116" fill="white">${initial}</text></svg>`,
    { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, max-age=300' } }
  )
}
