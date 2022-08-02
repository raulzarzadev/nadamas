import { useEffect, useState } from "react"
import { getTag } from 'fb/tags/main'
export default function useTags({ tagsIds = [] }) {
  console.log(tagsIds)
  const [tags, setTags] = useState()
  useEffect(() => {
    if (tagsIds.length) {
      const tagList = tagsIds.map(tagId => {

        return getTag(tagId)
      })
      Promise.all(tagList).then(res => setTags(res))
    }
  }, [])
  return { tags }
}
