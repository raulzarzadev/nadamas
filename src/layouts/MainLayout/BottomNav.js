import Button from '@/src/Button'
import { useAuth } from '@/src/context/AuthContext'
import {
  BackIcon,
  GroupsIcon,
  HomeIcon,
  PersonIcon,
  SignInIcon
} from '@/src/utils/Icons'
import { useRouter } from 'next/router'

export default function BottomNav() {
  const router = useRouter()
  const { user } = useAuth()
  const home = router.pathname === '/'

  const handleBack = () => {
    router.back()
  }
  return (
    <div className="bg-blue-400">
      <div className='flex justify-evenly p-2'>
        {user ? (
          <>
            <Button onClick={handleBack}>
              <BackIcon />
            </Button>
            <Button href="/groups" nextLink>
              <GroupsIcon />
            </Button>
            <Button href="/athletes" nextLink>
              <PersonIcon />
            </Button>
          </>
        ) : (
          <Button href="/signin" nextLink>
            <SignInIcon />
          </Button>
        )}
        {!home && (
          <Button href="/" nextLink>
            <HomeIcon />
          </Button>
        )}
        {/*   {user && <div>{user.name}</div>} */}
      </div>
    </div>
  )
}
