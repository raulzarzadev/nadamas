import { useEffect, useState } from "react"
import { listenPublicEntries } from "@firebase/entries/main"
import BlogEntry from "./BlogEntry"
import { useRouter } from "next/router"
import { ROUTES } from "../../../CONSTANTS/ROUTES"
import ButtonAdd from "../../Inputs/Button/ButtonAdd"
const BlogEntries = () => {

  const [entries, setEntries] = useState([])

  useEffect(() => {
    listenPublicEntries(setEntries)
    return () => {
      setEntries([])
    }
  }, [])

  const router = useRouter()

  return (
    <div className="">
      <ButtonAdd
        onClick={() => router.push(`${ROUTES.BLOG.href}/new`)}
      />
      <div className="flex  justify-around w-full my-4">
        <button disabled className="border disabled:opacity-40 bg-info text-info-content rounded-full flex items-center justify-center px-2 py-0. 5">Últimos</button>
        <button disabled className="border disabled:opacity-40 rounded-full flex items-center justify-center px-2 py-0. 5">Temas</button>
        <button disabled className="border disabled:opacity-40 rounded-full flex items-center justify-center px-2 py-0.5">Entrenadores</button>

      </div>
      <div className=" ">
        {entries.map(entry => (
          <div key={entry.id} className='relative overflow-hidden my-2 ' >
            <BlogEntry entry={entry} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default BlogEntries
