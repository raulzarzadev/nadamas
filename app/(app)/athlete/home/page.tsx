import AthleteHomeDashboard from '@comps/athlete/AthleteHomeDashboard'
import { redirect } from 'next/navigation'
import { getTenantSchool } from '@/lib/server/tenant-school'

export default async function AthleteHome() {
  if (await getTenantSchool()) redirect('/athlete/bookings')
  return <AthleteHomeDashboard />
}
