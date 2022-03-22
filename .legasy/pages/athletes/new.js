import PrivateRoute from '@/legasy/src/HOCS/PrivateRoute'
import FormAthlete from '@/legasy/src/components/Athlete/FormAthlete'
import Head from 'next/head'

export default function grupos() {
  return (
    <>
      <Head>
        <title>Nuevo Atleta</title>
      </Head>
      <PrivateRoute>
        <FormAthlete />
      </PrivateRoute>
    </>
  )
}
