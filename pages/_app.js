import '../styles/globals.css'
import 'tailwindcss/tailwind.css'
import { UserProvider } from '@/context/UserContext'
import { ThemeProvider } from '@/context/ThemeContext'
import Layout from '@comps/Layout'
import { useEffect } from 'react'

function MyApp({ Component, pageProps }) {
/*   useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register("/sw.js").then(
          function (registration) {
            console.log("Service Worker registration successful with scope: ", registration.scope);
          },
          function (err) {
            console.log("Service Worker registration failed: ", err);
          }
        )
      })
    }else{
      console.log("Service Worker was not found");
    }
  }, []) */
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
