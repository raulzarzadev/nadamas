'use client'

export default function HttpsUrlInput({
  id,
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = 'ejemplo.com/perfil',
}: {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  placeholder?: string
}) {
  function update(next: string) {
    const suffix = next.trim().replace(/^https?:\/\//i, '')
    onChange(suffix ? `https://${suffix}` : '')
  }
  return (
    <div
      className={`flex min-h-11 min-w-0 items-center gap-2 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal text-(--c-ocean) focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--c-ocean) ${disabled ? 'opacity-50' : ''}`}
    >
      <span id={`${id}-prefix`} className="shrink-0 text-sm text-(--c-text-2)">
        https://
      </span>
      <input
        id={id}
        type="text"
        inputMode="url"
        autoComplete="url"
        autoCapitalize="none"
        spellCheck={false}
        required={required}
        disabled={disabled}
        maxLength={992}
        aria-describedby={`${id}-prefix`}
        className="min-h-11 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-normal outline-none"
        value={value.replace(/^https?:\/\//i, '')}
        placeholder={placeholder}
        onChange={(event) => update(event.target.value)}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData('text').trim()
          if (/^https?:\/\//i.test(pasted)) {
            event.preventDefault()
            update(pasted)
          }
        }}
      />
    </div>
  )
}
