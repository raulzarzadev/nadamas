'use client'
import { useState } from 'react'
import { FiChevronDown } from 'react-icons/fi'

export default function ProfileSection({
  title,
  description,
  summary,
  children,
  surface = 'white',
}: {
  title: string
  description: string
  summary: string
  children: React.ReactNode
  surface?: 'white' | 'tinted'
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <section
      className={`overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)] shadow-[var(--shadow-sm)] ${
        surface === 'tinted' ? 'bg-[var(--c-surface)]' : 'bg-white'
      }`}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={`flex w-full items-start justify-between gap-3 border-b border-[var(--c-border)] p-4 text-left sm:p-6 ${
          surface === 'white'
            ? 'bg-[linear-gradient(135deg,rgba(0,119,182,0.1),rgba(144,224,239,0.18))]'
            : ''
        }`}
      >
        <div>
          <h2 className="text-lg font-bold text-[var(--c-ocean-mid)] sm:text-xl">
            {title}
          </h2>
          {isOpen ? (
            <p className="mt-1 text-sm leading-6 text-[var(--c-text-2)]">
              {description}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[var(--c-text-2)]">{summary}</p>
          )}
        </div>
        <FiChevronDown
          aria-hidden="true"
          className={`mt-1 shrink-0 text-[var(--c-ocean-mid)] transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && <div className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-6">{children}</div>}
    </section>
  )
}
