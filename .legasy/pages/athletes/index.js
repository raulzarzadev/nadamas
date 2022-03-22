import Athletes from '@/legasy/src/components/ViewAthletes'
import PrivateRoute from '@/legasy/src/HOCS/PrivateRoute'
import Head from 'next/head'

export default function grupos() {
  return (
    <>
      <Head>
        <title>Todos los atletas</title>
      </Head>
      <PrivateRoute>
        <Athletes />
      </PrivateRoute>
    </>
  )
}
