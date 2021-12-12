import { useAuth } from '@/src/context/AuthContext'
import { Head } from '@comps/Head'
import { useEffect, useState } from 'react'
import BottomNav from './BottomNav'
import Footer from './Footer'
import LINKS_ATHLETE from './LINKS_ATHLETE'
import LINKS_COACH from './LINKS_COACH'
import Navbar from './Navbar'

export default function MainLayout({ children }) {
  const { user } = useAuth()
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
      <Head>
        <link rel="shortcut icon" href="/nadamas/logo-3.png" />
        <meta
          name="description"
          content="Una aplicación para entrenadores y administradores de actividades deportivas. Mantén la información importante de tus atletas centralizada y organizada. Saca el máximo provecho de tus atletas con estadísticas que te ayudan a planear un mejor entrenamiento personalizado."
        ></meta>
      </Head>
      <>
        <header>
          <Navbar links={links?.nav} />
        </header>
        <main className="bg-primary dark:bg-primary-dark min-h-screen pb-10">
          <div className="max-w-lg mx-auto">{children}</div>
        </main>
        <footer className="sm:hidden sticky bottom-0 ">
          <BottomNav user={user} links={links?.bottom} />
        </footer>
        <footer className="hidden sm:block">
          <Footer />
        </footer>
      </>
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
