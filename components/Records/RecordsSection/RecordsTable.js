import { dateFormat } from '@utils/dates'
import { useState } from 'react'
import { getStyleInfo } from '../../../CONSTANTS/SWIMMING_TESTS'
import { useUser } from '../../../context/UserContext'
import formatRecord from '../../Inputs/PickerRecord/formatRecord'
import Modal from '../../Modal'
import RecordDetails from './RecordDetails'

const RecordsTable = ({ records }) => {
  const { user } = useUser()

  return (
    <div>
      <table className="mx-auto  w-full text-center">
        <thead>
          <tr>
            <td>
              Fecha
            </td>
            <td>
              Estilo
            </td>
            <td>
              Distancia
            </td>
            <td>
              Tiempo
            </td>
            <td>
              Lugar
            </td>
          </tr>
        </thead>
        <tbody className=''>
          {records.map((record) =>
            <RecordRow record={record} key={record.id} showOptions={record?.userId === user.id} />)}

        </tbody>
      </table>
    </div>
  )
}

const RecordRow = ({ record, showOptions }) => {
  const [open, setOpen] = useState(false)
  return (
    <tr className='hover:bg-base-300 bg-opacity-25 cursor-pointer ' onClick={() => {
      setOpen(!open)
    }}>
      <td>{dateFormat(record?.race?.date, 'dd MMM yy')}</td>
      <td>{getStyleInfo(record?.race?.style).largeLabel}</td>
      <td>{record?.race?.distance}m</td>
      <td>{formatRecord(record?.race?.record, { hiddenHours: true })}</td>
      <td>
        {record?.location?.name || '-'}
        {open &&
          <Modal title='Detalles ' open={open} handleOpen={() => setOpen(!open)} >
            <RecordDetails record={record} showOptions={showOptions} />
          </Modal>
        }
      </td>
    </tr>)
}

export default RecordsTable
