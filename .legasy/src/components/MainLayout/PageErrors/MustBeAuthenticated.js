import Info from '@/legasy/src/components/Alerts/Info'
import SocialMediaLogin from '@/legasy/src/components/AuthCard/SocialMediaLogin'
import Button from '@/legasy/src/components/inputs/Button'
import { useRouter } from 'next/router'

export default function MustBeAuthenticated({
  as = 'athlete' || 'coach' || 'admin'
}) {
  const router = useRouter()
  const message = {
    athlete: 'Atleta',
    coach: 'Entrenador',
    admin: 'Administrador'
  }
  return (
    <div className="max-w-md mx-auto flex flex-col justify-center items-center">
      <Info
        text={`Debe estar autenticado como ${message[as]} para poder ver esta pagina`}
        fullWidth
      />
      <Button label="Ingresar" onClick={() => router.push('/signin')} />
      {/*  <SocialMediaLogin /> */}
    </div>
  )
}
