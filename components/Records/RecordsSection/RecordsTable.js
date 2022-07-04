import { dateFormat } from '@utils/dates'
import formatRecord from '../../Inputs/PickerRecord/formatRecord'

const RecordsTable = ({ records }) => {
  return (
    <div>
      <table className="mx-auto  w-full">
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
        <tbody>
          {records.map((record) =>
            <tr key={record.id}>
              <td>{dateFormat(record?.race?.date, 'dd MMM yy')}</td>
              <td>{record?.race?.style}</td>
              <td>{record?.race?.distance}</td>
              <td>{formatRecord(record?.race?.record, { hiddenHours: true })}</td>
              <td>{record?.location?.name || ''}</td>
            </tr>)}

        </tbody>
      </table>
    </div>
  )
}

export default RecordsTable
