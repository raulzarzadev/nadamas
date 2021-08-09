import Groups from '@/src/ViewGroups'
import PrivateRoute from '@/src/HOCS/PrivateRoute'
import MainLayout from '@/src/layouts/MainLayout'
import Head from 'next/head'

export default function grupos() {
  return (
    <>
      <Head>
        <title>Nuevo Atleta</title>
      </Head>
      <PrivateRoute Component={Groups} Layout={MainLayout} />
    </>
  )
}
