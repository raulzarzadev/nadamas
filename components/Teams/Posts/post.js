import { useState } from "react"
import Modal from "../../Modal"
import MainModal from "../../Modal/MainModal"
import ModalDelete from "../../Modal/ModalDelete"
import FormPost from "./formPost"

const Post = ({ post, isMemeber = false }) => {
  const [openModal, setOpenModal] = useState(false)
  const handleOpenModal = () => {
   setOpenModal(!openModal)
  }

  const { title, content, isPublic,  updatedAt, image, images } = post
  const visibility = isPublic || isMemeber

  return (
    <div className="w-44 border-2 border-transparent hover:border-base-100 rounded" onClick={handleOpenModal}>
      <p className="text-right">{isPublic ? 'Público' : 'Privado'}</p>
      <h1 className=" font-bold">{title}</h1>
      <p className="font-thin text-sm">Editado: {updatedAt}</p>
      <span className=" text-sm whitespace-pre-line">{visibility ? content?.slice(0, 100) : 'Post privado.'}</span>
      <Modal open={openModal} handleOpen={handleOpenModal} title={title}>
        <p className="text-right">{isPublic ? 'Público' : 'Privado'}</p>
        <h1 className=" font-bold">{title}</h1>
        <p className="font-thin text-sm">Editado: {updatedAt}</p>
        <span className=" text-sm whitespace-pre-line">{visibility && visibility ? content : 'Post privado.'}</span>
        <div>
         <ModalDelete />
         <MainModal title='Editar post' buttonLabel="Editar" OpenComponentType='info'>
           
           <FormPost  post={post}/>
         </MainModal>
        </div>
      </Modal>
    </div>
  )
}

export default Post
