import { useState } from "react"
import Modal from "../../Modal"
import MainModal from "../../Modal/MainModal"
import ModalDelete from "../../Modal/ModalDelete"
import FormPost from "./formPost"
import { deletePost } from '@/firebase/posts/main'
import { useUser } from "../../../context/UserContext"
// import { Dates } from '@utils/Dates.utils'
import ButtonIcon from "../../Inputs/Button/ButtonIcon"
import Icon from "../../Icon"
import { Dates } from 'firebase-dates-util'

const PostSquare = ({ post, isMemeber = false }) => {
  const [openModal, setOpenModal] = useState(false)
  const handleOpenModal = () => {
    setOpenModal(!openModal)
  }
  const { title = '', content, isPublic, updatedAt, createdAt, image, images, id, userId } = post
  const visibility = isPublic || isMemeber
  console.log(updatedAt)
  const handleDelete = (id) => {
    deletePost(id)
      .then(res => console.log(res))
      .catch(err => console.error(err))
  }

  const { user } = useUser()
  const isOwner = userId === user?.id

  const POST_TYPE = {
    workout: <Icon name="workout" />,
    event: <Icon name="event" />,
    info: <Icon name="info" />,
  }
  return (
    <div id={`square-post-${title.split(' ').join('-').toLowerCase()}`} className="square-add w-44 border-2  hover:border-base-200 shadow-md border-base-100 rounded relative p-0.5" onClick={handleOpenModal}>
      {POST_TYPE[post?.type || 'info']}
      <p className="text-right text-xs">{isPublic ? 'Público' : 'Privado'}</p>
      <p className="font-thin text-2xs">
        Editado: {Dates.fromNow(updatedAt || createdAt)}
      </p>
      <h3 className=" font-bold">{title}</h3>

      <p className="max-h-32 overflow-y-auto">

        <span className=" text-sm whitespace-pre-line ">{visibility ? content?.slice(0, 100) : 'Post privado.'}</span>
      </p>
      <Modal open={openModal} handleOpen={handleOpenModal} title={title} >
        <div className="relative">
          {isOwner &&
            <div className="flex justify-around sticky top-8 w-full pb-2 bg-base-100">
              <ModalDelete handleDelete={() => handleDelete(id)} buttonVariant='btn' buttonLabel='Eliminar' buttonSize="sm" />
              <MainModal title='Editar post' OpenComponent={ButtonIcon} OpenComponentProps={{ iconName: 'edit', label: 'editar',id:'button-edit' }}>
                <FormPost post={post} />
              </MainModal>
            </div>
          }
          <p className="text-right">{isPublic ? 'Público' : 'Privado'}</p>
          <h1 className=" font-bold">{title}</h1>
          <p className="font-thin text-sm"> Editado: {Dates.fromNow(updatedAt || createdAt)}</p>
          <span className=" text-sm whitespace-pre-line">{visibility && visibility ? content : 'Post privado.'}</span>

        </div>
      </Modal>
    </div>
  )
}

export default PostSquare
