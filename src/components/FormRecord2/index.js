import { useAuth } from '@/src/context/AuthContext'
import { formatInputDate } from '@/src/utils/Dates'
import { SaveIcon, TrashBinIcon } from '@/src/utils/Icons'
import AthleteSimpleRow from '@comps/AthleteRow/AthleteSimpleRow'
import PickerRecord from '@comps/inputs/PickerRecord'
import Button from '@comps/inputs/Button'
import SearchAthletes from '@comps/inputs/SearchAthletes'
import Text from '@comps/inputs/Text'
import DeleteModal from '@comps/Modals/DeleteModal'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import {
  addEventResult,
  deleteResult,
  deleteUserResult
} from '@/firebase/results'
import PickerTest from '@comps/inputs/PickerTest'

export default function FormRecord({ searchAthlete, record, personalRecord }) {
  useEffect(() => {
    if (record) {
      setForm(record)
    }
  }, [record])

  const initalState = { date: new Date() }

  const [form, setForm] = useState(initalState)
  const router = useRouter()
  const [athleteId, setAthleteId] = useState('')
  const { search } = router?.query
  useEffect(() => {
    if (search) setAthleteId(search)
  }, [])

  const { user } = useAuth()
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
    deleteResult(id)
      .then((res) => {
        setForm(initalState)
      })
      .catch((err) => console.log(`err`, err))
  }

  const handleAddRecord = async (newRecord) => {
    const { distance, record, style, athlete } = newRecord
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
    setSaving(false)
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

  return (
    <div className="max-w-sm mx-auto pt-3 p-1">
      <h3 className="font-bold text-2xl text-center ">Nueva prueba</h3>
      {searchAthlete && (
        <SearchAthletes
          athleteSelected={athleteId}
          setAthlete={handleChangeAthlete}
          AthleteRowResponse={AthleteSimpleRow}
        />
      )}
      <div className="my-2 flex justify-center">
        <Text
          onChange={handleChangeDate}
          name="date"
          type="date"
          value={formatInputDate(form.date)}
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
          <Button
            fullWidth
            variant="outlined"
            onClick={() => router.back()}
          >Regresar</Button>
          {saved && (
            <Button
              fullWidth
              variant="danger"
              onClick={(e) => {
                e.preventDefault()
                handleOpenDelete()
              }}
            >
              Eliminar <TrashBinIcon   />
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
            <SaveIcon   />
          </Button>
        </div>
        <DeleteModal
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
