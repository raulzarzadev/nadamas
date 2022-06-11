import { useState } from "react"
import Modal from "../../Modal"

const Post = ({ post, isMemeber = false }) => {
  const [openModal, setOpenModal] = useState(false)
  const handleOpenModal = () => {
   setOpenModal(!openModal)
  }
  const POST_TEST = {
    title: " Lorem dolore do laboris",
    content: `Tempor nisi in consectetur labore ipsum Lorem in sint dolor nostrud. 
    Excepteur nisi id eiusmod do nulla enim Lorem dolore do laboris sint enim. 
    Id esse enim duis conse
    Lorem culpa conse ad eiusmod sint.`,
    isPublic: isMemeber,
    createdAt: "2020-01-01",
    updatedAt: "2020-01-01",
    image: "https://picsum.photos/200/300",
    images: []

  }
  const { title, content, isPublic, createdAt, updatedAt, image, images } = post
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
      </Modal>
    </div>
  )
}

export default Post
