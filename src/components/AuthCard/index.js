import SocialMediaLogin from './SocialMediaLogin'
import { useState } from 'react'
export default function AuthCard() {
  const [form, setForm] = useState({ emailing: true })

  const handleChange = ({ target }) => {
    setForm({ ...form, [target.name]: target.checked })
  }

  const isValid = !!form?.privacity

  return (
    <div className="w-full max-w-sm p-6 m-auto bg-white rounded-md shadow-md dark:bg-gray-800">
      <h1 className="text-3xl font-semibold text-center text-gray-700 dark:text-white">
        Ingresa
      </h1>

      <div className="flex items-center flex-col justify-between mt-4">
        <span className="w-1/5 border-b dark:border-gray-600 lg:w-1/5"></span>

        <div className="text-xs text-center text-gray-500 uppercase dark:text-gray-400 hover:underline">
          Registro a la version beta completamente gratis
        </div>

        <div className="flex items-center my-4 bg-gray-100 rounded-lg shadow-lg">
          <div className="text-black text-sm ">
          {/*   <p className="m-2">
              Marca la casilla si estás de acuerdo con el manejo de tu
              información
            </p> */}
            <p className="m-2">
              Tus datos personales y los de tus atletas son y siempre seran
              completamente privados.
            </p>
            <p className="m-2">
              Por tratarse de una versión beta es probable que futuras
              actualizaciones invaliden algunos de estos datos
            </p>
            <p className="m-2">
              Siempre puedes pedir una copia de la información generada en tu
              cuenta o pedir que sea eliminada.
            </p>
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
          <label className="text-black">
            <input className='mr-2' type="checkbox" onChange={handleChange} name="privacity" />
            Acepar y continar
          </label>
        </div>
        <span className="w-1/5 border-b dark:border-gray-400 lg:w-1/5"></span>
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
