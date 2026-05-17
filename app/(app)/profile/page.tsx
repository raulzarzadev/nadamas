'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useUser } from '@/context/UserContext'

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout } = useUser() as { user: any; logout: () => void }

  useEffect(() => {
    if (user === null) router.push('/login')
  }, [user, router])

  if (!user) return null

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)] sm:p-6">
      <div className="flex items-center gap-4">
        {user.photoURL && (
          <div className="relative h-16 w-16 overflow-hidden rounded-full border border-[var(--c-border)]">
            <Image
              src={user.photoURL}
              fill
              style={{ objectFit: 'cover' }}
              alt={user.displayName || user.email || 'avatar'}
            />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold">
            {user.displayName || 'Mi cuenta'}
          </h1>
          <p className="truncate text-[var(--c-text-2)]">{user.email}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={logout}
        className="btn btn-outline w-full"
      >
        Cerrar sesión
      </button>
    </div>
  )
}
