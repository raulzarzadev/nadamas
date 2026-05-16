'use client'
import Navbar from './Navbar'
import BottomNav from './BottomNav'
import { useTheme } from '@/context/ThemeContext'

export default function Layout({ children }) {
  const [theme] = useTheme()

  return (
    <div data-theme={theme} className="bg-base-300 relative">
      <header>
        <Navbar />
      </header>
      <main className=" min-h-screen pb-10">
        <div className="max-w-lg md:max-w-2xl mx-auto ">{children}</div>
      </main>
      <footer className="sm:hidden sticky bottom-0 z-10">
        <BottomNav />
      </footer>
    </div>
  )
}
