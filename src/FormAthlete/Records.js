import Image from 'next/image'
import { useState } from 'react'
import Avatar from '../Avatar'
import Button from '../Button'
import Modal from '../Modals/Modal'
import UploadFile from '../UploadFile'
import { format } from '../utils/Dates'
import { AddImageIcon, GaleryIcon, TrashBinIcon } from '../utils/Icons'
import s from './record.module.css'

export const Records = ({ records = [], handleRemoveRecord }) => {
  console.log('records', records)
  const [openGaleryModal, setOpenGaleryModal] = useState(false)
  const handleOpenGalery = () => {
    setOpenGaleryModal(!openGaleryModal)
  }
  return (
    <>
      {records?.map(({ id, date, test, time, place, image }) => (
        <div className={s.record_row}>
          <div className={s.record_cell}>{format(date, 'dd/MMM/yy')}</div>
          <div className={s.record_cell}>{test || '-'}</div>
          <div className={s.record_cell}>{time || '-'}</div>
          <div className={s.record_cell}>{place || '-'}</div>
          <div className={s.record_cell}>
            <Button
              icon
              danger
              onClick={(e) => {
                e.preventDefault()
                handleRemoveRecord(id)
              }}
            >
              <TrashBinIcon size=".8rem" />
            </Button>{' '}
          </div>
          <div className={s.record_cell}>
            <GaleryModal
              id={id}
              open={openGaleryModal}
              handleOpen={handleOpenGalery}
            />
            <Button link onClick={handleOpenGalery}>
              <GaleryIcon />
            </Button>
          </div>
        </div>
      ))}
    </>
  )
}
const GaleryModal = ({ open, handleOpen, id, images = [] }) => {
  return (
    <Modal title="Galeria" open={open} handleOpen={handleOpen}>
      <div className={s.galery}>
        {images.map((image, i) => (
          <div>
            <Image
              src={image}
              alt={`galery-${i}`}
              layout="fill"
              objectFit="cover"
              className={s.img}
            />
          </div>
        ))}
        <div>
          <UploadFile icon={<AddImageIcon/>} type={'record'} id={id} />
        </div>
      </div>
    </Modal>
  )
}
