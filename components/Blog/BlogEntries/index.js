import { useEffect, useState } from "react"
import { listenPublicEntries } from "@firebase/entries/main"
import BlogEntry from "./BlogEntry"
const BlogEntries = () => {

  const [entries, setEntries] = useState([])

  useEffect(() => {
    listenPublicEntries(setEntries)
  }, [])

  return (
    <div>
      <div className=" ">
          {entries.map(entry => (
            <div key={entry.id} className='relative overflow-hidden ' >
               <BlogEntry entry={entry}  />
            </div>
          ))}
      </div>
    </div>
  )
}

export default BlogEntries
