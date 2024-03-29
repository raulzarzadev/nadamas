import { getAthleteRecords, removeRecord } from '@/legasy/firebase/records'
import { ROUTES } from '@/legasy/ROUTES'
import { getStyleInfo } from '@/legasy/src/CONSTANTS/SWIMMING_TESTS'
import { format, formatInputDate } from '@/legasy/src/utils/Dates'
import { AddIcon } from '@/legasy/src/utils/Icons'
import Info from '@/legasy/src/components/Alerts/Info'
import Button from '@/legasy/src/components/inputs/Button'
import DeleteModal from '@/legasy/src/components/Modals/DeleteModal'
import Modal from '@/legasy/src/components/Modals/Modal'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function Records({ athleteId }) {
  const router = useRouter()
  useEffect(() => {
    if (athleteId) {
      getAthleteRecords(athleteId)
        .then(setRecords)
        .catch((err) => console.log('err', err))
    }
  }, [athleteId])

  const [records, setRecords] = useState([])

  const handleNewRecord = (e) => {
    e.preventDefault()
    router.push(`${ROUTES.records.new()}?search=${athleteId}`)
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
        <div className="w-12 mx-auto my-5">
          <Button
            type="button"
            onClick={handleNewRecord}
            variant="secondary"
            size="xs"
          >
            Nuevo <AddIcon />
          </Button>
        </div>

        <div className="flex justify-evenly my-2 flex-wrap  children:m-1">
          <h3>Order por:</h3>
          <Button
            type="button"
            label="Fecha"
            size="xs"
            iconOnly
            onClick={(e) => {
              e.preventDefault()
              handleSortBy('date')
            }}
          />
          <Button
            type="button"
            label="Estilo"
            size="xs"
            iconOnly
            onClick={(e) => {
              e.preventDefault()
              handleSortBy('style')
            }}
          />
          <Button
            type="button"
            label="Distancia"
            size="xs"
            iconOnly
            onClick={(e) => {
              e.preventDefault()
              handleSortBy('distance')
            }}
          />
          <Button
            type="button"
            label="Tiempo"
            size="xs"
            iconOnly
            onClick={(e) => {
              e.preventDefault()
              handleSortBy('record')
            }}
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
        {getStyleInfo(style).label}
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
        <div>{formatInputDate(date, 'ddMMMyy')}</div>
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
