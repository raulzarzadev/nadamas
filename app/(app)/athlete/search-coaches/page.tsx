import CoachDirectoryList from '@/components/coach/CoachDirectoryList'
import { getTenantSchool } from '@/lib/server/tenant-school'

export default async function SearchCoachesPage() {
  const school = await getTenantSchool()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-(--c-ocean)">Buscar coaches</h1>
        <p className="mt-1 text-sm text-(--c-text-2)">
          {school
            ? `Encuentra un coach de ${school.name} y consulta sus horarios.`
            : 'Encuentra un coach y consulta su perfil y horarios.'}
        </p>
      </div>
      <CoachDirectoryList schoolId={school?.id} coachHrefBase="/athlete/coach" />
    </div>
  )
}
