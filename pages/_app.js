import { AuthProvider } from '@/src/context/AuthContext'
import '../styles/globals.css'
import 'tailwindcss/tailwind.css'
import MainLayout from '@comps/MainLayout'

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
