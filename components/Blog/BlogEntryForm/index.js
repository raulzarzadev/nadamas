import { useForm } from "react-hook-form"
import TextEditor from "../TextEditor"
import { createEntry, editEntry } from '@firebase/entries/main'
import TextInput from "../../Inputs/TextInput"
import { useUser } from "../../../context/UserContext"

const BlogEntryForm = ({ entry }) => {
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
  

  return (
    <div >
      <form id='form-new-post' onSubmit={handleSubmit(onSubmit)} className='' >
        <label className="flex flex-col ">
          <span className="text-2xl">
            Titulo:
          </span>
          <input
            placeholder="...inicia con un titulo genial"
            className="input input-lg"
            {...register('title')}
            disabled={!isOwner}
          />
        </label>
        <TextEditor setJSONEditorState={handleSetEditorState} JSONContentState={entry?.content} editable={isOwner} />
        <button className="btn btn-primary">Save</button>
      </form>
    </div>
  )
}

export default BlogEntryForm
