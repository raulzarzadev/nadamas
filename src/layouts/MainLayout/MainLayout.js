import Avatar from '@/src/Avatar'
import Button from '@/src/Button'
import { useAuth } from '@/src/context/AuthContext'
import {
  BackIcon,
  GroupsIcon,
  PersonIcon,
  HomeIcon,
  SignInIcon,
  SignOutIcon
} from '@/src/utils/Icons'
import Link from 'next/link'
import { useRouter } from 'next/router'
import s from './styles.module.css'

export default function MainLayout({ children, user }) {
  return (
    <div className={s.mainlayout}>
      <Header user={user} />
      <main className='bg-blue-400 min-h-screen '>{children}</main>
      <Footer user={user} />
    </div>
  )
}
const Header = ({ user }) => {
  const { signOut } = useAuth()

  const handleSignOut = () => {
    signOut()
  }

  return (
    <div className={s.header}>
      <span className={s.avatar}>
        <Link href="/perfil">
          <Avatar size="sm" alt="z" image={user?.image} />
        </Link>
        {user?.name}
      </span>
      <div>
        {user && (
          <Button link onClick={handleSignOut}>
            <SignOutIcon />
          </Button>
        )}
      </div>
    </div>
  )
}

const Footer = ({ user }) => {
  const router = useRouter()
  const home = router.pathname === '/'
  const { googleLogin, signOut } = useAuth()

  const signInWithGoogle = () => {
    googleLogin()
  }

  const handleBack = () => {
    router.back()
  }
  return (
    <div className={s.footer}>
      {user ? (
        <>
          <Button onClick={handleBack}>
            <BackIcon />
          </Button>
          <Button href="/grupos" nextLink>
            <GroupsIcon />
          </Button>
          <Button href="/atletas" nextLink>
            <PersonIcon />
          </Button>
        </>
      ) : (
        <Button onClick={signInWithGoogle}>
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
  )
}
