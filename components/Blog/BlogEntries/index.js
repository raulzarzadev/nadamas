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
      <h1 className="font-bold text-center">
        Entradas
      </h1>
      {entries.map(entry => <BlogEntry key={entry.id} entry={entry} size='sm' />)}
    </div>
  )
}

export default BlogEntries
