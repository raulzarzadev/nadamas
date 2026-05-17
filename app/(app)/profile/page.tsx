'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useUser } from '@/context/UserContext'

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useUser() as { user: any }

  useEffect(() => {
    if (user === null) router.push('/login')
  }, [user, router])

  if (!user) return null

  return (
    <div className="flex flex-col items-center gap-3">
      {user.photoURL && (
        <div className="relative w-24 h-24 rounded-full overflow-hidden border border-[var(--c-border)]">
          <Image
            src={user.photoURL}
            fill
            style={{ objectFit: 'cover' }}
            alt={user.displayName || user.email || 'avatar'}
          />
        </div>
      )}
      <h1 className="text-2xl font-extrabold">{user.displayName || 'Perfil'}</h1>
      <p className="text-[var(--c-text-2)]">{user.email}</p>
    </div>
  )
}
