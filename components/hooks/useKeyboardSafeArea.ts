'use client'

import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'

type KeyboardViewport = { height: number; offsetTop: number }

export function useKeyboardSafeArea(enabled = true) {
  const [viewport, setViewport] = useState<KeyboardViewport | null>(null)

  useEffect(() => {
    if (!enabled) return
    const viewport = window.visualViewport
    if (!viewport) return

    const update = () => {
      const height = Math.round(viewport.height)
      const offsetTop = Math.round(viewport.offsetTop)
      setViewport((current) =>
        current?.height === height && current.offsetTop === offsetTop
          ? current
          : { height, offsetTop }
      )
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    window.addEventListener('orientationchange', update)

    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [enabled])

  return viewport
}

export function modalViewportStyle(viewport: KeyboardViewport | null): CSSProperties | undefined {
  return viewport
    ? ({
        top: viewport.offsetTop,
        bottom: 'auto',
        height: viewport.height,
        '--sheet-viewport-height': `${viewport.height}px`,
      } as CSSProperties)
    : undefined
}

export function keepFocusedFieldVisible(dialog: HTMLElement) {
  const active = document.activeElement
  if (
    !(active instanceof HTMLElement) ||
    !active.matches('input, textarea, select, [contenteditable="true"]') ||
    !dialog.contains(active)
  ) {
    return
  }

  for (
    let container = active.parentElement;
    container && container !== dialog;
    container = container.parentElement
  ) {
    if (container.scrollHeight <= container.clientHeight) continue
    if (!/auto|scroll/.test(getComputedStyle(container).overflowY)) continue
    const field = active.getBoundingClientRect()
    const visible = container.getBoundingClientRect()
    const margin = 16
    if (field.top < visible.top + margin) {
      container.scrollTop += field.top - visible.top - margin
    } else if (field.bottom > visible.bottom - margin) {
      container.scrollTop += field.bottom - visible.bottom + margin
    }

    const adjustedField = active.getBoundingClientRect()
    const adjustedVisible = container.getBoundingClientRect()
    if (
      adjustedField.top >= adjustedVisible.top + margin &&
      adjustedField.bottom <= adjustedVisible.bottom - margin
    ) {
      break
    }
  }
}
