import Navbar from './Navbar'
import { Head } from '@comps/Head'
import ROUTES from '@/ROUTES'
import BottomNav from './BottomNav'
import { useTheme } from '@/context/ThemeContext'

export default function Layout({ children }) {
  const LINKS = ['profile', 'events', 'teams']
  const BOTTOM_LINKS = ['profile', 'teams']
  const [theme] = useTheme()
  return (
    <>
      <Head title={'nadamas'}></Head>
      <div data-theme={theme} className="bg-base-300">
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
      </div>
    </>
  )
}
