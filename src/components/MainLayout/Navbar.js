import { useAuth } from '@/src/context/AuthContext'
import { DownIcon } from '@/src/utils/Icons'
import Link from '@comps/inputs/Link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import DarkModeToggle from './DarkModeToggle'
export default function Navbar({ links = [] }) {
  const { user } = useAuth()

  return (
    <div className="bg-secondary dark:bg-secondary-dark  pb-0 flex justify-between items-center">
      <div className="flex w-1/6 justify-center items-center p-1">
        <Link href="/" className="relative w-full h-8 hidden md:block ">
          <Image
            src="/nadamas/logo-2.png"
            layout="fill"
            objectFit="contain"
            priority={true}
          />
        </Link>
        <Link href="/" className="relative w-72 h-8  md:hidden ">
          <Image
            priority={true}
            src="/nadamas/logo-3.png"
            layout="fill"
            objectFit="contain"
          />
        </Link>
      </div>
      <div className=" sm:flex w-full  justify-start items-center  px-1 ">
        <ul className="flex items-center ">
          <li className="mx-2">
            <Link href="/events">
              <div className="relative ">
                Eventos
                <div className="absolute -top-1 -right-3 bg-warning h-3 w-3 rounded-full animate-bounce"></div>
              </div>
            </Link>
          </li>
          {user?.admin && (
            <li className="mx-2">
              <Link href="/admin">
                <div className="relative ">Panel</div>
              </Link>
            </li>
          )}
        </ul>
      </div>
      <ul className=" flex justify-end items-center cursor-pointer">
        <div className="mx-4">
          <DarkModeToggle />
        </div>
        {user && (
          <NavbarSubMenu
            listItems={links}
            listComponent={
              <Link href="/profile">
                {!!user?.image && (
                  <li className="relative bg-white w-12 h-12 rounded-full">
                    <Image
                      layout="fill"
                      objectFit="cover"
                      className="rounded-full"
                      src={user?.image}
                    />
                  </li>
                )}
              </Link>
            }
            topMenu={<TodgleProfile />}
          />
        )}
        {!user && (
          <>
            <li>
              <Link href="/signin">
                <div className="mx-2 ">Ingresar</div>
              </Link>
            </li>
          </>
        )}
      </ul>
    </div>
  )
}
const TodgleProfile = () => {
  const {
    user: { coach }
  } = useAuth()
  return (
    <div className="text-dark dark:text-light text-center">
      {coach ? 'Entrenador' : 'Nadador'}
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
    a.addEventListener('click', eventClick)
    return () => {
      a.removeEventListener('click', eventClick)
    }
  }, [showMenu])
  return (
    <li
      id="nav-menu"
      className=" group  flex items-end hover:bg-transparent  px-1 "
      onClick={handleShowMenu}
    >
      {showMenu && (
        <div
          className="absolute top-0 right-0 bottom-0 left-0 bg-dark bg-opacity-20 z-10"
          id="hola"
        ></div>
      )}
      <ul className="group-hover:text-black ">{listComponent}</ul>
      <div className="relative ">
        {/* <!-- Dropdown toggle button --> */}
        {downIcon && (
          <button className=" group-hover:text-black ">
            <DownIcon />
          </button>
        )}

        {/*  <!-- Dropdown menu --> */}
        <ul
          className={`absolute ${
            showMenu ? 'block' : 'hidden'
          } -right-1 z-20 w-48 py-2 mt-0 bg-secondary text-light  rounded-sm rounded-t-none shadow-xl dark:bg-secondary-dark`}
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
