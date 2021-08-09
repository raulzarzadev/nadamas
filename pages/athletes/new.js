import PrivateRoute from '@/src/HOCS/PrivateRoute'
import MainLayout from '@/src/layouts/MainLayout'
import FormAthlete from '@/src/FormAthlete'
import Head from 'next/head'

export default function grupos() {
  return (
    <>
      <Head>
        <title>Nuevo Atleta</title>
      </Head>
      <PrivateRoute Component={FormAthlete} Layout={MainLayout} />
    </>
  )
}
