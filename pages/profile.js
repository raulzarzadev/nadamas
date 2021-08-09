import PrivateRoute from '@/src/HOCS/PrivateRoute'
import MainLayout from '@/src/layouts/MainLayout'
import ViewProfile from '@/src/ViewProfile'
import Head from 'next/head'

export default function grupos() {
  return (
    <>
      <Head>
        <title>Perfil</title>
      </Head>
      <PrivateRoute Component={ViewProfile} Layout={MainLayout} />
    </>
  )
}
