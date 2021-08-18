import { useAuth } from '@/src/context/AuthContext'
import {
  BackIcon,
  GroupsIcon,
  HomeIcon,
  PersonIcon,
  SignInIcon
} from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import Link from '@comps/inputs/Link'
import { useRouter } from 'next/router'

export default function BottomNav() {
  const router = useRouter()
  const { user } = useAuth()
  const home = router.pathname === '/'

  const handleBack = () => {
    router.back()
  }
  return (
    <div className="bg-blue-400 ">
      <div className="flex justify-evenly p-2">
        {user ? (
          <>
            <button onClick={handleBack}>
              <div className="p-3 rounded-lg m-2 shadow-lg hover:shadow-inner">
                <BackIcon />
              </div>
            </button>
            <Link href="/groups">
              <div className="p-3 rounded-lg m-2 shadow-lg hover:shadow-inner">
                <GroupsIcon />
              </div>
            </Link>
            <Link href="/athletes">
              <div className="p-3 rounded-lg m-2  shadow-lg hover:shadow-inner">
                <PersonIcon />
              </div>
            </Link>
          </>
        ) : (
          <Link href="/signin">
            <div className="p-3 rounded-lg m-2 shadow-lg hover:shadow-inner">
              <SignInIcon />
            </div>
          </Link>
        )}
        {!home && (
          <Link href="/">
            <div className="p-3 rounded-lg m-2 shadow-lg hover:shadow-inner">
              <HomeIcon />
            </div>
          </Link>
        )}
        {/*   {user && <div>{user.name}</div>} */}
      </div>
    </div>
  )
}
