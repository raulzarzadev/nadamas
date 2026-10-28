import type { CSSProperties, ReactNode } from 'react'
import { schoolThemeVars, type ThemePalette } from '@/lib/school-theme'

/** Themed full-height page frame shared by the school home and its sub-pages. */
export default function SchoolPageShell({
  palette,
  children,
}: {
  palette: ThemePalette
  children: ReactNode
}) {
  return (
    <div
      style={schoolThemeVars(palette) as CSSProperties}
      className="min-h-screen bg-(--school-surface)"
    >
      <div className="mx-auto max-w-7xl px-0 pb-8 pt-0 sm:px-8 sm:pb-16 sm:pt-10">{children}</div>
    </div>
  )
}
