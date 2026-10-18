import { FiCheck } from 'react-icons/fi'

// Marks a school/coach the athlete already belongs to or trains with.
export default function RegisteredBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
      <FiCheck aria-hidden="true" className="size-3" />
      Registrado
    </span>
  )
}
