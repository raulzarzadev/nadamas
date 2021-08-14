import { useAuth } from '@/src/context/AuthContext'
import { DownIcon } from '@/src/utils/Icons'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect } from 'react'
export default function Navbar() {
  const { user } = useAuth()
  useEffect(() => {}, [user])

  const avatarLinks = [
    {
      href: '/profile',
      label: 'Mi perfil'
    },
    {
      href: '/groups',
      label: 'Mis grupos'
    },
    {
      href: '/athletes',
      label: 'Atletas'
    },
    {
      href: '/athletes/new',
      label: 'Nuevo atleta'
    },
    {
      href: '/signout',
      label: 'Salir'
    }
  ]
  const addIconLinks = [
    {
      href: '/add-activity',
      label: 'Agregar actividad'
    }
  ]
  return (
    <div className="bg-blue-400 p-2 pb-0 flex justify-between">
      <div className="flex w-1/6 p-1 justify-center items-center">
        <Link href="/">
          <>
            <div className="relative w-72 h-8 hidden md:block">
              <Image
                src="/nadamas/logo-2.png"
                layout="fill"
                objectFit="contain"
              />
            </div>
            <div className="relative w-72 h-16  md:hidden">
              <Image
                src="/nadamas/logo-3.png"
                layout="fill"
                objectFit="contain"
              />
            </div>
          </>
        </Link>
      </div>
      <div className="hidden md:flex w-full  justify-start items-end  px-1 ">
        <ul className="flex"></ul>
      </div>
      <ul className=" flex justify-end items-center cursor-pointer">
        {user && (
          <NavbarSubMenu
            listItems={avatarLinks}
            listComponent={
              <li className="relative bg-white w-12 h-12 rounded-full">
                <Link href="/profile">
                  <>
                    <Image
                      layout="fill"
                      objectFit="cover"
                      className="rounded-full"
                      src={user?.image}
                    />
                  </>
                </Link>
              </li>
            }
            topMenu={<TodgleProfile />}
          />
        )}
        {!user && (
          <li>
            <Link href="/signin">
              <div className="mx-2 ">Ingresar</div>
            </Link>
          </li>
        )}
      </ul>
    </div>
  )
}
const TodgleProfile = () => {
  return <div className="text-black text-center">Entrenador</div>
}

const NavbarSubMenu = ({
  listComponent,
  downIcon = true,
  listItems = [],
  topMenu
}) => {
  return (
    <li className=" group  flex items-end hover:bg-white  px-1 ">
      <ul className="group-hover:text-black ">{listComponent}</ul>
      <div className="relative ">
        {/* <!-- Dropdown toggle button --> */}
        {downIcon && (
          <button className=" group-hover:text-black ">
            <DownIcon />
          </button>
        )}

        {/*  <!-- Dropdown menu --> */}
        <ul className="absolute hidden group-hover:block -right-1 z-20 w-48 py-2 mt-0 bg-white rounded-sm rounded-t-none shadow-xl dark:bg-gray-800">
          <li>{topMenu}</li>
          {listItems.map(({ href, label }) => (
            <Link href={href} key={label}>
              <li className="block px-4 py-2 text-sm text-gray-700 capitalize transition-colors duration-200 transform dark:text-gray-300 hover:bg-blue-500 hover:text-white dark:hover:text-white cursor-pointer">
                {label}
              </li>
            </Link>
          ))}
        </ul>
      </div>
    </li>
  )
}
