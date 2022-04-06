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
      <div className=" flex  w-full  justify-start items-center  px-1 ">
        <ul className=" sm:flex items-center ">
          {/* <li className="mx-2">
            <Link href="/events">
              <div className="relative ">
                Eventos
                <div className="absolute -top-1 -right-3 bg-warning h-3 w-3 rounded-full animate-bounce"></div>
              </div>
            </Link>
          </li> */}
          {/* {user?.admin && (
            <li className="mx-2 hidden sm:block">
              <Link href={ROUTES.admin}>
                <div className="relative ">Panel</div>
              </Link>
            </li>
          )} */}
        </ul>
      </div>
      <ul className=" flex justify-end items-center cursor-pointer">
        <div className="mx-4">
          <DarkModeToggle />
        </div>
        {user ? (
          <div className=" ">
            {/* {user && <div className="text-xs">{user.name?.slice(0, 10)}</div>} */}
            <NavbarSubMenu
              listItems={links}
              topMenu={<div className='text-center font-bold'>{user.isCoach ? 'Entrenador' : 'Nadador'}</div>}
              listComponent={
                <>
                  {!!user?.photoURL && (
                    <li className="relative  w-10 h-10 rounded-full">
                      <Image
                        layout="fill"
                        objectFit="cover"
                        className="rounded-full"
                        src={user?.photoURL}
                      />
                    </li>
                  )}
                </>
              }
            />
          </div>
        ) : (
          <li>
            <Link href="/login">
              <div className="mx-2 ">Ingresar</div>
            </Link>
          </li>
        )}
      </ul>
    </div>
  )
}
/* const TodgleProfile = () => {
  const {
    user: { isCoach }
  } = useUser()
  console.log(user)
  return (
    <div className="text-dark dark:text-light text-center">
      {isCoach ? 'Entrenador' : 'Nadador'}
    </div>
  ) 
}
*/

const NavbarSubMenu = ({
  listComponent,
  downIcon = true,
  listItems = [],
  topMenu
}) => {
  const { user } = useUser()
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
        {/* <!-- Dropdown toggle button --> */}
        {downIcon && (
          <button className="  ">
            <Icon name="down" />
          </button>
        )}

        {/*  <!-- Dropdown menu --> */}
        <ul
          className={`absolute ${
            showMenu ? 'block' : 'hidden'
          } -right-1 z-20 w-48 py-2 mt-0  bg-base-100 rounded-sm rounded-t-none shadow-xl dark:bg-secondary-dark`}
        >
          <li>{topMenu}</li>
          {/* {user?.admin && (
            <Link href={ROUTES.admin}>
              <li
                onClick={() => setShowMenu(false)}
                className={`block px-4 py-2 text-sm  capitalize transition-colors duration-200 transform hover:text-white dark:text-light   dark:hover:text-white cursor-pointer`}
              >
                Panel
              </li>
            </Link>
          )} */}

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
