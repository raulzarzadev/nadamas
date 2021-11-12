import Info from '@comps/Alerts/Info'
import SocialMediaLogin from '@comps/AuthCard/SocialMediaLogin'
import Button from '@comps/inputs/Button'
import { useRouter } from 'next/router'

export default function MustBeAuthenticated() {
  const router = useRouter()
  return (
    <div className="max-w-md mx-auto pt-6">
      <Info
        text="Debe estar autenticado para poder ver esta pagina"
        fullWidth
      />
      <Button label="Ingresar" onClick={() => router.push('/signin')} />
      {/*  <SocialMediaLogin /> */}
    </div>
  )
}
