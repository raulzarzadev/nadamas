import CopyLinkButton from '@comps/coach/CopyLinkButton'
import Avatar from '@comps/ui/avatar'
import type { PublicAthleteDetail } from '@/lib/server/public-athlete'

export default function AthletePublicProfile({ athlete }: { athlete: PublicAthleteDetail }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <Avatar name={athlete.name} src={athlete.photoURL} size={112} />
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-extrabold text-[var(--c-ocean)]">{athlete.name}</h1>
        <span className="rounded-full bg-[var(--c-surface)] px-3 py-1 text-xs font-bold text-[var(--c-text-2)]">
          Nadador · nadamas
        </span>
      </div>
      {athlete.bio && (
        <p className="max-w-prose text-pretty text-[var(--c-text-2)]">{athlete.bio}</p>
      )}
      <CopyLinkButton label="Compartir perfil" />
    </div>
  )
}
