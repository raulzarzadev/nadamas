import Head from "next/head"
import { useRouter } from "next/router"
import BlogEntries from "../../components/Blog/BlogEntries"

const Blog = () => {
  const router = useRouter()
  return (
    <div>
      <Head>
        <title>
          Blog | Últimas
        </title>
      </Head>
      <BlogEntries />
    </div>
  )
}

export default Blog
