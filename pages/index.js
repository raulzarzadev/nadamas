import Head from 'next/head'
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>nadmas</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <h1>
        nadamas ... y nada más
      </h1>
    </div>
  )
}
