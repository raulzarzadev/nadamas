import Link from 'next/link'
import type { IconType } from 'react-icons'
import { FiArrowRight } from 'react-icons/fi'

type HomeActionLinkProps = {
  title: string
  description?: string
  icon: IconType
  featured?: boolean
} & (
  | { href: string; onClick?: never; expanded?: never; controls?: never }
  | { href?: never; onClick: () => void; expanded: boolean; controls: string }
)

export default function HomeActionLink({
  href,
  title,
  description,
  icon: Icon,
  featured = false,
  onClick,
  expanded,
  controls,
}: HomeActionLinkProps) {
  const className = `flex min-h-14 w-full min-w-0 items-center gap-3 rounded-xl border px-4 py-3 text-left font-bold text-(--c-ocean) transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${
    featured
      ? 'border-[var(--c-aqua)] bg-[var(--c-aqua-light)] shadow-[var(--shadow-sm)] hover:brightness-95'
      : 'border-(--c-border) bg-white hover:bg-(--c-surface)'
  }`
  const content = (
    <>
      <Icon aria-hidden="true" className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block">{title}</span>
        {description && (
          <span className="mt-0.5 block text-xs font-normal text-(--c-text-2)">{description}</span>
        )}
      </span>
      <FiArrowRight aria-hidden="true" className="shrink-0" />
    </>
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      className={className}
    >
      {content}
    </button>
  )
}
