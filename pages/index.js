import Home from '@/src/components/Home'
import { useAuth } from '@/src/context/AuthContext'
import MainLayout from '@/src/layouts/MainLayout'
import Head from 'next/head'
export default function HomePage() {
  return (
    <>
      <Head>
        <title>nadamas - inicio</title>
        <meta
          name="description"
          content="Una aplicación para entrenadores y administradores de actividades deportivas. Mantén la información importante de tus atletas centralizada y organizada. Saca el máximo provecho de tus atletas con estadísticas que te ayudan a planear un mejor entrenamiento personalizado."
        ></meta>
      </Head>
      <MainLayout>
        <Home />
      </MainLayout>
    </>
  )
}
