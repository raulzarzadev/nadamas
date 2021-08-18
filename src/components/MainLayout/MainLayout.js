import { useAuth } from '@/src/context/AuthContext'
import BottomNav from './BottomNav'
import Footer from './Footer'
import Navbar from './Navbar'

export default function MainLayout({ children }) {
  const { user } = useAuth()
  return (
    <div>
      <Navbar />
      <main className="bg-gray-700 min-h-screen ">{children}</main>
      <div className="sm:hidden sticky bottom-0">
        <BottomNav user={user} />
      </div>
      <div className="hidden sm:block bottom-0">
        <Footer />
      </div>
    </div>
  )
}

/* 
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
} */

