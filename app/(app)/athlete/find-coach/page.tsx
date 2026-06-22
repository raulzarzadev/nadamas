import CoachDirectoryList from '@comps/coach/CoachDirectoryList'

export default function FindCoachPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold text-[var(--c-ocean)]">Buscar coach</h1>
      <CoachDirectoryList coachHrefBase="/athlete/coach" />
    </div>
  )
}
