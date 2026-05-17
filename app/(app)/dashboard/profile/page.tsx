'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useUser } from '@/context/UserContext'

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useUser()

  useEffect(() => {
    if (user === null) router.push('/login')
  }, [user, router])

  if (!user) return null

  return (
    <div className="py-6 text-base-content flex flex-col items-center gap-3">
      {user.photoURL && (
        <div className="relative w-24 h-24 rounded-full overflow-hidden">
          <Image
            src={user.photoURL}
            fill
            style={{ objectFit: 'cover' }}
            alt={user.displayName || user.email || 'avatar'}
          />
        </div>
      )}
      <h1 className="text-2xl font-bold">
        {user.displayName || 'Perfil'}
      </h1>
      <p className="opacity-80">{user.email}</p>
    </div>
  )
}
