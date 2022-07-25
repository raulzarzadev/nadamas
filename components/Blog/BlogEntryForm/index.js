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
import Modal from "../../Modal"
import ButtonSave from "../../Inputs/Button/ButtonSave"
import Icon from "../../Icon"
import Toggle from "../../Inputs/Toggle"
import InputChips from "../../Inputs/InputChips"

const BlogEntryForm = ({ entry }) => {

  const router = useRouter()
  const { user } = useUser()

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      title: '', ...entry, userInfo: {
        id: user?.id,
        alias: user?.alias || ''
      }
    }
  })

  console.log(entry)

  const onSubmit = async (data) => {
    // console.log(data)
    setSaving(true)
    let res
    try {
      if (entry?.id) {
        res = await editEntry(entry.id, data)
      } else {
        res = await createEntry(data)
      }
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
      router.replace(ROUTES.BLOG.href)
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

  const [openSaveModal, setOpenSaveModal] = useState(false)

  const handleOpenSaveModal = () => {
    setOpenSaveModal(!openSaveModal)
  }

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

  const isPublic = watch('options.isPublic')

  useEffect(() => {

    const subscription = watch(() => {
      setSaved(false)
    });

    return () => subscription.unsubscribe();

  }, [watch]);


  /**
    TODO save the edited form in localstorage and get it 
  
    useEffect(() => {
      const form = watch()
      console.log(form)
      localStorage.setItem('text-editor', JSON.stringify(form))
    }, [watch()])
  
    useEffect(() => {
      const formEdited = localStorage.getItem('text-editor')
      console.log(formEdited)
      if (formEdited) {
        const alfa = JSON.parse(formEdited)
        Object.keys(alfa).forEach((key) => {
          setValue(key, alfa[key])
        })
      }
    }, [])
   */


  return (
    <div >
      <form id='form-new-post' onSubmit={handleSubmit(onSubmit)} className='' >

        <div className="p-2 my-2 flex justify-between">

          {showDeleteButton &&
            <ModalDelete buttonLabel={'Eliminar'} buttonSize='sm' buttonVariant="btn" handleDelete={() => handleDeleteEntry(entry?.id)} />
          }

          {showSaveButton &&
            <>
              <ButtonIcon
                iconName={ICONS.save}
                label='Guardar'
                onClick={(e) => {
                  e.preventDefault()
                  handleOpenSaveModal()
                }}
              />
              <Modal open={openSaveModal} handleOpen={handleOpenSaveModal} title='Guardar entrada'>
                <div>
                  <h4 className="text-center text-xl my-4 relative w-min whitespace-nowrap mx-auto">
                    Configura tu publicación
                    <span className="absolute -top-2 -right-4">
                      <Icon name={ICONS.info} />
                    </span>
                  </h4>
                  <div className="max-w-[10rem] mx-auto">
                    <Toggle label='Publicar anonimo' {...register('options.publishedAsAnonymous')} />
                    <button
                      className={`btn btn-sm mx-auto w-full ${isPublic ? 'btn-error' : 'btn-success'} `}
                      onClick={(e) => {
                        e.preventDefault()
                        handleTogglePulish()
                      }}>
                      {isPublic ? 'Ocultar' : 'Publicar'}
                    </button>
                    <InputChips />
                    {/*    <Toggle label='Público'  {...register('options.isPublic', { value: true })} /> */}
                    <div className="flex justify-center my-2">
                      <ButtonSave className='btn-primary ' fullwidth iconName={ICONS.save} saved={saved} loading={saving} />
                    </div>
                  </div>
                </div>
              </Modal>
            </>
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

        <label className="flex flex-col  ">
          <span className="text-2xl">
            Titulo:
          </span>
          <input
            placeholder="... inicia con un titulo genial "
            className="input input-lg "
            {...register('title')}
            disabled={inptusDisabled}
          />
        </label>
        <TextEditor setContent={handleSetEditorState} content={entry?.content} disabled={inptusDisabled} />
      </form>
    </div>
  )
}

export default BlogEntryForm
