import PrivateRoute from '@/src/HOCS/PrivateRoute'
import FormAthlete from '@comps/Athlete/FormAthlete'
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
        <FormAthlete athleteId={athleteId} />
      </PrivateRoute>
    </>
  )
}
