import { removeRecord } from '@/firebase/records'
import SWIMMING_TESTS from '@/src/constants/SWIMMING_TESTS'
import { format } from '@/src/utils/Dates'
import { AddIcon, GaleryIcon, TrashBinIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import UploadImage from '@comps/inputs/UploadImage'
import Modal from '@comps/Modals/Modal'
import { useState } from 'react'
import FormRecord from './FormRecord'

export default function DisplayRecords({
  records = [],
  updateRecords = () => {},
  showAthlete = false
}) {
  const [openGaleryModal, setOpenGaleryModal] = useState(false)
  const handleOpenGalery = (id) => {
    openGaleryModal === id ? setOpenGaleryModal(false) : setOpenGaleryModal(id)
  }

  return (
    <>
      {records?.map(
        ({
          id,
          date,
          test,
          time,
          place,
          image,
          athlete,
          distance,
          style,
          record
        }) => (
          <div key={id} className="flex justify-between my-2">
            <div className=" hidden w-1/6 p-1">{format(date, 'dd/MMM/yy')}</div>
            <div className="hidden w-1/6  p-1">{place || '-'}</div>
            {showAthlete && (
              <div className="w-1/3 p-1 flex items-center justify-center ">
                {athlete?.name}
              </div>
            )}
            <div className="w-1/3 p-1 flex items-center justify-center ">
              {test ||
                `${distance}m ${
                  SWIMMING_TESTS.find(({ id }) => id === style)?.label
                }` ||
                '-'}
            </div>
            <div className="w-1/3 p-1 flex items-center justify-center ">
              {time || record || '-'}
            </div>
            <div className="w-1/3 p-1 flex items-center justify-center">
              <Button
                variant=""
                iconOnly
                size="xs"
                onClick={() => handleOpenGalery(id)}
              >
                Ver
              </Button>
            </div>
            <DetailsModal
              id={id}
              open={openGaleryModal === id}
              handleOpen={handleOpenGalery}
              record={{ id, date, test, time, place }}
              updateRecords={updateRecords}
            />
          </div>
        )
      )}
    </>
  )
}

const DetailsModal = ({ handleOpen, open, record, updateRecords }) => {
  const { id, date, test, time, place } = record
  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
    // handleOpen()
  }
  return (
    <Modal handleOpen={handleOpen} open={open} title="Detalles de la prueba">
      <FormRecord record={record} details handleAddRecord={updateRecords} />
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
      <div className="">
        <UploadImage storeRef={`record/${id}`} upladedImage={upladedImage} />{' '}
        */}
        {/*  {(newImage || image) && (
          <div style="">
            <Image
              src={newImage || image}
              alt={`galery`}
              layout="fill"
              objectFit="cover"
              className=""
            />
          </div>
        )}  */}
      </div>
    </Modal>
  )
}
