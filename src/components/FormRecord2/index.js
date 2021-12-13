import { getAthletes } from '@/firebase/athletes'
import { createOrUpdateRecord, removeRecord } from '@/firebase/records'
import { useAuth } from '@/src/context/AuthContext'
import { formatInputDate } from '@/src/utils/Dates'
import { SaveIcon, TrashBinIcon } from '@/src/utils/Icons'
import AthleteSimpleRow from '@comps/AthleteRow/AthleteSimpleRow'
import PickerRecord from '@comps/Athlete/Records/PickerRecord'
import Button from '@comps/inputs/Button'
import PickerTime from '@comps/inputs/PickerTime'
import SearchAthletes from '@comps/inputs/SearchAthletes'
import Text from '@comps/inputs/Text'
import Autocomplete from '@comps/inputs/TextAutocomplete'
import DeleteModal from '@comps/Modals/DeleteModal'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { addEventResult, deleteResult, deleteUserResult } from '@/firebase/results'

const swimmingStyles = [
  {
    label: 'C',
    id: 'crawl'
  },
  {
    label: 'D',
    id: 'back'
  },
  {
    label: 'P',
    id: 'breast'
  },
  {
    label: 'M',
    id: 'butterfly'
  },
  {
    label: 'CI',
    id: 'combi'
  }
]

const distances = [
  {
    label: '25',
    id: '25'
  },
  {
    label: '50',
    id: '50'
  },
  {
    label: '100',
    id: '100'
  },
  {
    label: '200',
    id: '200'
  },
  {
    label: '400',
    id: '400'
  },
  {
    label: '800',
    id: '800'
  }
]
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

  const handleChangeDistance = ({ target }) => {
    setForm({ ...form, distance: target.name })
  }
  const handleChangeStyle = ({ target }) => {
    setForm({ ...form, style: target.name })
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
      <div>
        <h5 className="font-bold">Estilo</h5>
        <div className="flex w-full justify-evenly flex-wrap">
          {swimmingStyles.map(({ label, id }) => (
            <div className="w-1/5 p-2" key={id}>
              <SelectBox
                label={label}
                name={id}
                onChange={handleChangeStyle}
                checked={form?.style === id}
              />
            </div>
          ))}
        </div>
      </div>
      <div>
        <h5 className="font-bold">Distancia</h5>
        <div className="flex w-full flex-wrap ">
          {distances.map(({ label, id }) => (
            <div className="w-1/5 p-2" key={id}>
              <SelectBox
                label={label}
                name={id}
                onChange={handleChangeDistance}
                checked={form?.distance === id}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col text-center w-full justify-evenly py-2 px-1 items-center">
        <div className="my-2">
          Tiempo
          {console.log(`form`, form)}
          <PickerRecord setValue={handleSetRecord} value={form?.record} />
        </div>
        <div className="flex justify-evenly w-full">
          <Button
            label="Regresar"
            variant="outlined"
            onClick={() => router.back()}
          />
          {saved && (
            <Button
              variant="danger"
              fullWidth={false}
              onClick={(e) => {
                e.preventDefault()
                handleOpenDelete()
              }}
            >
              Eliminar <TrashBinIcon />
            </Button>
          )}
          <Button
            disabled={!isValid}
            variant="primary"
            loading={saving}
            onClick={(e) => {
              e.preventDefault()
              handleAddRecord(form)
            }}
          >
            {saved ? 'Guardado' : 'Guardar'}
            <SaveIcon />
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

const SelectBox = ({ label, name, onChange, checked }) => (
  <label
    key={name}
    className={` 
    group
    flex
    relative
    h-full
    w-full
    justify-center
    items-center
    cursor-pointer
    shadow-lg 
    hover:shadow-sm
    bg-secondary-dark
    rounded-lg
    ${false && `opacity-40 shadow-none cursor- cursor-not-allowed`}
            `}
  >
    <input
      checked={checked}
      //disabled={disabled}
      onChange={onChange}
      className="absolute opacity-0 h-0 w-0 "
      // className={`${s.check_input} ${disabled && style[disabled]}`}
      name={name}
      type="checkbox"
    />
    <div className="text-2xl font-bold flex justify-center items-center rounded-lg checked-sibiling:bg-primary w-full ">
      {label}
    </div>
  </label>
)
