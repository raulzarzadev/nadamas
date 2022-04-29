import '../styles/globals.css'
import 'tailwindcss/tailwind.css'
import { UserProvider } from '@/context/UserContext'
import { ThemeProvider } from '@/context/ThemeContext'
import Layout from '@comps/Layout'

function MyApp({ Component, pageProps }) {
  return (
    <UserProvider>
      <ThemeProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </ThemeProvider>
    </UserProvider>
  )
}

export default MyApp
