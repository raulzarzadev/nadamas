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
import ButtonSave from "../../Inputs/Button/ButtonSave"
import InputChips from "../../Inputs/InputChips"

const BlogEntryForm = ({ entry }) => {

  const router = useRouter()
  const { user } = useUser()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isValid } } = useForm({
    defaultValues: {
      title: '',
      userInfo: {
        id: user?.id,
        alias: user?.alias || ''
      },
      ...entry,
    }
  })

  const onSubmit = async (data) => {

    setSaving(true)
    let res
    try {
      if (entry?.id) {
        res = await editEntry(entry.id, data)
      } else {
        res = await createEntry(data)
      }
      router.push(`${ROUTES.BLOG.href}/${res?.res?.id}/edit`)
      setSaving(false)
      setSaved(true)
      console.log(res)
    } catch (error) {
      setSaving(false)
      setSaved(false)
      console.log(error)
    }

  }

  const handleSetEditorState = (state) => {
    setValue('content', state || '')
  }

  const handleDeleteEntry = (id) => {
    deleteEntry(id).then(res => {
      router.back()
      //router.replace(ROUTES.BLOG.href)
    })
  }

  const [formStatus, setFormStatus] = useState(
    {
      inptusDisabled: true,
      showEditButton: true,
      showSaveButton: true,
    }
  )

  /* 
    useEffect(() => {
      const form = watch()
      localStorage.setItem('text-editor', JSON.stringify(form))
    }, [watch()])
  
    useEffect(() => {
      const formEdited = localStorage.getItem('text-editor')
      if (formEdited) {
        const alfa = JSON.parse(formEdited)
        Object.keys(alfa).forEach((key) => {
          setValue(key, alfa[key])
        })
      }
    }, []) */



  useEffect(() => {
    const isOwner = user?.id === entry?.userId
    const inEditPage = router.pathname.includes('/edit')
    const inNewPage = router.pathname.includes('/new')
    setFormStatus({
      ...formStatus,
      inptusDisabled: !inEditPage && !inNewPage,
      showEditButton: !inEditPage && isOwner,
      showSaveButton: (inEditPage && isOwner) || inNewPage,
      showDeleteButton: inEditPage && isOwner,
    })
  }, [user])

  const {
    inptusDisabled,
    showEditButton,
    showSaveButton,
    showDeleteButton,
  } = formStatus



  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleTogglePulish = () => {
    const isPublic = watch('options.isPublic')
    if (isPublic) {
      setValue('options.isPublic', false)
      setValue('options.unpublishedAt', new Date())
    } else {
      setValue('options.isPublic', true)
      setValue('options.publishedAt', new Date())
    }
  }

  useEffect(() => {
    const subscription = watch(() => {
      setSaved(false)
    });
    return () => subscription.unsubscribe();
  }, [watch]);





  /**
    TODO save the edited form in localstorage and get it 
    TODO publis and save with the same click
   */


  return (
    <div >
      <form id='form-new-post' onSubmit={handleSubmit(onSubmit)} className='' >

        {showEditButton &&
          <ButtonIcon
            iconName={ICONS.edit}
            onClick={(e) => {
              e.preventDefault()
              router.push(`${ROUTES.BLOG.href}/${entry.id}/edit`)
            }} />
        }

        <label className="flex flex-col  ">
          <span className="text-2xl">
            Titulo:
          </span>

          <input
            placeholder="... inicia con un titulo genial "
            className="input input-lg "
            {...register('title', { required: true })}
            disabled={inptusDisabled}
          />
          <span className="font-thin">
            {errors?.title && '*Es necesario un título'}
          </span>

        </label>
        <InputChips tags={watch('tags')} setTags={tags => setValue('tags', tags)} />
        <TextEditor setContent={handleSetEditorState} content={entry?.content} disabled={inptusDisabled} />

        <div className="flex items-center  my-2 [&>*]:mr-2">

          {showSaveButton &&
            <>
              <PublishButton isPublic={watch('options.isPublic')} setIsPublic={handleTogglePulish} />


              <ButtonSave className='btn-primary ' iconName={ICONS.save} saved={saved} loading={saving} />


              {showDeleteButton &&
                <ModalDelete
                  OpenComponent={ButtonIcon}
                  iconName={ICONS.trash}
                  iconOnly
                  className='bg-transparent border-transparent'
                  handleDelete={() => handleDeleteEntry(entry?.id)}
                />
              }

            </>
          }
        </div>
      </form>
    </div>
  )
}



const PublishButton = ({ isPublic = false, setIsPublic = () => { } }) => {
  return <div>
    <ButtonIcon
      onClick={(e) => {
        e.preventDefault()
        setIsPublic(!isPublic)
      }}
      className={isPublic ? 'btn-error' : 'btn-success'}
      label={isPublic ? 'Ocultar' : 'Publicar'}
      iconName={ICONS.document}
    />
  </div>
}

export default BlogEntryForm
