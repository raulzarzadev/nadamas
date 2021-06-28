import { useEffect, useState } from 'react'
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
  const frases = [
    'Saca el máximo de tus atletas',
    'Optimiza tus entrenos',
    'Mide sus progresos',
    'Registra sus marcas'
  ]

  const [frase, setFrase] = useState('')
  useEffect(() => {
    let interval = 0
    setInterval(() => {
      setFrase(frases[interval])
      interval++
      if (interval === frases.length) interval = 0
    }, 3000)
  }, [])

  return (
    <MainLayout user={user}>
      <div className={s.frases}>{frase}</div>
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
