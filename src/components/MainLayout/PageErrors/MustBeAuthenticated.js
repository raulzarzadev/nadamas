import Info from '@comps/Alerts/Info'
import SocialMediaLogin from '@comps/AuthCard/SocialMediaLogin'

export default function MustBeAuthenticated() {
  return (
    <div className="max-w-md mx-auto pt-6">
        <Info text="Debe estar autenticado para poder ver esta pagina" fullWidth/>
      <SocialMediaLogin />
    </div>
  )
}
