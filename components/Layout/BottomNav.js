/* import {
  BackIcon,
  HomeIcon,
  SignInIcon
} from '@/legasy/src/utils/Icons' */
// import Link from '@/legasy/src/components/inputs/Link'
import { useRouter } from 'next/router'
import { useUser } from '@/context/UserContext'
import Icon from '@comps/Icon'
import Link from '@comps/Link'
import { BOTTOM_LINKS } from '@/CONSTANTS/ROUTES'

export default function BottomNav({ }) {
  const links = BOTTOM_LINKS
  const router = useRouter()
  const { user } = useUser()
  const home = router.pathname === '/profile'
  const blog = router.pathname === '/blog'
  const handleBack = () => {
    router.back()
  }
  return (
    <div className={`fixed -bottom-1 w-full ${blog && 'hidden'}`}>
      <div className=" relative bg-base-100  border-t border-base-300 pb-2 ">
        <div className="flex justify-evenly p-1 pb-0 ">
          {user ? (
            <>
              <button onClick={handleBack}>
                <ButtonIcon iconName={'back'} />
              </button>
              {links?.map(({ href, icon, label }) => (
                <Link key={label} href={href}>
                  <ButtonIcon iconName={icon} />
                </Link>
              ))}
            </>
          ) : (
            <Link href="/login">
              <ButtonIcon iconName={'signin'} />
            </Link>
          )}
          {!home && (
            <Link href="/profile">
              <ButtonIcon iconName={'home'} />
            </Link>
          )}
          {/*   {user && <div>{user.name}</div>} */}
        </div>
      </div>
    </div>
  )
}

const ButtonIcon = ({ iconName }) => {
  return (
    <div className="p-2 rounded-lg mx-2 shadow-lg hover:shadow-inner shadow-base-300  text-base-content  ">
      <Icon name={iconName} />
    </div>
  )
}
