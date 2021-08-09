import Athletes from '@/src/ViewAthletes'
import PrivateRoute from '@/src/HOCS/PrivateRoute'
import MainLayout from '@/src/layouts/MainLayout'
import Head from 'next/head'

export default function grupos() {
  return (
    <>
      <Head>
        <title>Todos los atletas</title>
      </Head>
      <PrivateRoute Component={Athletes} Layout={MainLayout} />
    </>
  )
}
