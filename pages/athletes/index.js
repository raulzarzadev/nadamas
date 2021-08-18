import Athletes from '@comps/ViewAthletes'
import PrivateRoute from '@/src/HOCS/PrivateRoute'
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
