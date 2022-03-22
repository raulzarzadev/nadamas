import { useUser } from '@/context/UserContext'
import { useEffect, useState } from 'react'
import BottomNav from './BottomNav'
import Footer from './Footer'

import LINKS_COACH from './LINKS_COACH'
import LINKS_ATHLETE from './LINKS_ATHLETE'
import Navbar from './Navbar'
import { Head } from '@comps/Head'

export default function Layout({ children }) {
  const { user } = useUser()
  const [links, setLinks] = useState(undefined)
  useEffect(() => {
    if (user?.coach) {
      setLinks(LINKS_COACH)
    } else {
      setLinks(LINKS_ATHLETE)
    }
  }, [user])
  return (
    <>
      <Head title={'nadamas'}></Head>
      <div data-theme="cupcake">
        <header>
          <Navbar links={links?.nav} />
        </header>
        <main className=" min-h-screen pb-10">
          <div className="max-w-lg mx-auto">{children}</div>
        </main>
        {/*  <footer className="sm:hidden sticky bottom-0 ">
          <BottomNav user={user} links={links?.bottom} />
        </footer> */}
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
