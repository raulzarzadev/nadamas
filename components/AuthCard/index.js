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
        {!accepted ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 text-sm leading-relaxed text-[var(--c-text-2)]">
            <p>
              Para continuar, acepta la{' '}
              <Link
                href="/privacidad"
                className="font-semibold text-[var(--c-ocean-mid)]"
              >
                política de privacidad
              </Link>{' '}
              y el uso de tus datos para operar tu cuenta.
            </p>
            <button
              type="button"
              onClick={() => setAccepted(true)}
              className="btn btn-primary h-12 rounded-2xl"
            >
              Aceptar política y continuar
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3 text-sm text-[var(--c-text-2)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white font-bold text-[var(--c-ocean)]">
                ✓
              </span>
              Política aceptada
            </div>
            <OtpLogin disabled={false} />
            <SocialMediaLogin disabled={false} />
          </>
        )}
      </div>
    </div>
  )
}
