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
    <div className="bg-blue-900 p-2 pb-0 flex justify-between">
      <div className="flex w-1/6 justify-center items-center">Logo</div>
      <div className="hidden md:flex w-full  justify-start items-end  px-1 ">
        <ul className="flex">
          <NavbarSubMenu
            listComponent={
              <li className="flex items-center pb-3">Entrenamientos</li>
            }
            listItems={[
              {
                href: '/',
                label: 'Iniciar entreno'
              },
              {
                href: '/',
                label: 'Crear entreno'
              },
              {
                href: '/',
                label: 'Recomendar entreno'
              }
            ]}
          />
          <NavbarSubMenu
            listComponent={
              <li className="flex items-center pb-3">Comunidad</li>
            }
            listItems={[
              {
                href: '/',
                label: 'Buscar amigos'
              },
              {
                href: '/',
                label: 'Buscar equipos'
              },
              {
                href: '/',
                label: 'Seguir entrenador'
              }
            ]}
          />
        </ul>
      </div>
      <ul className=" flex justify-end items-center cursor-pointer">
        {user && (
          <NavbarSubMenu
            listComponent={
              <li className="relative bg-white w-12 h-12 rounded-full">
                <Link href="/profile">
                  <Image
                    layout="fill"
                    objectFit="cover"
                    className="rounded-full"
                    src={user?.image}
                  />
                </Link>
              </li>
            }
            listItems={avatarLinks}
          />
        )}
        {!user && (
          <li>
            <Link href="/signin">
              <div className="mx-2 ">Ingresar</div>
            </Link>
          </li>
        )}
        <NavbarSubMenu
          listComponent={
            <li className=" flex py-2">
              <button className="text-xl px-2 font-extrabold border-white group-hover:border-black border rounded-full flex justify-center ">
                +
              </button>
            </li>
          }
          listItems={addIconLinks}
          downIcon={false}
        />
      </ul>
    </div>
  )
}

const NavbarSubMenu = ({ listComponent, downIcon = true, listItems = [] }) => {
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
