import { useState } from "react"
import Modal from "../../Modal"
import MainModal from "../../Modal/MainModal"
import ModalDelete from "../../Modal/ModalDelete"
import FormPost from "./formPost"
import { deletePost } from '@/firebase/posts/main'
import { useUser } from "../../../context/UserContext"
import { Dates } from '@utils/Dates.utils'
import ButtonIcon from "../../Inputs/Button/ButtonIcon"
const PostSquare = ({ post, isMemeber = false }) => {
  const [openModal, setOpenModal] = useState(false)
  const handleOpenModal = () => {
    setOpenModal(!openModal)
  }

  const { title, content, isPublic, updatedAt, createdAt, image, images, id, userId } = post
  const visibility = isPublic || isMemeber

  const handleDelete = (id) => {
    deletePost(id)
      .then(res => console.log(res))
      .catch(err => console.error(err))
  }

  const { user } = useUser()
  const isOwner = userId === user?.id


  return (
    <div className="w-44 border-2 border-transparent hover:border-base-100 rounded relative" onClick={handleOpenModal}>
      <p className="text-right text-xs">{isPublic ? 'Público' : 'Privado'}</p>
      <h1 className=" font-bold">{title}</h1>
      <p className="font-thin text-sm">
        Editado: {Dates.fromNow(updatedAt || createdAt)}
      </p>
      <p className="max-h-32 overflow-y-auto">

        <span className=" text-sm whitespace-pre-line ">{visibility ? content?.slice(0, 100) : 'Post privado.'}</span>
      </p>
      <Modal open={openModal} handleOpen={handleOpenModal} title={title}>
        <div className="relative">
          {isOwner &&
            <div className="flex justify-around sticky top-8 w-full pb-2 bg-base-100">
              <ModalDelete handleDelete={() => handleDelete(id)} buttonVariant='btn' buttonLabel='Eliminar' buttonSize="sm" />
              <MainModal title='Editar post' OpenComponent={ButtonIcon} OpenComponentProps={{ iconName: 'edit', label: 'editar' }}>
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
