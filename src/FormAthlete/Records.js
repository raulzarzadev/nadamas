import { updateRecord } from '@/firebase/client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import Button from '../Button'
import Modal from '../Modals/Modal'
import UploadRecordImage from '../UploadFile/UploadRecordImage'
import { format } from '../utils/Dates'
import { GaleryIcon, TrashBinIcon } from '../utils/Icons'
import s from './record.module.css'

export const Records = ({ records = [], handleRemoveRecord }) => {
  console.log('records', records)
  const [openGaleryModal, setOpenGaleryModal] = useState(false)
  const handleOpenGalery = (id) => {
    openGaleryModal === id ? setOpenGaleryModal(false) : setOpenGaleryModal(id)
  }

  return (
    <>
      {records?.map(({ id, date, test, time, place, image }) => (
        <div key={id} className={s.record_row}>
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
              open={openGaleryModal === id}
              handleOpen={handleOpenGalery}
              image={image}
            />
            <Button link onClick={() => handleOpenGalery(id)}>
              <GaleryIcon />
            </Button>
          </div>
        </div>
      ))}
    </>
  )
}
const GaleryModal = ({ open, handleOpen, id, image }) => {
  console.log('id', id)

  const handleGetImageUrl = (url) => {
    updateRecord({ id, image: url })
      .then((res) => console.log('res', res))
      .catch((err) => console.log('err', err))
  }
  return (
    <Modal title="Galeria" open={open} handleOpen={handleOpen}>
      <div className={s.galery}>
        {image && (
          <div style={{ position: 'relative', width: 300, height: 300 }}>
            <Image
              src={image}
              alt={`galery`}
              layout="fill"
              objectFit="cover"
              className={s.img}
            />
          </div>
        )}
      </div>
      <UploadRecordImage type="record" id={id} setUrl={handleGetImageUrl} />
    </Modal>
  )
}
