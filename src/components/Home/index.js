import { useAuth } from '@/src/context/AuthContext'
import Button from '@comps/inputs/Button'
import Image from 'next/image'
import { useRouter } from 'next/router'

export default function Home() {
  const wordsList = ['natación', 'futbol', 'balete']
  //const { text } = useWriteText({ step: 200, unwriteFast: true, wordsList })
  const router = useRouter()
  const handleToSignup = () => {
    router.push('/signin')
  }
  const { user } = useAuth()

  return (
    <div className="py-6">
      <p className="text-center">
        La <span className="font-bold">aplicación web</span> para atletas y
        entrenadores
      </p>
      <p className="text-center italic font-thin my-2">
        Sin instalar, sin publicidad, donde sea, cuando sea.
      </p>
      {!user && (
        <div className="flex justify-center m-4">
          <Button
            label="Registrate"
            variant="success"
            onClick={() => router.push('/signin')}
          />
        </div>
      )}
      {/* <div className="mt-6">
        <PublicEvents showNew={true} />
      </div> */}

      <div className="flex flex-col justify-center md:max-w-screen-md mx-auto text-2xl">
        <HomeRow
          image="/nadamas/sherTrhophyes.jpeg"
          text="Guarda y comparte tus logros"
          imageSide="right"
        />
        <HomeRow
          image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80"
          text="Centraliza tu información y la de tu equipo"
          imageSide="left"
        />
        <HomeRow
          image="https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1172&q=80"
          text="Controla las cuotas y la asistencia"
          imageSide="right"
        />
        <HomeRow
          image="https://images.unsplash.com/photo-1600965962361-9035dbfd1c50?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80"
          text="Planea clases y entrenamientos. Evalúa tu progreso o el de tu equipo"
          imageSide="left"
        />
      </div>
    </div>
  )
}

const HomeRow = ({
  image = '',
  imageSide = 'left' || 'right',
  text = 'Text'
}) => {
  const imageIsInleftSide = imageSide === 'left'
  return (
    <div
      className={`flex items-center justify-center flex-col sm:flex-row p-2 ${
        imageIsInleftSide ? 'flex-col-reverse' : ''
      }`}
    >
      {imageIsInleftSide && (
        <p className="md:w-2/3 text-center md:text-left">{text}</p>
      )}
      <div
        className={`relative h-56 w-56 shadow-lg md:transform hover:rotate-0 ${
          imageIsInleftSide ? 'rotate-12' : '-rotate-12'
        }`}
      >
        <Image src={image} layout="fill" objectFit="cover" />
      </div>
      {imageSide === 'right' && (
        <p className="md:w-2/3 text-center md:text-right">{text}</p>
      )}
    </div>
  )
}
