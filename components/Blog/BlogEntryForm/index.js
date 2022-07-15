import { useForm } from "react-hook-form"
import TextEditor from "../TextEditor"
import { createEntry, editEntry } from '@firebase/entries/main'
import TextInput from "../../Inputs/TextInput"
import { useUser } from "../../../context/UserContext"
import ButtonIcon from "../../Inputs/Button/ButtonIcon"
import { ICONS } from "../../Icon/icon-list"
import { useEffect, useState } from "react"
import { ROUTES } from "../../../CONSTANTS/ROUTES"
import { useRouter } from "next/router"

const BlogEntryForm = ({ entry }) => {
  const router = useRouter()
  const { user } = useUser()

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: entry
  })

  const onSubmit = (data) => {
    if (entry.id) {
      console.log(entry)
      editEntry(entry.id, data).then(res => console.log(res))
    } else {
      createEntry(data).then(res => console.log(res))
    }
  }

  const handleSetEditorState = (state) => {
    setValue('content', state || '')
  }

  const isOwner = user?.id === entry?.userId

  const [formStatus, setFormStatus] = useState(
    {
      inptusDisabled: true,
      showEditButton: true,
      showSaveButton: true,
    }
  )


  useEffect(() => {
    const inEditPage = router.pathname.includes('/edit')
    setFormStatus({
      ...formStatus,
      inptusDisabled: !inEditPage,
      showEditButton: !inEditPage && isOwner,
      showSaveButton: inEditPage && isOwner
    })
  }, [])


  const {
    inptusDisabled,
    showEditButton,
    showSaveButton,
  } = formStatus

  console.log(formStatus)

  return (
    <div >
      <form id='form-new-post' onSubmit={handleSubmit(onSubmit)} className='' >

        {showSaveButton &&
          <div className="p-2 my-2 flex justify-end">
            <ButtonIcon iconName={ICONS.save} label='Guardar' />
          </div>
        }

        {showEditButton &&
          <ButtonIcon
            iconName={ICONS.edit}
            onClick={(e) => {
              e.preventDefault()
              router.push(`${ROUTES.BLOG.href}/${entry.id}/edit`)
            }} />
        }

        <label className="flex flex-col ">
          <span className="text-2xl">
            Titulo:
          </span>
          <input
            placeholder="... inicia con un titulo genial"
            className="input input-lg"
            {...register('title')}
            disabled={inptusDisabled}
          />
        </label>
        <TextEditor setJSONEditorState={handleSetEditorState} JSONContentState={entry?.content} disabled={inptusDisabled} />
      </form>
    </div>
  )
}

export default BlogEntryForm
