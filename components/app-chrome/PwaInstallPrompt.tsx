'use client'

import { useEffect, useState } from 'react'
import { FiDownload, FiPlusSquare, FiShare, FiX } from 'react-icons/fi'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISSED_KEY = 'nadamas:pwa-install-dismissed'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function isIosDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if (isStandalone() || !isMobileDevice() || localStorage.getItem(DISMISSED_KEY) === '1') return

    if (isIosDevice()) {
      setShowIosGuide(true)
      setHidden(false)
      return
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setHidden(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  if (hidden || (!installEvent && !showIosGuide)) return null

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setHidden(true)
  }

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    setInstallEvent(null)
    if (choice.outcome === 'accepted') setHidden(true)
  }

  return (
    <aside className="mx-auto mt-3 max-w-5xl px-3 sm:px-4">
      <div className="flex items-start gap-3 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white p-3 text-[var(--c-ocean)] shadow-[var(--shadow-sm)]">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--c-aqua-light)] text-[var(--c-ocean)]">
          <FiDownload aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Instala Nadamas</p>
          {showIosGuide ? (
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--c-text-2)]">
              <span>Toca</span>
              <FiShare aria-hidden="true" className="h-3.5 w-3.5 text-[var(--c-ocean)]" />
              <span>y luego</span>
              <FiPlusSquare aria-hidden="true" className="h-3.5 w-3.5 text-[var(--c-ocean)]" />
              <span>Agregar a inicio.</span>
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-[var(--c-text-2)]">
              Accede más rápido y recibe avisos como app.
            </p>
          )}
        </div>
        {installEvent && (
          <button
            type="button"
            onClick={() => void install()}
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--c-ocean)] px-3 text-xs font-bold text-white"
          >
            Instalar
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Ocultar instalación"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--c-text-2)] transition hover:bg-[var(--c-surface)] hover:text-[var(--c-ocean)]"
        >
          <FiX aria-hidden="true" />
        </button>
      </div>
    </aside>
  )
}
