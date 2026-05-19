'use client'
import { useEffect, useState } from 'react'
import { FiChevronDown } from 'react-icons/fi'

export default function ProfileSection({
  title,
  description,
  summary,
  headerAside,
  children,
  surface = 'white',
  allowOverflow = false,
  id,
}: {
  title: string
  description: string
  summary: React.ReactNode
  headerAside?: React.ReactNode
  children: React.ReactNode
  surface?: 'white' | 'tinted'
  allowOverflow?: boolean
  id?: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!id) return

    function openFromHash() {
      if (window.location.hash === `#${id}`) setIsOpen(true)
    }

    openFromHash()
    window.addEventListener('hashchange', openFromHash)
    return () => window.removeEventListener('hashchange', openFromHash)
  }, [id])

  return (
    <section
      id={id}
      className={`${allowOverflow ? 'overflow-visible' : 'overflow-hidden'} rounded-[var(--r-md)] border border-[var(--c-border)] shadow-[var(--shadow-sm)] ${
        surface === 'tinted' ? 'bg-[var(--c-surface)]' : 'bg-white'
      }`}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={`relative flex w-full items-start justify-between gap-3 p-4 text-left transition-colors sm:p-6 ${
          isOpen ? 'border-b border-[var(--c-border)]' : ''
        } ${
          surface === 'white'
            ? 'bg-[linear-gradient(135deg,rgba(0,119,182,0.1),rgba(144,224,239,0.18))]'
            : ''
        } rounded-[calc(var(--r-md)-1px)] ${isOpen ? 'rounded-b-none' : ''}`}
      >
        <div className={headerAside ? 'pr-28 sm:pr-40' : ''}>
          <h2 className="text-lg font-bold text-[var(--c-ocean-mid)] sm:text-xl">{title}</h2>
          {isOpen ? (
            <p className="mt-1 text-sm leading-6 text-[var(--c-text-2)]">{description}</p>
          ) : (
            <p className="mt-1 text-sm text-[var(--c-text-2)]">{summary}</p>
          )}
        </div>
        {headerAside}
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
