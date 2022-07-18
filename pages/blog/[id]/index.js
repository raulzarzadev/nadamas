import { useEffect, useState } from "react"
import { getEntry } from '@firebase/entries/main'
import { useRouter } from "next/router"
import Head from "next/head"
import Loading from '@comps/Loading'
import BlogEntry from "../../../components/Blog/BlogEntries/BlogEntry"
const Entry = () => {
  const { query: { id: entryId } } = useRouter()
  useEffect(() => {
    getEntry(entryId).then(res => setEntry(res))
  }, [])
  const [entry, setEntry] = useState()
  if (!entry) return <Loading />
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
