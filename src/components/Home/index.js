import { useAuth } from '@/src/context/AuthContext'
import useWriteText from '@/src/hooks/useWriteText'
import Image from 'next/image'
import { useRouter } from 'next/router'
import Button from '../Button'
import Cards from './Cards'

export default function Home() {
  const wordsList = ['natación', 'futbol', 'balete']
  const { text } = useWriteText({ step: 200, unwriteFast: true, wordsList })
  const router = useRouter()
  const handleToSignup = () => {
    router.push('/signin')
  }
  const {user}=useAuth()
  
  return (
    <div className="py-6">
      <h1 className="text-center font-extrabold text-4xl">nadamas</h1>
      {!user && (
        <div className="flex justify-end p-2">
          <div className="w-40">
            <Button variant="social" onClick={handleToSignup}>
              Registrate gratis
            </Button>
          </div>
        </div>
      )}
      <p className="text-center">
        {' '}
        una aplicación web para administrar sus equipos deportivos{' '}
      </p>
      <p className="text-center h-4">
        <strong className="font-bold ">{text}</strong>
      </p>
      <div className="flex flex-col justify-center md:max-w-screen-md mx-auto">
        <div className="flex items-center justify-center p-2 gap-2 ">
          <p className="w-2/3">
            Centraliza la información de tus atletas, marcas, lesiones y úsuala
            para gestionar eventos
          </p>
          <div className="relative h-40 w-40 shadow-lg">
            <Image
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80"
              layout="fill"
              objectFit="cover"
            />
          </div>
        </div>
        <div className="flex items-center justify-center p-2 gap-2">
          <div className="relative h-40 w-40 shadow-lg">
            <Image
              src="https://images.unsplash.com/photo-1509062522246-3755977927d7?ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8Y2xhc3Nyb29tfGVufDB8fDB8fA%3D%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"
              layout="fill"
              objectFit="cover"
            />
          </div>
          <p className="w-2/3 text-right">Crea grupos por horario y revisa asistencia</p>
        </div>
        <div className="flex items-center justify-center p-2 gap-2">
          <p className="w-2/3">Registra cuotas y programa días de pago</p>
          <div className="relative h-40 w-40 shadow-lg">
            <Image
              src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1172&q=80"
              layout="fill"
              objectFit="cover"
            />
          </div>
        </div>
        <div className="flex items-center justify-center p-2 gap-2">
          <div className="relative h-40 w-40 shadow-lg">
            <Image
              src="https://images.unsplash.com/photo-1600965962361-9035dbfd1c50?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80"
              layout="fill"
              objectFit="cover"
            />
          </div>
          <p className="w-2/3 text-right">
            Crea entrenamientos, evalúa progresos grupales o individuales
          </p>
        </div>
      </div>
      {!user && (
        <div className="">
          <div className="m-2 my-6">
            <Button variant="social" onClick={handleToSignup}>
              Registrate gratis
            </Button>
          </div>
        </div>
      )}

      {/* <Cards/> */}
    </div>
  )
}
