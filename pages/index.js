import { Head } from '@/src/components/Head'
import Home from '@/src/components/Home'
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
      <Home />
    </>
  )
}
