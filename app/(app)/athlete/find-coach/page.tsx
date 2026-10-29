import { redirect } from 'next/navigation'

export default async function LegacyFindCoachPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = await searchParams
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) for (const item of value) params.append(key, item)
    else if (value !== undefined) params.set(key, value)
  }
  redirect(`/athlete/schedule/find${params.size ? `?${params}` : ''}`)
}
