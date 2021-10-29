import { getAthletes } from '@/firebase/athletes'
import { createOrUpdateRecord, removeRecord } from '@/firebase/records'
import { useAuth } from '@/src/context/AuthContext'
import { formatInputDate } from '@/src/utils/Dates'
import { SaveIcon, TrashBinIcon } from '@/src/utils/Icons'
import AthleteSimpleRow from '@comps/AthleteRow/AthleteSimpleRow'
import PickerRecord from '@comps/FormAthlete/Records/PickerRecord'
import Button from '@comps/inputs/Button'
import PickerTime from '@comps/inputs/PickerTime'
import SearchAthletes from '@comps/inputs/SearchAthletes'
import Text from '@comps/inputs/Text'
import Autocomplete from '@comps/inputs/TextAutocomplete'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

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
export default function FormRecord({
  searchAthlete,
  record,
  callback = () => {}
}) {
  useEffect(() => {
    if (record) {
      setForm(record)
    }
  }, [record])

  const [form, setForm] = useState({ date: new Date() })
  const router = useRouter()
  const athleteId = router?.query?.search

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
          name: `${athlete?.name} ${athlete?.lastName}`
        }
      })
    } else {
      setForm({ ...form, athleteId: '', athlete: null })
    }
  }
  const handleChangeDate = ({ target }) => {
    setForm({ ...form, date: target.value })
  }
  const [saving, setSaving] = useState(false)
  const handleRemoveRecord = (id) => {
    removeRecord(id)
      .then((res) => {
        callback()
      })
      .catch((err) => console.log(`err`, err))
  }
  const handleAddRecord = async (newRecord) => {
    setSaving(true)
    await createOrUpdateRecord({
      ...newRecord,
      athleteId: newRecord.athlete.id
    })
      .then((res) => console.log('res', res))
      .catch((err) => console.log('err', err))
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

  // console.log(`form`, form)

  return (
    <div className="max-w-sm mx-auto pt-3 p-1">
      <h3 className="font-bold text-2xl text-center my-3">
        Detalles de prueba
      </h3>
      {searchAthlete && (
        <SearchAthletes
          athleteSelected={athleteId}
          setAthlete={handleChangeAthlete}
          AthleteRowResponse={AthleteSimpleRow}
        />
      )}
      <div className="my-6">
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
            <div className="w-1/5 p-2">
              <SelectBox
                label={label}
                name={id}
                onChange={handleChangeDistance}
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
            <div className="w-1/5 p-2">
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
      <div className="sm:flex text-center w-full justify-evenly py-2 px-1 items-center">
        <div className="my-2">
          Tiempo
          <PickerRecord setValue={handleSetRecord} value={form?.record} />
        </div>
        <div className="grid gap-2">
          <Button
            disabled={!isValid}
            variant="primary"
            loading={saving}
            onClick={(e) => {
              e.preventDefault()
              handleAddRecord(form)
            }}
          >
            Guardar <SaveIcon />
          </Button>
          <Button
            variant="danger"
            size="sm"
            fullWidth={false}
            onClick={(e) => {
              e.preventDefault()
              handleRemoveRecord(form?.id)
            }}
          >
            Eliminar <TrashBinIcon />
          </Button>
        </div>
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
            bg-gray-600
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
      name={label}
      type="checkbox"
    />
    <div className="text-2xl font-bold flex justify-center items-center rounded-lg checked-sibiling:bg-green-400 w-full ">
      {label}
    </div>
  </label>
)
