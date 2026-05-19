import Link from 'next/link'
import type { ReactNode } from 'react'
import type { CoachClassOffering } from '@/firebase/coaches/coach.model'
import {
  offeringContextLabel,
  offeringIcon,
  offeringPrice,
  offeringScheduleSummary,
  offeringTypeLabel,
  offeringWhen,
  resolveOfferingSchedules,
  scheduleIsOpen,
} from '@/lib/coach-offerings'

export default function OfferingSummaryCard({
  offering,
  actions,
  children,
  className = '',
  selected = false,
  onSelect,
  href,
  showImage = false,
  showLocationLink = false,
  showDetails = false,
  openDescription,
}: {
  offering: CoachClassOffering
  actions?: ReactNode
  children?: ReactNode
  className?: string
  selected?: boolean
  onSelect?: () => void
  href?: string
  showImage?: boolean
  showLocationLink?: boolean
  showDetails?: boolean
  openDescription?: string
}) {
  const hasOpenSchedule = resolveOfferingSchedules(offering).some(scheduleIsOpen)
  const cardClassName = `block rounded-[var(--r-md)] border bg-white p-4 transition ${
    selected
      ? 'border-[var(--c-aqua)] shadow-[0_0_0_3px_rgba(0,180,216,0.14)]'
      : 'border-[var(--c-border)]'
  } ${onSelect || href ? 'cursor-pointer hover:border-[var(--c-aqua)]' : ''} ${className}`

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight text-[var(--c-ocean)]">
            {offeringIcon(offering)} {offeringTypeLabel(offering)}
          </p>
          <p className="mt-2 text-base font-semibold leading-tight text-[var(--c-ocean)]">
            {offeringContextLabel(offering)}
          </p>
          <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-[var(--c-text-2)]">
            {offeringScheduleSummary(offering)}
          </p>
        </div>

        <p className="shrink-0 text-right text-lg font-extrabold leading-tight text-[var(--c-ocean)]">
          {offeringPrice(offering)}
        </p>
      </div>

      {children ||
        (hasOpenSchedule ? (
          openDescription && (
            <p className="mt-2 text-sm text-[var(--c-text-2)]">{openDescription}</p>
          )
        ) : (
          <p className="mt-2 text-sm text-[var(--c-text-2)]">{offeringWhen(offering)}</p>
        ))}

      {showImage && offering.imageUrl && (
        <img
          src={offering.imageUrl}
          alt={offering.placeName || 'Lugar de clases'}
          className="mt-3 h-24 w-full rounded-[var(--r-sm)] object-cover"
        />
      )}

      {showLocationLink && offering.locationUrl && (
        <a
          href={offering.locationUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm font-semibold text-[var(--c-aqua-strong)] underline"
        >
          Ver ubicación
        </a>
      )}

      {showDetails && offering.details && (
        <p className="mt-3 text-sm text-[var(--c-text-2)]">{offering.details}</p>
      )}

      {actions && <div className="mt-3 flex gap-1">{actions}</div>}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={cardClassName}>
        {content}
      </Link>
    )
  }

  return (
    <article
      className={cardClassName}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!onSelect) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      {content}
    </article>
  )
}
