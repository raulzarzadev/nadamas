import type { ButtonHTMLAttributes } from 'react'
import { FiPlus } from 'react-icons/fi'

export default function AddStudentButton({
  children = 'Alumno',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`relative inline-flex h-7 min-h-7 items-center justify-center gap-1 rounded-full bg-[var(--c-aqua)] px-2 text-[10px] font-bold text-white transition-colors before:absolute before:-inset-y-2 before:inset-x-0 hover:bg-[var(--c-aqua-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:opacity-70 ${className}`}
      {...props}
    >
      <FiPlus aria-hidden="true" /> {children}
    </button>
  )
}
