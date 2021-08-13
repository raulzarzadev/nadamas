import FormAthlete from '@/src/FormAthlete'
import PrivateRoute from '@/src/HOCS/PrivateRoute'
import Head from 'next/head'

export default function grupos() {
  return (
    <>
      <Head>
        <title>Atleta - detalles</title>
      </Head>
      <PrivateRoute>
        <FormAthlete />
      </PrivateRoute>
    </>
  )
}
