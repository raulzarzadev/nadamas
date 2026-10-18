'use client'

import { useEffect, useState } from 'react'

// Background loop layered over the hero poster. Mounted only after hydration and
// skipped for reduced-motion or data-saver visitors, so the poster stays the LCP.
export default function HeroVideo() {
  const [enabled, setEnabled] = useState(false)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData
    if (!reducedMotion && !saveData) setEnabled(true)
  }, [])

  if (!enabled) return null

  return (
    <video
      aria-hidden="true"
      tabIndex={-1}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster="/images/landing/hero-poster.webp"
      onPlaying={() => setPlaying(true)}
      className="absolute inset-0 size-full object-cover transition-opacity duration-700"
      style={{ opacity: playing ? 1 : 0 }}
    >
      <source src="/videos/landing-hero.mp4" type="video/mp4" />
    </video>
  )
}
