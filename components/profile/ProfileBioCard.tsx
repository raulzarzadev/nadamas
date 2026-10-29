'use client'

import SaveButton from '@comps/SaveButton'
import type { ComponentProps } from 'react'

/** Shared look for "Bio del atleta" / "Bio del entrenador"; the caller owns saving. */
export default function ProfileBioCard({
  id,
  title,
  value,
  onChange,
  maxLength,
  placeholder,
  status,
  onSaveNow,
}: {
  id: string
  title: string
  value: string
  onChange: (value: string) => void
  maxLength: number
  placeholder: string
  status: ComponentProps<typeof SaveButton>['status']
  onSaveNow: () => void
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 bg-white px-4 py-5 sm:rounded-[var(--r-md)] sm:border sm:border-[var(--c-border)] sm:p-6 sm:shadow-[var(--shadow-sm)]"
    >
      <h2 id={id} className="text-lg font-bold">
        {title}
      </h2>
      <textarea
        aria-labelledby={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={maxLength}
        className="rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white px-3 py-2 text-sm text-[var(--c-ocean)] outline-none transition focus:border-[var(--c-aqua)] focus:ring-4 focus:ring-[rgba(0,180,216,0.16)]"
      />
      <p className="-mt-1 text-right text-xs text-(--c-text-2)">
        {value.length}/{maxLength}
      </p>
      <SaveButton status={status} onClick={onSaveNow} idleLabel="Guardado" savedLabel="Guardado" />
    </section>
  )
}
