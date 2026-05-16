'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import DarkModeToggle from './DarkModeToggle'
import { useUser } from '@/context/UserContext'
import Icon from '@comps/Icon'
import Link from '@comps/Link'
import { useTheme } from '@/context/ThemeContext'
import { NAV_LINKS } from '@/CONSTANTS/ROUTES'

export default function Navbar() {
  const { user } = useUser()
  const [theme] = useTheme()
  const links = NAV_LINKS
  return (
    <div className="  pb-0 flex justify-between items-center   bg-base-100 text-base-content">
      <div className="flex w-1/6 justify-center items-center p-1 ">
        <Link href="/" className="relative w-full h-8 hidden md:block ">
          <Image
            src={
              theme === 'light'
                ? '/nadamas/logo-light.png'
                : '/nadamas/logo-dark.png'
            }
            fill
            style={{ objectFit: 'contain' }}
            priority
            alt="nadamas"
          />
        </Link>
        <Link href="/" className="relative w-72 h-8  md:hidden ">
          <Image
            priority
            src="/nadamas/logo-3.png"
            fill
            style={{ objectFit: 'contain' }}
            alt="nadamas"
          />
        </Link>
      </div>
      <div className=" flex  w-full  justify-start items-center  px-1 "></div>
      <ul className=" flex justify-end items-center cursor-pointer">
        <div className="mx-4">
          <DarkModeToggle />
        </div>
        {user ? (
          <div className=" ">
            <NavbarSubMenu
              listItems={links}
              topMenu={
                <div className="text-right pr-1 text-xs">
                  {user?.email}
                  <div>{user.isCoach ? 'Entrenador' : 'Nadador'}</div>
                </div>
              }
              listComponent={
                <>
                  {!!user?.photoURL && (
                    <li className="relative  w-10 h-10 rounded-full">
                      <Image
                        fill
                        style={{ objectFit: 'cover' }}
                        className="rounded-full"
                        src={user?.photoURL}
                        alt=""
                      />
                    </li>
                  )}
                </>
              }
            />
          </div>
        ) : (
          <li>
            <Link href="/login" id="login-button">
              <div className="mx-2 ">Ingresar</div>
            </Link>
          </li>
        )}
      </ul>
    </div>
  )
}

const NavbarSubMenu = ({
  listComponent,
  downIcon = true,
  listItems = [],
  topMenu
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const handleShowMenu = () => {
    setShowMenu(!showMenu)
  }
  useEffect(() => {
    const eventClick = (e) => {
      const { id } = e.target
      if (id === `nav-menu`) handleShowMenu()
    }
    const a = document.getElementById(`nav-menu`)
    if (!a) return
    a.addEventListener('click', eventClick)
    return () => {
      a.removeEventListener('click', eventClick)
    }
  }, [showMenu])
  return (
    <li
      id="nav-menu"
      className=" group  flex items-end hover:bg-transparent  px-1"
      onClick={handleShowMenu}
    >
      {showMenu && (
        <div
          className="absolute top-0 right-0 bottom-0 left-0 bg-dark bg-opacity-20 z-10 "
          id="hola"
        ></div>
      )}
      <ul className="">{listComponent}</ul>
      <div className="relative ">
        {downIcon && (
          <button className="  ">
            <Icon name="down" />
          </button>
        )}

        <ul
          id="dropdown-menu"
          className={`absolute ${
            showMenu ? 'block' : 'hidden'
          } -right-1 z-20 w-48 py-2 mt-0  bg-base-100 rounded-sm rounded-t-none shadow-xl dark:bg-secondary-dark`}
        >
          <li>{topMenu}</li>
          {listItems.map(({ href, label }) => (
            <Link href={href} key={label}>
              <li
                onClick={() => setShowMenu(false)}
                className={`block px-4 py-2 text-sm  capitalize transition-colors duration-200 transform hover:text-white dark:text-light   dark:hover:text-white cursor-pointer`}
              >
                {label}
              </li>
            </Link>
          ))}
        </ul>
      </div>
    </li>
  )
}
