'use client'

import Link from 'next/link'
import { useState } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import AthleteSearch from './AthleteSearch'

type Pick = { id: string; name: string }

const clearClass =
  'absolute top-1/2 right-1.5 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-(--c-text-2) transition-colors hover:bg-(--c-surface) hover:text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)'

function ClearButton({
  href,
  onClick,
  label,
}: {
  href?: string
  onClick?: () => void
  label: string
}) {
  return href ? (
    <Link href={href} aria-label={label} title={label} className={clearClass}>
      <FiX aria-hidden="true" className="size-5" />
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={clearClass}>
      <FiX aria-hidden="true" className="size-5" />
    </button>
  )
}

// Search entry point inside athlete tabs (Horarios, Pagos): a search-field-looking
// trigger that opens the coach/school directory in a Sheet. Without callbacks,
// results open their schedule; with them, the host tab handles the pick.
export default function AthleteSearchBar({
  schoolId,
  onSelectCoach,
  onSelectSchool,
  actionLabel,
  value,
  initialTab,
  clearHref,
  onClear,
  defaultTab,
  open: controlledOpen,
  onOpenChange,
  hideTrigger,
}: {
  schoolId?: string
  onSelectCoach?: (coach: Pick) => void
  onSelectSchool?: (school: Pick) => void
  actionLabel?: string
  // Current pick to show in the bar (e.g. the coach whose plans are on screen).
  value?: string
  // Opens the sheet on mount on this tab (e.g. coming back from a schedule via "Cerrar").
  initialTab?: 'coaches' | 'schools'
  // With a value: an X inside the bar that clears the pick (link or callback).
  clearHref?: string
  onClear?: () => void
  // Preselects only this kind when the sheet opens, without opening it on mount.
  defaultTab?: 'coaches' | 'schools' | 'plans'
  // Optional controlled sheet, so the host page can open the search from elsewhere.
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // Keep only the sheet (opened via `open`) when the host shows its own search action.
  hideTrigger?: boolean
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(Boolean(initialTab))
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next)
    onOpenChange?.(next)
  }
  const tenant = useTenantSchool()
  const label =
    defaultTab === 'plans'
      ? 'Buscar entrenos'
      : tenant
        ? 'Buscar entrenador o entreno'
        : 'Buscar entrenador o escuela'
  const close = () => {
    setOpen(false)
    // Drop the one-shot ?search= that reopened the sheet so a reload doesn't reopen it.
    const url = new URL(window.location.href)
    if (url.searchParams.has('search')) {
      url.searchParams.delete('search')
      window.history.replaceState(null, '', url)
    }
  }
  return (
    <>
      <div className={hideTrigger ? 'hidden' : 'relative'}>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={value ? `${value}. ${label}` : undefined}
          onClick={() => setOpen(true)}
          className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-full border ${value && (clearHref || onClear) ? 'pr-14' : ''} border-(--c-border) bg-white px-4 text-left text-sm text-(--c-text-2) shadow-[0_1px_0_rgba(13,44,72,0.05)] transition-colors hover:border-(--c-aqua-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)`}
        >
          <FiSearch aria-hidden="true" className="size-5 shrink-0 text-(--c-ocean)" />
          <span className={`truncate ${value ? 'font-semibold text-(--c-ocean)' : ''}`}>
            {value || label}
          </span>
        </button>
        {value && (clearHref || onClear) && (
          <ClearButton href={clearHref} onClick={onClear} label={`Quitar ${value}`} />
        )}
      </div>
      <Sheet open={open} onClose={close} label={label} size="lg">
        <AthleteSearch
          schoolId={schoolId}
          syncUrl={false}
          initialTab={initialTab ?? defaultTab}
          actionLabel={actionLabel}
          onSelectCoach={
            onSelectCoach &&
            ((coach) => {
              close()
              onSelectCoach(coach)
            })
          }
          onSelectSchool={
            onSelectSchool &&
            ((school) => {
              close()
              onSelectSchool(school)
            })
          }
        />
      </Sheet>
    </>
  )
}
