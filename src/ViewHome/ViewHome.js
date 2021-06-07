import Button from '../Button'
import { useAuth } from '../context/AuthContext'
import MainLayout from '../layouts/MainLayout'
import s from './styles.module.css'

export default function ViewHome() {
  const { googleLogin, user, signOut } = useAuth()

  const signInWithGoogle = () => {
    googleLogin()
  }
  const handleSignOut = () => {
    signOut()
  }
  return (
    <MainLayout user={user}>
      <div>{user && <Button onClick={handleSignOut}>Salir</Button>}</div>
      <h1>nada... y nadamas</h1>
      <div>{!user && <Button onClick={signInWithGoogle}>Ingresa</Button>}</div>
      {user && (
        <div className={s.buttons_box}>
          <Button p="2" size="md" primary nextLink link href="/grupos">
            Grupos
          </Button>
          <Button p="2" size="md" primary nextLink link href="/atletas">
            Atletas
          </Button>
        </div>
      )}
    </MainLayout>
  )
}
