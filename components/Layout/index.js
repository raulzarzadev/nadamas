import Navbar from './Navbar'
import { Head } from '@comps/Head'
import ROUTES from '@/ROUTES'
import BottomNav from './BottomNav'

export default function Layout({ children }) {
  const LINKS = ['profile', 'events', 'teams']
  const BOTTOM_LINKS = ['profile', 'teams']

  return (
    <>
      <Head title={'nadamas'}></Head>
      <div className="">
        <header>
          <Navbar links={LINKS.map((link) => ROUTES[link.toUpperCase()])} />
        </header>
        <main className=" min-h-screen pb-10">
          <div className="max-w-lg mx-auto">{children}</div>
        </main>
        <footer className="sm:hidden sticky bottom-0 ">
          <BottomNav
            links={BOTTOM_LINKS.map((link) => ROUTES[link.toUpperCase()])}
          />
        </footer>
        {/* <footer className="hidden sm:block">
          <Footer />
        </footer> */}
      </div>
    </>
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
