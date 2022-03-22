import SocialMediaLogin from './SocialMediaLogin'
import { useState } from 'react'
export default function AuthCard() {
  const [form, setForm] = useState({ emailing: true })

  const handleChange = ({ target }) => {
    setForm({ ...form, [target.name]: target.checked })
  }

  const isValid = !!form?.privacity

  return (
    <div className="w-full max-w-sm p-6 m-auto  bg-white dark:bg-secondary-dark text-dark dark:text-light rounded-md shadow-md ">
      <h1 className="text-3xl font-semibold text-center  ">
        Ingresa
      </h1>

      <div className="flex items-center flex-col justify-between mt-4">
        <span className="w-1/5 border-b border-dark dark:border-dark lg:w-1/5"></span>

        <div className="text-xs text-center uppercase hover:underline">
          Registro a la version beta completamente gratis
        </div>

        <div className="flex items-center my-4 bg-white dark:bg-secondary-dark rounded-lg shadow-lg">
          <div className=" text-sm ">
            {/*   <p className="m-2">
              Marca la casilla si estás de acuerdo con el manejo de tu
              información
            </p> */}
            <p className="m-2">
              Tus datos personales y los de tus atletas son y siempre serán
              privados.
            </p>
            <p className="m-2">
              Por tratarse de una versión BETA es probable que futuras
              actualizaciones invaliden algunos datos.
            </p>
            <p className="m-2">
              Siempre puedes pedir una copia de la información generada en tu
              cuenta o pedir que sea eliminada.
            </p>
            <p className="m-2 ">
              Para agilizar el registro usamos una cuenta de Google.
            </p>
            <ul className="list-disc m-2 pl-8">
              <li>Nombre de usuario</li>
              <li>Imagen de usuario</li>
              <li>Email</li>
            </ul>
          </div>
        </div>
        {/* <div className="flex items-center my-4 bg-gray-100 rounded-lg shadow-lg">
          <div className="w-20">
            <input  defaultChecked={form?.emailing} type="checkbox" onChange={handleChange} name="emailing" />
          </div>
          <div className="text-black text-sm ">
            <p>
              Marca esta casilla para recibir información sobre el estado actual
              de la applicación, nuevas actualizaciones y saber sobre el futuro
              de nadamas
            </p>
          </div>
        </div> */}
        <div className="">
          <label className="">
            <input
              className="mr-2"
              type="checkbox"
              onChange={handleChange}
              name="privacity"
            />
            Acepar y continar
          </label>
        </div>
        <span className="w-1/5 border-b dark:border-light lg:w-1/5"></span>
      </div>

      <SocialMediaLogin disabled={!isValid} />

      {/* <p className="mt-8 text-xs font-light text-center text-gray-400">
        ¿Aun no tienes cuenta?
        <Link href="/signin" variant="bold">
          Regristrate
        </Link>
      </p> */}
    </div>
  )
}
