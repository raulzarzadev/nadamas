import Button from '@/src/Button'
import { useAuth } from '@/src/context/AuthContext'
import MainLayout from '@/src/layouts/MainLayout'
import Head from 'next/head'

export default function Home() {
  const { googleLogin, user, signOut } = useAuth()

  const signInWithGoogle = () => {
    googleLogin()
  }
  const handleSignOut = () => {
    signOut()
  }

  return (
    <MainLayout user={user}>
      <Head>
        <title>nadmas</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div>{user && <Button onClick={handleSignOut}>Salir</Button>}</div>
      <h1>nadamas ... y nada más</h1>
      <div>{!user && <Button onClick={signInWithGoogle}>Ingresa</Button>}</div>
      {user && (
        <div>
          <Button nextLink link href="/grupos">
            Grupos
          </Button>
          <Button nextLink link href="/atletas">
            Atletas
          </Button>
        </div>
      )}
    </MainLayout>
  )
}
