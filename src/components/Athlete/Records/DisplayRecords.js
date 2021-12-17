import SWIMMING_TESTS from '@/src/constants/SWIMMING_TESTS'
import { format } from '@/src/utils/Dates'
import FormRecord from '@comps/FormRecord2'
import Button from '@comps/inputs/Button'
import UploadImage from '@comps/inputs/UploadImage'
import Modal from '@comps/Modals/Modal'
import { useState } from 'react'

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
      {records?.map((record) => (
        <div key={record.id} className="">
          <RecordRow record={record} handleOpenGalery={handleOpenGalery} />
          <DetailsModal
            id={record.id}
            open={openGaleryModal === record.id}
            handleOpen={handleOpenGalery}
            record={record}
            updateRecords={updateRecords}
          />
        </div>
      ))}
    </>
  )
}

const RecordRow = ({
  record: {
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
  },
  showAthlete = false,
  handleOpenGalery
}) => (
  <div className='flex'>
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
  </div>
)

const DetailsModal = ({ handleOpen, open, record, updateRecords }) => {
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
