import authRoute from '@comps/HOC/authRoute'
import BlogEntryForm from "@comps/Blog/BlogEntryForm"
import Head from "next/head"

const New = () => {
  return (
    <div>
      <Head>
        <title>
          Blog | Nueva entrada
        </title>
      </Head>
      <BlogEntryForm/>
    </div>
  )
}

export default authRoute(New)

