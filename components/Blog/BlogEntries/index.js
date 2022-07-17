import { useEffect, useState } from "react"
import { listenAllEntries } from "@firebase/entries/main"
import BlogEntry from "./BlogEntry"
const BlogEntries = () => {
  
  const [entries, setEntries] = useState([])
  
  useEffect(() => {
    listenAllEntries(setEntries)
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
