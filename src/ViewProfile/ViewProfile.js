import { useAuth } from '../context/AuthContext'
import s from './styles.module.css'

export default function ViewProfile() {
  const { user } = useAuth()
  console.log('user', user)

  return (
    <div className={s.viewprofile}>
      <div>User Info</div>
      <div>Clases disponibles</div>
      <div>
        estadisiticas de alumnos
        {/* Cuantos alumnos tienes */}
        {/* Cuantos por clase */}
      </div>
    </div>
  )
}
