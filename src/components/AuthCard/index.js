import Button from '../Button'
import InputText from '../InputText'
import SocialMediaLogin from './SocialMediaLogin'
import Link from '../Link'
import { useState } from 'react'
export default function AuthCard() {
  const [form, setForm] = useState()
  const handleChange = ({ target }) => {
    setForm({ ...form, [target.name]: target.value })
  }
  const handleSignup = () => {
    console.log(form.name, form.password)
  }
  return (
    <div className="w-full max-w-sm p-6 m-auto bg-white rounded-md shadow-md dark:bg-gray-800">
      <h1 className="text-3xl font-semibold text-center text-gray-700 dark:text-white">
        Ingresa
      </h1>
      {/* <form className="mt-6">
        <div>
          <InputText disabled={true} label="Usuario" name="username" />
        </div>

        <div className="mt-4">
          <InputText disabled={true} label="Contraseña" name="password" />
        </div>
        <div className="mt-4 text-right ">
          <Link>Recuperar contraseña</Link>
        </div>

        <div className="mt-6 w-full flex">
          <Button label="Ingresar" disabled={true} />
        </div>
      </form> */}

      <div className="flex items-center justify-between mt-4">
        <span className="w-1/5 border-b dark:border-gray-600 lg:w-1/5"></span>

        <div className="text-xs text-center text-gray-500 uppercase dark:text-gray-400 hover:underline">
          Ingresa y regristrate con tu cuenta de Google
        </div>

        <span className="w-1/5 border-b dark:border-gray-400 lg:w-1/5"></span>
      </div>

      <SocialMediaLogin />

      <p className="mt-8 text-xs font-light text-center text-gray-400">
        ¿Aun no tienes cuenta?
        <Link href="/signin" variant="bold">
          Regristrate
        </Link>
      </p>
    </div>
  )
}
