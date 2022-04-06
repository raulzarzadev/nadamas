import { useUser } from '@/context/UserContext'
import Icon from '@comps/Icon'
import Button from '@comps/Inputs/Button'
import ButtonIcon from '@comps/Inputs/Button/ButtonIcon'

export default function SocialMediaLogin({ disabled }) {
  const { login } = useUser()
  return (
    <div className="flex w-full justify-center my-4">
      <ButtonIcon
        variant='info'
        size='xl'
        disabled={disabled}
        onClick={() => {
          login('google')
        }}
        label="Ingresar con Google"
        iconName='color-google'
      />
    </div>
  )
}
