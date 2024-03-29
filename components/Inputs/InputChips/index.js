import { useEffect, useMemo, useRef, useState } from "react"

import { getTags, createTag, callTag, uncallTag } from 'fb/tags/main'
import Tag from "../../Tag"

const MAXIMUN_TAGS = 5
const MINIMUM_TAGS = 2
const MINIMUM_TAG_LENGTH = 5

const InputChips = ({ tags = [], setTags = (tags) => { } }) => {

  const [tagText, setTagText] = useState('')
  const [tagsList, setTagsList] = useState([])
  const [_tags, _setTags] = useState([])

  useEffect(() => {
    getTags().then(_setTags)
  }, [])


  useEffect(() => {
    const tagsIds = tagsList.map(({ id }) => id)
    setTags(tagsIds)
  }, [tagsList])

  useEffect(() => {
    if (tags.length > 0) {
      const rebuildedTagsList = tags.map(tag => _tags.find(({ id }) => tag === id) || { id: tag, notFound: true })
      setTagsList(rebuildedTagsList)
    }
  }, [_tags])

  const onPrintTag = async () => {
    const formatText = tagText.replace(' ', '')
    const tag = _tags.find(({ label }) => label === formatText)
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



  const inputRef = useRef()

  const handleSelectTag = (tagId) => {
    /**
    * !FIX lost onfocus and you need to do a focus again in the intpu
    *
    */
    const tag = _tags.find(({ id }) => id === tagId)
    if (tags.length < MAXIMUN_TAGS) {
      setTagsList([...tagsList, tag])
      callTag(tagId)
      setTagText('')
    } else {
    }
  }



  const PLACEHOLDERS = {
    0: `Agrega al menos ${MINIMUM_TAGS} etiquetas`,
    1: `Agrega ${MAXIMUN_TAGS - tagsList.length} etiquetas mas`,
    2: `Maximo ${MAXIMUN_TAGS} etiquetas`
  }

  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0])

  useEffect(() => {
    const tagsQuantity = tagsList.length
    let label

    if (tagsQuantity <= 0) {
      label = PLACEHOLDERS[0]
    } else if (0 < tagsQuantity && tagsQuantity < MAXIMUN_TAGS) {
      label = PLACEHOLDERS[1]
    } else if (tagsQuantity >= MAXIMUN_TAGS) {
      label = PLACEHOLDERS[2]
    }

    setPlaceholder(label)


  }, [tagsList.length])

  const handleRemoveLastTag = () => {
    const auxList = [...tagsList]
    auxList.pop()
    setTagsList(auxList)
  }

  const [showPanel, setSowPanel] = useState(true)

  return (
    <div>
      <div className="flex my-2 ">
        <div className="flex flex-wrap w-full items-center [&>*]:mr-1 [&>*]:my-1 relative  ">
          {tagsList.map((tag) => <Tag tag={tag} onClose={handleRemoveTag} />)}
          <label className="">
            <input
              onFocus={() => setSowPanel(true)}
              onBlur={(e) => {
                // Allow panel be selectable before disappearing
                setTimeout(() => {
                  setSowPanel(false)
                }, 200)
              }}
              placeholder={placeholder}
              className='input  input-sm p-0 pl-1 h-10 bg-transparent  focus:outline-none  '
              ref={inputRef}
              // disabled={tagsList.length >= MAXIMUN_TAGS}
              value={tagText}
              onChange={({ target }) => {
                setTagText(target.value)
              }}
              onKeyDown={({ code }) => {

                const labelLength = tagText.replace(' ', '').length
                const tagsLength = tags?.length

                // Create a label when 
                // 1- type Enter or Space and the input whitout spaces is larger than MINIMUM_tAG_LENGTH
                // 2- 
                /*   
                

                console.log(code)
                   if (['Backspace'].includes(code)) {
                     handleRemoveLastTag()
                   } 
                */

                if (
                  ['Space', 'Enter'].includes(code)
                  &&
                  labelLength >= MINIMUM_TAG_LENGTH
                  &&
                  tagsLength < MAXIMUN_TAGS
                ) {
                  onPrintTag()
                }

              }}
            />
            {showPanel &&
              <AutocomleteTags tags={_tags} tagsList={tagsList} search={tagText} onSelectTag={handleSelectTag} />
            }
          </label>
        </div>
      </div>
    </div >
  )
}
const AutocomleteTags = ({ tags = [], tagsList, search, onSelectTag = (tagId) => { } }) => {

  const [searchResult, setSearchResult] = useState([])
  useEffect(() => {
    if (search.length > 0) {
      setSearchResult(tags.filter(({ label }) => label?.includes(search)).sort((a, b) => b.calls - a.calls))
    } else {
      setSearchResult([])
    }
  }, [search])

  const MAXIMUN_TAGS_LABLE = `No puedes agregar mas etiquetas!`
  return (
    <div className="bg-base-200  w-full  max-h-52 absolute z-20 left-0 right-0 overflow-auto">
      <ul className="grid gap-1  ">
        {!!searchResult.length &&
          <li>
            <p className="text-center p-1 text-xl">Etiquetas populares</p>
          </li>
        }
        {/* {tagsList.length >= MAXIMUN_TAGS && <ResultItem result={{ label: MAXIMUN_TAGS_LABLE }} isTitle />} */}
        {searchResult.map((result, i) =>
          <ResultItem result={result} disabled={tagsList.length >= MAXIMUN_TAGS} onClick={() => onSelectTag(result.id)} />
        )}
      </ul>
    </div>
  )
}

const ResultItem = ({ onClick = () => { }, disabled, result, isTitle }) => {
  return (
    <li
      className={`h-12   p-1 
      ${disabled ? ' cursor-not-allowed ' : ' cursor-pointer hover:bg-base-300  '}
      ${isTitle ? 'text-center' : ''}
      `}

      onClick={() => onClick()}
    >
      <button onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}>

        <span className={``}>
          <span>
            {`${isTitle ? '' : '#'}`}{result?.label}
          </span>
          <span className="mx-2 text-sm font-thin">
            {!isTitle ? (result?.calls || 0) : ''}
          </span>
        </span>
      </button>
      {/* <Tag tag={result} onClick={onSelectTag} hiddeCloseButton /> */}
    </li>
  )
}


export default InputChips
