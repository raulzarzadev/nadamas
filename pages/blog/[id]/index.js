import { useEffect, useState } from "react"
import { listenEntry } from '@firebase/entries/main'
import { useRouter } from "next/router"
import Head from "next/head"
import Loading from '@comps/Loading'
import BlogEntry from "../../../components/Blog/BlogEntries/BlogEntry"
import { ROUTES } from "../../../CONSTANTS/ROUTES"
const Entry = () => {
  const { query: { id: entryId }, push } = useRouter()
  useEffect(() => {
    listenEntry(entryId, (res) => setEntry(res || null))
  }, [])
  const [entry, setEntry] = useState()
  if (entry === undefined) return <Loading />
  if (entry === null) return <div className="h-screen flex justify-center items-center w-full flex-col"><p>Esta entrada ha sido eliminada</p>
    <div><button className="btn btn-outline my-4 " onClick={() => push(`${ROUTES.BLOG.href}`)} >Ir al blog</button></div></div>
  return (
    <div className="">
      <Head>
        <title>
          Editar | {entry.title || 'Entrada'}
        </title>
      </Head>
      <BlogEntry entry={entry} blocked={false} />
    </div>
  )
}

export default Entry
