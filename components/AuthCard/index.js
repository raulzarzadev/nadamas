'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import SocialMediaLogin from './SocialMediaLogin'
import OtpLogin from './OtpLogin'

export default function AuthCard() {
  const [accepted, setAccepted] = useState(false)

  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-[var(--c-border)] bg-white shadow-[var(--shadow-md)]">
      <div className="bg-[var(--c-surface)] px-5 py-6 sm:px-7">
        <div className="flex justify-center">
          <Image
            src="/logo-nadamas.webp"
            alt="Nadamas"
            width={220}
            height={75}
            className="h-11 w-auto"
            priority
          />
        </div>
        <h1 className="mt-2 text-3xl font-extrabold text-[var(--c-ocean)]">
          Entra a tu cuenta
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--c-text-2)]">
          Reserva clases, lleva tu progreso o administra tu perfil de coach.
        </p>
      </div>

      <div className="flex flex-col gap-5 px-5 py-6 sm:px-7">
        <label className="flex items-start gap-3 rounded-2xl border border-[var(--c-border)] bg-white p-4 text-sm leading-relaxed text-[var(--c-text-2)]">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="checkbox checkbox-sm mt-0.5"
          />
          <span>
            Acepto la{' '}
            <Link
              href="/privacidad"
              className="font-semibold text-[var(--c-ocean-mid)]"
            >
              política de privacidad
            </Link>{' '}
            y el uso de mis datos para operar mi cuenta.
          </span>
        </label>

        <OtpLogin disabled={!accepted} />
        <SocialMediaLogin disabled={!accepted} />
      </div>
    </div>
  )
}
