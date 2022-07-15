import { useRouter } from "next/router"
import BlogEntries from "../../components/BlogEntries"
import { ICONS } from "../../components/Icon/icon-list"
import ButtonIcon from "../../components/Inputs/Button/ButtonIcon"
import { ROUTES } from "../../CONSTANTS/ROUTES"

const Blog = () => {
  const router = useRouter()
  return (
    <div>
      <div className=" flex w-full justify-center my-2">
        <h1 className="text-2xl text-center">Blog</h1>
        <span className="mx-4"><ButtonIcon onClick={() => router.push(`${ROUTES.BLOG.href}/new`)} iconName={ICONS.plus} /></span>
      </div>
      <div>
        <BlogEntries/>
      </div>
    </div>
  )
}

export default Blog
