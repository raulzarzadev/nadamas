import { AuthProvider } from '@/legasy/src/context/AuthContext'
import '../styles/globals.css'
import 'tailwindcss/tailwind.css'
import MainLayout from '@/legasy/src/components/MainLayout'

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <MainLayout>
        <Component {...pageProps} />
      </MainLayout>
    </AuthProvider>
  )
}

export default MyApp
