import { useMemo, useRef, useState } from "react"
import { createAutocomplete } from '@algolia/autocomplete-core';
import { getTags } from 'fb/tags/main'
const TEST_DATA = [
  { id: 1, label: 'foo' },
  { id: 2, label: 'doe' },
  { id: 3, label: 'main' },
]
const InputChips = ({ defaultTags = [TEST_DATA[0]], availablesTags = TEST_DATA }) => {
  const [autocompleteState, setAutoCompleteState] = useState({
    collections: [],
    isOpen: false
  })

  const autocomplete = useMemo(() => createAutocomplete({
    onStateChange: ({ state }) => setAutoCompleteState(state),
    getSources() {
      return [
        {
          sourceId: 'nadamas_chips_tags',
          // getItemInputValue: ({ item }) => item.query,
          getItems({ query }) {
            console.log(query)
            let tags = []
            return getTags().then(res => res)
            console.log(tags)
            return tags
          }
        }
      ]
    }
  }), [])
  const MAXIMUN_TAGS = 3

  const [tagText, setTagText] = useState('')
  const [tagsList, setTagsList] = useState(defaultTags || [])

  const onPrintTag = () => {
    setTagsList([...tagsList, tagText])
    clearInput()
  }

  const clearInput = () => {
    setTagText('')
  }
  const handleRemoveTag = (text) => {
    const newList = tagsList.filter(({ label }) => label !== text)
    setTagsList(newList)
  }

  const inputRef = useRef(null)
  const panelRef = useRef(null)

  const inputProps = autocomplete.getInputProps({
    inputElement: inputRef.current
  })

  return (
    <div>
      <div>
        {tagsList.map((tag) => <Tag tag={tag} onClose={handleRemoveTag} />)}
      </div>
      <input
        className='input w-full input-bordered my-4 '
        /* ref={inputRef}
        disabled={tagsList.length >= MAXIMUN_TAGS}
        value={tagText}
        onChange={({ target }) => setTagText(target.value)} */
        onKeyDown={({ code }) => {
          console.log(code)
          if (code === 'Space' || code === 'Enter') {
            {...inputProps}
            onPrintTag()
          }
        }}
      />
      {autocompleteState?.isOpen && (
        <div>
          <div ref={panelRef} {...autocomplete.getPanelProps()}>
            {autocompleteState.collections.map((collection) => {
              const { items } = collection
              return <div>
                {items.length > 0 && (
                  <ul {...autocomplete.getListProps()}>
                    {items.map(item => <AutocompleteItem key={item.id} {...item} />)}
                  </ul>
                )}
              </div>
            }
            )}
          </div>
        </div>
      )
      }
    </div >
  )
}
const AutocompleteItem = ({ id, label }) => {
  return <div>
    {label}
  </div>
}

const Tag = ({ tag, onClose = () => { }, ...props }) => {
  const { label } = tag
  return (
    <div>
      <span
        class="px-4 py-2 rounded-full text-gray-500 bg-gray-200 font-semibold text-sm flex align-center w-max cursor-pointer active:bg-gray-300 transition duration-300 ease">
        {label}
        <button class="bg-transparent hover focus:outline-none" onClick={(e) => {
          e.preventDefault()
          onClose(label)
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
