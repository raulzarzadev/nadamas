'use client'
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
} from 'react'

interface RichTextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  helperText?: string
  error?: string
  maxLength?: number
  value?: string
}

const RichTextArea = forwardRef<HTMLTextAreaElement, RichTextAreaProps>(
  function RichTextArea(
    { label, helperText, error, maxLength, value = '', className = '', ...props },
    ref
  ) {
    const id = useId()
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const count = typeof value === 'string' ? value.length : 0

    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement)

    useEffect(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.style.height = '0px'
      textarea.style.height = `${textarea.scrollHeight}px`
    }, [value])

    return (
      <label htmlFor={id} className="block">
        <div
          className={`group rounded-[var(--r-md)] border bg-white p-4 shadow-[var(--shadow-sm)] transition focus-within:border-[var(--c-ocean-mid)] focus-within:ring-4 focus-within:ring-[rgba(0,119,182,0.12)] ${
            error ? 'border-[var(--c-error,#b91c1c)]' : 'border-[var(--c-border)]'
          }`}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[var(--c-ocean)]">
              {label}
            </span>
            {maxLength !== undefined && (
              <span className="rounded-full bg-[var(--c-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--c-text-2)]">
                {count}/{maxLength}
              </span>
            )}
          </div>

          <textarea
            ref={textareaRef}
            id={id}
            maxLength={maxLength}
            value={value}
            rows={1}
            className={`block min-h-6 w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[var(--c-ocean)] outline-none placeholder:text-[rgba(75,85,99,0.72)] ${className}`}
            {...props}
          />
        </div>

        {(helperText || error) && (
          <p
            className={`mt-2 text-sm ${
              error ? 'text-[var(--c-error,#b91c1c)]' : 'text-[var(--c-text-2)]'
            }`}
          >
            {error || helperText}
          </p>
        )}
      </label>
    )
  }
)

export default RichTextArea
