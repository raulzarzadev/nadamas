import PrivateRoute from '@/src/HOCS/PrivateRoute'
import FormAthlete from '@comps/Athlete/FormAthlete'
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
