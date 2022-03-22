/* import {
  BackIcon,
  HomeIcon,
  SignInIcon
} from '@/legasy/src/utils/Icons' */
// import Link from '@/legasy/src/components/inputs/Link'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useUser } from '@/context/UserContext'
import Icon from '@comps/Icon'

export default function BottomNav({ links = [] }) {
  const router = useRouter()
  const { user } = useUser()
  const home = router.pathname === '/profile'

  const handleBack = () => {
    router.back()
  }
  return (
    <div className=" relative  ">
      <div className="flex justify-evenly p-1 ">
        {user ? (
          <>
            <button onClick={handleBack}>
              <div className="p-3 rounded-lg mx-2 shadow-lg hover:shadow-inner">
                <Icon name="trash" />
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
              <Icon name="signin" />
            </div>
          </Link>
        )}
        {!home && (
          <Link href="/profile">
            <div className="p-3 rounded-lg mx-2 shadow-lg hover:shadow-inner">
              <Icon name="home" />
            </div>
          </Link>
        )}
        {/*   {user && <div>{user.name}</div>} */}
      </div>
    </div>
  )
}
