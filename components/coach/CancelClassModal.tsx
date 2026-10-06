'use client'

import { useState } from 'react'
import Sheet from '@/components/ui/sheet'

export default function CancelClassModal({
  participants,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  participants: Array<{ id: string; name: string }>
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: (ids: string[]) => void
}) {
  const [selected, setSelected] = useState(
    () => new Set(participants.map((participant) => participant.id))
  )
  const all = participants.every((participant) => selected.has(participant.id))
  const ids = participants
    .filter((participant) => selected.has(participant.id))
    .map((participant) => participant.id)
  return (
    <Sheet
      open
      label="Cancelar clase"
      onClose={onClose}
      closeDisabled={busy}
      keyboardAware
      fullBleedMobile
      showFooterClose={false}
      footer={
        <div className="border-t border-[var(--c-border)] px-4 pt-3 sm:px-0">
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              disabled={busy || (participants.length > 0 && ids.length === 0)}
              onClick={() => onSubmit(ids)}
              className="min-h-12 rounded-full bg-rose-600 px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy
                ? 'Guardando…'
                : all
                  ? 'Cancelar clase y retirar a todos'
                  : `Retirar seleccionados (${ids.length})`}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="min-h-11 rounded-full px-4 font-semibold text-[var(--c-text-2)] disabled:opacity-50"
            >
              Volver
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-0">
        <h3 className="text-xl font-bold text-[var(--c-ocean)]">Cancelar clase</h3>
        <p className="text-sm text-[var(--c-text-2)]">
          Selecciona a quienes quieres retirar. Si seleccionas a todos, se cancelará la clase. Si
          eliges solo algunos, la clase continuará con los demás. Los atletas seguirán guardados en
          tu lista.
        </p>
        {error && (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        )}
        {participants.length > 0 ? (
          <>
            <label className="flex min-h-12 items-center gap-3 font-semibold text-[var(--c-ocean)]">
              <input
                type="checkbox"
                checked={all}
                disabled={busy}
                onChange={(event) =>
                  setSelected(
                    event.target.checked
                      ? new Set(participants.map((participant) => participant.id))
                      : new Set()
                  )
                }
                className="h-5 w-5 accent-[var(--c-aqua-strong)]"
              />
              Seleccionar todos
            </label>
            <fieldset className="flex flex-col rounded-xl border border-[var(--c-border)]">
              <legend className="sr-only">Participantes de la clase</legend>
              {participants.map((participant) => (
                <label
                  key={participant.id}
                  className="flex min-h-12 items-center gap-3 border-b border-[var(--c-border)] px-3 py-2 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(participant.id)}
                    disabled={busy}
                    onChange={() =>
                      setSelected((current) => {
                        const next = new Set(current)
                        if (next.has(participant.id)) next.delete(participant.id)
                        else next.add(participant.id)
                        return next
                      })
                    }
                    className="h-5 w-5 accent-[var(--c-aqua-strong)]"
                  />
                  {participant.name}
                </label>
              ))}
            </fieldset>
          </>
        ) : (
          <p className="text-sm text-[var(--c-text-2)]">Esta clase no tiene participantes.</p>
        )}
      </div>
    </Sheet>
  )
}
