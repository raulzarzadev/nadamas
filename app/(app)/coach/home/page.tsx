import CoachHomeDashboard from '@comps/coach/CoachHomeDashboard'
import { redirect } from 'next/navigation'
import { getTenantSchool } from '@/lib/server/tenant-school'

export default async function CoachHome() {
  if (await getTenantSchool()) redirect('/coach/agenda')
  return <CoachHomeDashboard />
}
