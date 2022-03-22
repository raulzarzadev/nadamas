import PrivateRoute from '@/legasy/src/HOCS/PrivateRoute'
import AthleteProfile from '@/legasy/src/components/UserProfile/AthleteProfile'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function grupos() {
  const {
    query: { id: athleteId }
  } = useRouter()

  return (
    <>
      <Head>
        <title>Atleta - detalles</title>
      </Head>
      <PrivateRoute>
        <AthleteProfile athleteId={athleteId} />
      </PrivateRoute>
    </>
  )
}
