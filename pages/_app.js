import '../styles/globals.css'
import 'tailwindcss/tailwind.css'
import Layout from '@comps/Layout'
import { UserProvider } from '@/context/UserContext'

function MyApp({ Component, pageProps }) {
  return (
    <UserProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </UserProvider>
  )
}

export default MyApp
