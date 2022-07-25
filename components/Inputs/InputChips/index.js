import { useEffect, useMemo, useRef, useState } from "react"

import { getTags, createTag, callTag, uncallTag } from 'fb/tags/main'

const InputChips = ({ defaultTags = null, availablesTags = [] }) => {



  const MAXIMUN_TAGS = 5
  const MINIMUM_TAG_LENGTH = 5

  const [tagText, setTagText] = useState('')
  const [tagsList, setTagsList] = useState(defaultTags || [])
  const [tags, setTags] = useState([])

  useEffect(() => {
    getTags().then(setTags)
  }, [])


  const onPrintTag = async () => {
    const formatText = tagText.replace(' ', '')
    const tag = tags.find(({ label }) => label === formatText)
    if (tag) {
      setTagsList([...tagsList, tag])
      callTag(tag.id)
    } else {
      const newTag = await createTag({ label: formatText }).then(({ res }) => res?.item)
      // callTag(newTag.id)
      setTagsList([...tagsList, newTag])
    }
    clearInput()
  }

  const clearInput = () => {
    setTagText('')
  }
  const handleRemoveTag = (tagId) => {
    const newList = tagsList.filter(({ id }) => id !== tagId)
    setTagsList(newList)
    uncallTag(tagId)
  }

  const handleSelectTag = (tagId) => {
    const tag = tags.find(({ id }) => id === tagId)
    setTagsList([...tagsList, tag])
    callTag(tagId)
    setTagText('')
  }


  const inputRef = useRef()


  return (
    <div>
      <div>
        {tagsList.map((tag) => <Tag tag={tag} onClose={handleRemoveTag} />)}
      </div>
      <input
        className='input w-full input-bordered my-4 '
        ref={inputRef}
        disabled={tagsList.length >= MAXIMUN_TAGS}
        value={tagText}
        onChange={({ target }) => setTagText(target.value)}
        onKeyDown={({ code }) => {
          if ((code === 'Space' || code === 'Enter') && tagText.length >= MINIMUM_TAG_LENGTH) {
            onPrintTag()
          }
        }}
      />
      <div>
        <AutocomleteTags tags={tags} search={tagText} onSelectTag={handleSelectTag} />
      </div>

    </div >
  )
}
const AutocomleteTags = ({ tags = [], search, onSelectTag = (tagId) => { } }) => {

  const [searchResult, setSearchResult] = useState([])
  useEffect(() => {
    if (search.length > 2) {
      setSearchResult(tags.filter(({ label }) => label?.includes(search)))
    } else {
      setSearchResult([])
    }
  }, [search])

  return (
    <div>
      <ul>
        {searchResult.map((result, i) =>
          <li >
            <button onClick={() => onSelectTag(result.id)}>
              {result.label}
            </button>
          </li>
        )}
      </ul>
    </div >
  )
}


const Tag = ({ tag, onClose = (tagId) => { }, ...props }) => {
  console.log(tag)
  const { label, id } = tag
  return (
    <div>
      <span
        class="px-4 py-2 rounded-full text-gray-500 bg-gray-200 font-semibold text-sm flex align-center w-max cursor-pointer active:bg-gray-300 transition duration-300 ease">
        {label}
        <button class="bg-transparent hover focus:outline-none" onClick={(e) => {
          e.preventDefault()
          onClose(id)
        }}>
          <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="times"
            class="w-3 ml-3" role="img" xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 352 512">
            <path fill="currentColor"
              d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z">
            </path>
          </svg>
        </button>
      </span>
    </div>
  )
}

export default InputChips
