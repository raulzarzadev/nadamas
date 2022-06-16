import Image from "next/image"
import { useState } from "react"
import Modal from "../Modal"

const PreviewImage = ({ label = null, image = null, canOpenModal = true, previewSize = 'md', PreviewClassName }) => {
  const [openModal, setOpenModal] = useState(false)
  const handleOpenModal = () => setOpenModal(!openModal)

  const previewSizing = {
    sm: 'w-32 aspect-video',
    md: 'w-48 aspect-video',
    lg: 'w-64 aspect-video',
    xl: 'w-96 aspect-video',
    'full-w': 'w-full h-32',
  }

  return (
    <>
      {image ?
        <>
          {label && <span className="">{label}</span>}
          <div
            className={` ${previewSizing[previewSize]} ${PreviewClassName}  relative mx-auto opacity-60 hover:opacity-100 shadow-lg m-1`}
            onClick={(e) => {
              canOpenModal && handleOpenModal()
            }}
          >
            <Image src={image} layout='fill' objectFit="cover" />
          </div>
          <Modal title='Image' open={openModal} handleOpen={handleOpenModal}>
            <div className="relative w-full aspect-video mx-auto" >
              <Image src={image} layout='fill' objectFit="contain" />
            </div>
          </Modal>
        </>
        :
        <span className="italic">No image</span>
      }
    </>
  )

}

export default PreviewImage
