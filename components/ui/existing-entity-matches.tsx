'use client'

import type { ReactNode } from 'react'

/** Shared duplicate suggestions for creation forms. Data and permissions belong to the caller. */
export default function ExistingEntityMatches<T>({
  items,
  getKey,
  renderItem,
  onSelect,
  title,
  loading = false,
  loadingMessage = 'Buscando coincidencias…',
  error,
  exactMatchMessage,
  disabled = false,
  limit = 5,
}: {
  items: readonly T[]
  getKey: (item: T) => string
  renderItem: (item: T, action: ReactNode) => ReactNode
  onSelect: (item: T) => void
  title: string
  loading?: boolean
  loadingMessage?: string
  error?: string
  exactMatchMessage?: string
  disabled?: boolean
  limit?: number
}) {
  return (
    <div aria-live="polite" className="grid gap-2">
      {loading && <p className="text-sm text-(--c-text-2)">{loadingMessage}</p>}
      {error && <p className="text-sm text-(--c-error,#b91c1c)">{error}</p>}
      {!loading && !error && items.length > 0 && (
        <>
          <p className="text-sm font-semibold text-(--c-ocean)">{title}</p>
          <p className="text-xs text-(--c-text-2)">
            Revisa las coincidencias antes de crear otro registro.
          </p>
          {items.slice(0, limit).map((item) => (
            <div key={getKey(item)}>
              {renderItem(
                item,
                <button
                  type="button"
                  disabled={disabled}
                  className="btn btn-outline btn-sm"
                  onClick={() => onSelect(item)}
                >
                  Usar existente
                </button>
              )}
            </div>
          ))}
          {exactMatchMessage && <p className="text-sm text-(--c-text-2)">{exactMatchMessage}</p>}
        </>
      )}
    </div>
  )
}
