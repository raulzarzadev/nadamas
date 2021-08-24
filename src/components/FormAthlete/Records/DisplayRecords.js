import { removeRecord } from '@/firebase/records'
import { format } from '@/src/utils/Dates'
import { GaleryIcon, TrashBinIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import UploadImage from '@comps/inputs/UploadImage'
import Modal from '@comps/Modals/Modal'
import { useState } from 'react'

export default function DisplayRecords({ records = [] , updateRecords=()=>{} }) {
  const [openGaleryModal, setOpenGaleryModal] = useState(false)
  const handleOpenGalery = (id) => {
    openGaleryModal === id ? setOpenGaleryModal(false) : setOpenGaleryModal(id)
  }

  return (
    <>
      {records?.map(({ id, date, test, time, place, image }) => (
        <div key={id} className="flex justify-between my-2">
          <div className=" hidden w-1/6 p-1">{format(date, 'dd/MMM/yy')}</div>
          <div className="hidden w-1/6  p-1">{place || '-'}</div>

          <div className="w-1/3 p-1 flex items-center justify-center ">
            {test || '-'}
          </div>
          <div className="w-1/3 p-1 flex items-center justify-center ">
            {time || '-'}
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
      ))}
    </>
  )
}
const DeleteRecordModal = ({ handleOpen, open, id, updateRecords }) => {
  const handleRemoveRecord = (id) => {
    removeRecord(id)
    updateRecords()
    handleOpen()
  }
  return (
    <Modal handleOpen={handleOpen} open={open} title="Eliminar Rgistro">
      <div>
        ¿Seguro que deseas eliminar este registro?
        <Button
          variant="danger"
          onClick={() => {
            handleRemoveRecord(id)
            handleOpen()
          }}
        >
          Eliminar
        </Button>
      </div>
    </Modal>
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
    <Modal handleOpen={handleOpen} open={open} title="Detalles">
      <div>
        <div className="text-sm">{format(date, 'dd/MMM/yy')}</div>
        <div>{test}</div>
        <div>{time}</div>
        <div className="text-sm"> {place}</div>
        <div className="my-2">
          <Button
            size="xs"
            variant="danger"
            onClick={(e) => {
              e.preventDefault()
              handleOpenDelete()
            }}
          >
            Eliminar
            <div className="ml-2">
              <TrashBinIcon />
            </div>
          </Button>
        </div>
      </div>
      <DeleteRecordModal
        updateRecords={updateRecords}
        handleOpen={() => {
          handleOpenDelete()
          handleOpen()
        }}
        open={openDelete}
        id={id}
      />
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
