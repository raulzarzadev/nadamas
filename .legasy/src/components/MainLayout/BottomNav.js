import { useAuth } from '@/legasy/src/context/AuthContext'
import {
  BackIcon,
  HomeIcon,
  SignInIcon
} from '@/legasy/src/utils/Icons'
import Link from '@/legasy/src/components/inputs/Link'
import { useRouter } from 'next/router'

export default function BottomNav({ links = [] }) {
  const router = useRouter()
  const { user } = useAuth()
  const home = router.pathname === '/profile'

  const handleBack = () => {
    router.back()
  }
  return (
    <div className="bg-secondary dark:bg-secondary-dark relative  ">
      <div className="flex justify-evenly p-1 ">
        {user ? (
          <>
            <button onClick={handleBack}>
              <div className="p-3 rounded-lg mx-2 shadow-lg hover:shadow-inner">
                <BackIcon />
              </div>
            </button>
            {links?.map(({ href, icon, label }) => (
              <Link key={label} href={href}>
                <div className="p-3 rounded-lg mx-2 shadow-lg hover:shadow-inner">
                  {icon}
                </div>
              </Link>
            ))}
            {/*
            <Link href="/athletes">
              <div className="p-3 rounded-lg mx-2  shadow-lg hover:shadow-inner">
                <PersonIcon />
              </div>
            </Link> */}
          </>
        ) : (
          <Link href="/signin">
            <div className="p-3 rounded-lg mx-2 shadow-lg hover:shadow-inner">
              <SignInIcon />
            </div>
          </Link>
        )}
        {!home && (
          <Link href="/profile">
            <div className="p-3 rounded-lg mx-2 shadow-lg hover:shadow-inner">
              <HomeIcon />
            </div>
          </Link>
        )}
        {/*   {user && <div>{user.name}</div>} */}
      </div>
    </div>
  )
}
