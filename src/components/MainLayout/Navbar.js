import { useAuth } from '@/src/context/AuthContext'
import { DownIcon } from '@/src/utils/Icons'
import Link from '@comps/inputs/Link'
import Image from 'next/image'
import { useState } from 'react'
export default function Navbar({ links = [] }) {
  const { user } = useAuth()

  return (
    <div className="bg-blue-400  pb-0 flex justify-between">
      <div className="flex w-1/6 justify-center items-center p-1">
        <Link href="/">
          <>
            <div className="relative w-72 h-8 hidden md:block">
              <Image
                src="/nadamas/logo-2.png"
                layout="fill"
                objectFit="contain"
                priority={true}
              />
            </div>
            <div className="relative w-72 h-8  md:hidden ">
              <Image
                priority={true}
                src="/nadamas/logo-3.png"
                layout="fill"
                objectFit="contain"
              />
            </div>
          </>
        </Link>
      </div>
      <div className="hidden sm:flex w-full  justify-start items-center  px-1 ">
        <ul className="flex items-center">
          <li>
            <Link href="/">saber más</Link>
          </li>
        </ul>
      </div>
      <ul className=" flex justify-end items-center cursor-pointer">
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
    <div className="text-black text-center">
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
  return (
    <li
      className=" group  flex items-end hover:bg-white  px-1 "
      onClick={handleShowMenu}
    >
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
          } -right-1 z-20 w-48 py-2 mt-0 bg-white rounded-sm rounded-t-none shadow-xl dark:bg-gray-800`}
        >
          <li>{topMenu}</li>
          {listItems.map(({ href, label }) => (
            <Link href={href} key={label}>
              <li
                onClick={() => setShowMenu(false)}
                className={`block px-4 py-2 text-sm text-gray-700 capitalize transition-colors duration-200 transform dark:text-gray-300 hover:bg-blue-500 hover:text-white dark:hover:text-white cursor-pointer`}
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
