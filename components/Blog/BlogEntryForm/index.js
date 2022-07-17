import { useForm } from "react-hook-form"
import TextEditor from "../TextEditor"
import { createEntry, editEntry, deleteEntry } from '@firebase/entries/main'
import { useUser } from "../../../context/UserContext"
import ButtonIcon from "../../Inputs/Button/ButtonIcon"
import { ICONS } from "../../Icon/icon-list"
import { useEffect, useState } from "react"
import { ROUTES } from "../../../CONSTANTS/ROUTES"
import { useRouter } from "next/router"
import ModalDelete from "../../Modal/ModalDelete"

const BlogEntryForm = ({ entry }) => {
  const router = useRouter()
  const { user } = useUser()

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: { title: '', ...entry }
  })

  const onSubmit = (data) => {
    if (entry.id) {
      editEntry(entry.id, data).then(res => console.log(res))
    } else {
      createEntry(data).then(res => console.log(res))
    }
  }

  const handleSetEditorState = (state) => {
    setValue('content', state || '')
  }

  const handleDeleteEntry = (id) => {
    deleteEntry(id).then(res => {
      router.replace(ROUTES.BLOG.href)
      console.log(res)
    })
  }


  const [formStatus, setFormStatus] = useState(
    {
      inptusDisabled: true,
      showEditButton: true,
      showSaveButton: true,
    }
  )


  useEffect(() => {
    const isOwner = user?.id === entry?.userId
    const inEditPage = router.pathname.includes('/edit')
    const inNewPage = router.pathname.includes('/new')
    setFormStatus({
      ...formStatus,
      inptusDisabled: !inEditPage && !inNewPage,
      showEditButton: !inEditPage && isOwner,
      showSaveButton: (inEditPage && isOwner) || inNewPage ,
      showDeleteButton: inEditPage && isOwner,
    })
  }, [user])


  const {
    inptusDisabled,
    showEditButton,
    showSaveButton,
    showDeleteButton,
  } = formStatus

  console.log(formStatus)

  return (
    <div >
      <form id='form-new-post' onSubmit={handleSubmit(onSubmit)} className='' >

        <div className="p-2 my-2 flex justify-end">
          {showSaveButton &&
            <ButtonIcon iconName={ICONS.save} label='Guardar' />
          }

          {showDeleteButton &&
            <ModalDelete handleDelete={() => handleDeleteEntry(entry?.id)} />
          }
        </div>

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
