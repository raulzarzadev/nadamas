import Info from '@comps/Alerts/Info'
import SocialMediaLogin from '@comps/AuthCard/SocialMediaLogin'
import Button from '@comps/inputs/Button'
import { useRouter } from 'next/router'

export default function MustBeAuthenticated({ asCoach }) {
  const router = useRouter()
  return (
    <div className="max-w-md mx-auto flex flex-col justify-center items-center">
      <Info
        text={`Debe estar autenticado ${
          asCoach ? 'como ENTRENADOR' : ''
        } para poder ver esta pagina`}
        fullWidth
      />
      <Button label="Ingresar" onClick={() => router.push('/signin')} />
      {/*  <SocialMediaLogin /> */}
    </div>
  )
}
