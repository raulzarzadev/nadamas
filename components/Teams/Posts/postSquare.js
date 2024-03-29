import { useState } from "react"
import Modal from "../../Modal"
import ModalDelete from "../../Modal/ModalDelete"
import FormPost from "./formPost"
import { deletePost } from '@/firebase/posts/main'
import { useUser } from "../../../context/UserContext"
// import { Dates } from '@utils/Dates.utils'
import ButtonIcon from "../../Inputs/Button/ButtonIcon"
import Icon from "../../Icon"
import { Dates } from 'firebase-dates-util'
import PreviewImage from "../../PreviewImage"
import { ICONS } from "../../Icon/icon-list"


const PostSquare = ({ post, isMemeber = false }) => {
  const [openModal, setOpenModal] = useState(false)
  const handleOpenModal = () => {
    setOpenModal(!openModal)
  }
  const { title = '', content, isPublic, updatedAt, createdAt, image, images, id, userId } = post
  const visibility = isPublic || isMemeber
  const handleDelete = (id) => {
    deletePost(id)
      .then(res => console.log(res))
      .catch(err => console.error(err))
  }

  const { user } = useUser()
  const isOwner = userId === user?.id

  const POST_TYPE = {
    workout: <Icon name={ICONS.workout} />,
    event: <Icon name={ICONS.event} />,
    info: <Icon name={ICONS.info} />,
  }
  const [openEditModal, setOpenEditModal] = useState(false)
  const handleOpenEditModal = () => {
    setOpenEditModal(!openEditModal)
  }
  return (
    <div id={`square-post-${title.split(' ').join('-').toLowerCase()}`} className="square-add w-44 border-2  hover:border-base-200 shadow-md border-base-100 rounded relative p-0.5" onClick={handleOpenModal}>
      <div className="relative bg-no-repeat bg-cover bg-center " style={{ backgroundImage: `url(${image})` }}>
        <div className="text-white bg-base-200 font-bold bg-opacity-70 hover:bg-opacity-0">
          <span className="">
            {POST_TYPE[post?.type || 'info']}
          </span>
          <p className="text-right text-xs" >{isPublic ? 'Público' : 'Privado'}</p>
          <p className=" text-xs">
            Editado: {Dates.fromNow(updatedAt || createdAt)}
          </p>
        </div>
      </div>
      <h3 className=" font-bold">{title}</h3>

      <p className="max-h-32 overflow-y-auto">

        <span className=" text-sm whitespace-pre-line ">{visibility ? content?.slice(0, 100) : 'Post privado.'}</span>
      </p>
      <Modal
        open={openModal}
        handleOpen={handleOpenModal}
        title={title}
        headerComponent={
          <div>
            {isOwner &&
              <div className="flex justify-around pb-2 bg-base-100 ">
                <ModalDelete handleDelete={() => handleDelete(id)} buttonVariant='btn' buttonLabel='Eliminar' buttonSize="sm" />
                <ButtonIcon iconName={ICONS.edit} label='Editar' onClick={() => handleOpenEditModal()}>
                </ButtonIcon>
              </div>
            }

          </div>
        }
      >

        <div className="relative">
          <PreviewImage image={image} />
          <p className="text-right">{isPublic ? 'Público' : 'Privado'}</p>
          <h1 className=" font-bold">{title}</h1>
          <p className="font-thin text-sm"> Editado: {Dates.fromNow(updatedAt || createdAt)}</p>
          <span className=" text-sm whitespace-pre-line">{visibility && visibility ? content : 'Post privado.'}</span>
        </div>
      </Modal>
      <Modal open={openEditModal} handleOpen={handleOpenEditModal} title='Editar' >
        <FormPost post={post} />
      </Modal>
    </div>
  )
}

export default PostSquare
