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
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import DisplayRecords from './DisplayRecords'

export default function Records({ athlete: { id } }) {
  useEffect(() => {
    if (id) {
      getAthleteRecords(id)
        .then(setRecords)
        .catch((err) => console.log('err', err))
    }
  }, [id])

  const [records, setRecords] = useState([])

  const handleNewRecord = () => {
    router.push(`/records/new?search=${id}`)
  }

  const [sortBy, setSortBy] = useState('record')

  useEffect(() => {
    const sorted = records.sort((a, b) => {
      if (sortBy.includes('_reverse')) {
        const sort = sortBy.split('_')[0]
        if (a[sort] > b[sort]) return -1
        if (a[sort] < b[sort]) return 1
        return 0
      } else {
        if (a[sortBy] < b[sortBy]) return -1
        if (a[sortBy] > b[sortBy]) return 1
        return 0
      }
    })

    setRecordsSorted(sorted)
  }, [sortBy, records])

  const [RecordsSorted, setRecordsSorted] = useState([])

  const handleSortBy = (field) => {
    if (field === sortBy) {
      setSortBy(`${sortBy}_reverse`)
    } else {
      setSortBy(field)
    }
  }

  return (
    <div className="">
      <div>
        <div className="w-12 mx-auto">
          <Button onClick={handleNewRecord} variant="secondary" size="sm">
            Nuevo <AddIcon />
          </Button>
        </div>

        <div className="flex justify-evenly my-2 flex-wrap  children:m-1">
          <h3>Order por:</h3>
          <Button
            label="Fecha"
            size="xs"
            iconOnly
            onClick={() => handleSortBy('date')}
          />
          <Button
            label="Estilo"
            size="xs"
            iconOnly
            onClick={() => handleSortBy('style')}
          />
          <Button
            label="Distancia"
            size="xs"
            iconOnly
            onClick={() => handleSortBy('distance')}
          />
          <Button
            label="Tiempo"
            size="xs"
            iconOnly
            onClick={() => handleSortBy('record')}
          />
        </div>

        {!records.length && <Info fullWidth text="Aun no hay pruebas" />}
        {RecordsSorted?.map((record) => (
          <RecordRow key={record.id} record={record} />
        ))}
      </div>
    </div>
  )
}

const RecordRow = ({ record: { id, date, record, style, distance } }) => {
  const router = useRouter()
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
    <div className="flex w-full justify-between my-2 py-1 hover:shadow-lg">
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
