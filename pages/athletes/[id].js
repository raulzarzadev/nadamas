import FormAthlete from '@comps/FormAthlete'
import PrivateRoute from '@/src/HOCS/PrivateRoute'
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
