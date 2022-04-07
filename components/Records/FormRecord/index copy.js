/* import { useAuth } from '@/legasy/src/context/AuthContext'
import DeleteModal from '@/legasy/src/components/Modals/DeleteModal' */
import { useUser } from '@/context/UserContext'
import { dateFormat } from '@/utils/dates'
import Icon from '@comps/Icon'
import Button from '@comps/Inputs/Button'
import PickerRecord from '@comps/Inputs/PickerRecord'
import PickerTest from '@comps/Inputs/PickerTest'
import TextInput from '@comps/Inputs/TextInput'
import ModalDelete from '@comps/Modal/ModalDelete'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
/* import {
  addEventResult,
  deleteResult,
  deleteUserResult
} from '@/legasy/firebase/results'
import PickerTest from '@/legasy/src/components/inputs/PickerTest' */

export default function FormRecord({ record, event, personalRecord }) {
  useEffect(() => {
    if (record) {
      setForm(record)
    }
  }, [record])

  useEffect(() => {
    if (event) {
      setForm({ ...form, event })
    }
  }, [event])

  // const initalState = { date: new Date() }

  const [form, setForm] = useState(initalState)
  const router = useRouter()
  const [athleteId, setAthleteId] = useState('')
  const { search } = router?.query
  useEffect(() => {
    if (search) setAthleteId(search)
  }, [])

  const { user } = useUser()

  useEffect(() => {
    if (personalRecord)
      handleChangeAthlete({ id: user.athleteId, name: user.name })
  }, [])

  const handleSetTest = (newTest) => {
    setForm({ ...form, ...newTest })
  }

  const handleChangeAthlete = (athlete) => {
    if (athlete) {
      setForm({
        ...form,
        athleteId,
        athlete: {
          id: athlete.id,
          name: `${athlete?.name || ''} ${athlete?.lastName || ''}`
        }
      })
    } else {
      setForm({ ...form, athleteId: '', athlete: null })
    }
  }
  const handleChangeDate = ({ target }) => {
    setForm({ ...form, date: target.value })
  }
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleRemoveRecord = (id) => {
    console.log('delete record', id)
    // deleteResult(id)
  }

  const handleAddRecord = async (newRecord) => {
    console.log('add record', newRecord)
    /* const { distance, record, style, athlete } = newRecord
    const resultData = {
      eventData: null,
      athleteId: athlete.id,
      athleteData: {
        ...newRecord.athlete
      },
      test: { distance, record, style },
      date: new Date()
    }
    addEventResult(resultData)
      .then((res) => {
        setForm({ ...form, id: res?.res?.id })
        setSaved(true)
        console.log(`res`, res)
      })
      .catch((err) => console.log(`err`, err))
    setSaving(false) */
  }
  const handleSetRecord = (field, value) => {
    setForm({ ...form, [field]: value })
  }
  const isValid =
    !!form?.style &&
    !!form?.athlete &&
    !!form?.distance &&
    form?.record != '00:00.00'

  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }

  console.log(dateFormat(form?.date))

  return (
    <div className="max-w-sm mx-auto pt-3 p-1">
      {/* <h3 className="font-bold text-2xl text-center ">Nueva prueba</h3>
       */}
      <div className="my-2 flex justify-center">
        <TextInput
          onChange={handleChangeDate}
          name="date"
          type="date"
          value={dateFormat(form?.date)}
          label="Fecha"
        />
      </div>
      <PickerTest setTest={handleSetTest} />
      <div className="flex flex-col text-center w-full justify-evenly py-2 px-1 items-center">
        <div className="my-2">
          Tiempo
          <PickerRecord setValue={handleSetRecord} value={form?.record} />
        </div>
        <div className="grid gap-2 place-items-center sm:flex">
          <Button fullWidth variant="outlined" onClick={() => router.back()}>
            Regresar
          </Button>
          {saved && (
            <Button
              fullWidth
              variant="danger"
              onClick={(e) => {
                e.preventDefault()
                handleOpenDelete()
              }}
            >
              Eliminar <Icon name="trash" />
            </Button>
          )}
          <Button
            fullWidth
            disabled={!isValid}
            variant="primary"
            loading={saving}
            onClick={(e) => {
              e.preventDefault()
              handleAddRecord(form)
            }}
          >
            {saved ? 'Guardado' : 'Guardar'}
            <Icon name="save" />
          </Button>
        </div>
        <ModalDelete
          title="Eliminar"
          text="¿Eliminar esta marca?"
          open={openDelete}
          handleOpen={handleOpenDelete}
          handleDelete={() => handleRemoveRecord(form?.id)}
        />
      </div>
    </div>
  )
}
