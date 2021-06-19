import { updateRecord } from '@/firebase/client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import Button from '../Button'
import Modal from '../Modals/Modal'
import UploadImage from '../UploadImage'
import { format } from '../utils/Dates'
import { GaleryIcon, TrashBinIcon } from '../utils/Icons'
import s from './record.module.css'

export const Records = ({ records = [], handleRemoveRecord }) => {
  const [openGaleryModal, setOpenGaleryModal] = useState(false)
  const handleOpenGalery = (id) => {
    openGaleryModal === id ? setOpenGaleryModal(false) : setOpenGaleryModal(id)
  }
  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }

  return (
    <>
      {records?.map(({ id, date, test, time, place, image }) => (
        <div key={id} className={s.record_row}>
          <div className={s.record_cell}>{format(date, 'dd/MMM/yy')}</div>
          <div className={s.record_cell}>{place || '-'}</div>
          <div className={s.record_cell}>
            <Button
              icon
              danger
              onClick={(e) => {
                e.preventDefault()
                handleOpenDelete()
              }}
            >
              <TrashBinIcon size=".8rem" />
            </Button>{' '}
          </div>
          <div className={s.record_cell}>{test || '-'}</div>
          <div className={s.record_cell}>{time || '-'}</div>
          <div className={s.record_cell}>
            <GaleryModal
              id={id}
              open={openGaleryModal === id}
              handleOpen={handleOpenGalery}
              image={image}
            />
            <Button link onClick={() => handleOpenGalery(id)}>
              <GaleryIcon />
            </Button>
          </div>
          <DeleteRecordModal
            handleOpen={handleOpenDelete}
            open={openDelete}
            id={id}
            handleRemoveRecord={handleRemoveRecord}
          />
        </div>
      ))}
    </>
  )
}
const DeleteRecordModal = ({ handleOpen, open, id, handleRemoveRecord }) => {
  return (
    <Modal handleOpen={handleOpen} open={open} title="Eliminar Rgistro">
      <div>
        ¿Seguro que deseas eliminar este registro?
        <Button danger onClick={() => handleRemoveRecord(id)}>
          Eliminar
        </Button>
      </div>
    </Modal>
  )
}
const GaleryModal = ({ open, handleOpen, id, image }) => {
  const [newImage, setNewImage] = useState(null)
  const upladedImage = (url) => {
    updateRecord({ id, image: url })
    setNewImage(url)
  }

  return (
    <Modal title="Galeria" open={open} handleOpen={handleOpen}>
      <div className={s.galery}>
        <UploadImage storeRef={`record/${id}`} upladedImage={upladedImage} />
        {(newImage || image) && (
          <div style={{ position: 'relative', width: 200, height: 200 }}>
            <Image
              src={newImage || image}
              alt={`galery`}
              layout="fill"
              objectFit="cover"
              className={s.img}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
