import { getAthleteRecords, removeRecord } from '@/firebase/records'
import { ROUTES } from '@/pages/ROUTES'
import SWIMMING_TESTS from '@/src/constants/SWIMMING_TESTS'
import { format } from '@/src/utils/Dates'
import { AddIcon } from '@/src/utils/Icons'
import Info from '@comps/Alerts/Info'
import Button from '@comps/inputs/Button'
import DeleteModal from '@comps/Modals/DeleteModal'
import Modal from '@comps/Modals/Modal'
import { es } from 'date-fns/locale'
import router from 'next/router'
import { useEffect, useState } from 'react'
import DisplayRecords from './DisplayRecords'

export default function Records({ athlete: { id } }) {
  useEffect(() => {
    getAthleteRecords(id)
      .then(setRecords)
      .catch((err) => console.log('err', err))
  }, [id])

  const [records, setRecords] = useState([])

  const handleNewRecord = () => {
    router.push(`/records/new?search=${id}`)
  }

  const sortByDate = (a, b) => {
    if (a?.date > b?.date) return -1
    if (a?.date < b?.date) return 1
    return 0
  }

  return (
    <div className="">
      <div>
        <div className="w-12 mx-auto">
          <Button onClick={handleNewRecord} variant="secondary" size="sm">
            Nuevo <AddIcon />
          </Button>
        </div>

        {!!records.length && <Info fullWidth text="Aun no hay pruebas" />}
        {records.sort(sortByDate).map((record) => (
          <RecordRow key={record.id} record={record} />
        ))}
      </div>
    </div>
  )
}

const RecordRow = ({ record: { id, date, record, style, distance } }) => {
  const getLabelStyle = (style) => {
    return SWIMMING_TESTS.find(({ id }) => id === style)?.label
  }
  const [openDetails, setOpenDetails] = useState(false)

  const handleOpenDetail = () => {
    setOpenDetails(!openDetails)
  }

  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }

  const handleDelete = () => {
    removeRecord(id)
    setOpenDelete(false)
    setOpenDetails(false)
  }
  const handleEdit = () => {
    router.push(ROUTES.records.details(id))
  }

  return (
    <div
      key={id}
      className="flex w-full justify-between my-2 py-1 hover:shadow-lg"
    >
      <div className="w-1/4 text-center ">{format(date, 'ddMMMyy')}</div>
      <div className="w-1/4 text-center">
        {distance}
        {getLabelStyle(style)}
      </div>
      <div className="w-1/4 text-center">{record}</div>

      <div className="w-1/4 flex justify-center">
        <Button
          label="ver"
          iconOnly
          size="xs"
          variant="outlined"
          onClick={handleOpenDetail}
        ></Button>
      </div>
      <Modal
        open={openDetails}
        handleOpen={handleOpenDetail}
        title="Detalles de marca"
      >
        <div>{format(date, 'ddMMMyy')}</div>
        <div>{style}</div>
        <div>{record}</div>
        <div className="grid gap-4 mt-4">
          <Button size="xs" onClick={handleEdit}>
            Editar
          </Button>
          <Button size="xs" variant="danger" onClick={handleOpenDelete}>
            Eliminar
          </Button>
        </div>
      </Modal>
      <DeleteModal
        text="Eliminar esta marca"
        title="Eliminar "
        open={openDelete}
        handleOpen={handleOpenDelete}
        handleDelete={handleDelete}
      />
    </div>
  )
}
