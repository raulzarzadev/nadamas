'use client'

import { useState } from 'react'
import { FiCheck, FiShare2 } from 'react-icons/fi'

/** Copies the current page URL (the public coach link) to the clipboard. */
export default function CopyLinkButton({
  label = 'Compartir',
  className = '',
}: {
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  const copy = async () => {
    setFailed(false)
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setFailed(true)
      setTimeout(() => setFailed(false), 3000)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copiar enlace para compartir"
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--c-border)] bg-white px-3.5 py-2 text-sm font-bold text-[var(--c-ocean)] transition-colors hover:border-[var(--c-aqua)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] ${className}`}
    >
      {copied ? (
        <>
          <FiCheck aria-hidden="true" /> Copiado
        </>
      ) : failed ? (
        'No se pudo copiar'
      ) : (
        <>
          <FiShare2 aria-hidden="true" /> {label}
        </>
      )}
    </button>
  )
}
