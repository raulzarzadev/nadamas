import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import BlogEntryForm from "../../../../components/Blog/BlogEntryForm"
import Loading from '@comps/Loading'
import { getEntry } from '@firebase/entries/main'
import authRoute from '@comps/HOC/authRoute'
import Head from "next/head"

const EditEntry = () => {
  const { query: { id: entryId } } = useRouter()
  useEffect(() => {
    getEntry(entryId).then(res => setEntry(res))
  }, [])
  const [entry, setEntry] = useState()
  if (!entry) return <Loading />
  return (
    <div>
      <Head>
        <title>
          Editar | {entry.title || 'Entrada'}
        </title>
      </Head>
      <BlogEntryForm entry={entry} />
    </div>
  )
}

export default authRoute(EditEntry)
