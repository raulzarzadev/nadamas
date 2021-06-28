import Button from '../Button'
import { useAuth } from '../context/AuthContext'
import MainLayout from '../layouts/MainLayout'
import { GroupsIcon, PersonIcon } from '../utils/Icons'
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
      <p>Saca el máximo potencial de tus atletas</p>
      <h1>NADAMAS</h1>
      <div>{!user && <Button onClick={signInWithGoogle}>Ingresa</Button>}</div>
      {user && (
        <div className={s.buttons_box}>
          <Button p="2" size="md" primary nextLink link href="/grupos">
            <div className={s.index_button}>
              <GroupsIcon />
              <span>Grupos</span>
            </div>
          </Button>
          <Button p="2" size="md" primary nextLink link href="/atletas">
            <div className={s.index_button}>
              <PersonIcon />
              <span>Atletas</span>
            </div>
          </Button>
        </div>
      )}
    </MainLayout>
  )
}
