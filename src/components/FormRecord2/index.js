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

  console.log(`form record`, record)

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
    console.log(`id`, id)
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
  const handleSetRecord = (record) => {
    setForm({ ...form, record })
  }
  const isValid =
    !!form.style &&
    !!form.athlete &&
    !!form.distance &&
    form.record != '00:00.000'

  return (
    <div className="max-w-sm mx-auto pt-10 p-1">
      {searchAthlete && (
        <SearchAthletes
          athleteSelected={athleteId}
          setAthlete={handleChangeAthlete}
          AthleteRowResponse={AthleteSimpleRow}
        />
      )}
      <div>
        <Text
          onChange={handleChangeDate}
          name="date"
          type="date"
          value={formatInputDate(form.date)}
          label="Fecha"
        />
      </div>
      Estilo
      <div className="flex w-full justify-evenly py-2 px-1">
        {swimmingStyles.map((style) => (
          <label
            key={style.id}
            className={` 
            group
            flex
            relative
            h-9
            w-10
            justify-center
            items-center
            m-2
            cursor-pointer
            shadow-lg 
            hover:shadow-sm
            ${false && `opacity-40 shadow-none cursor- cursor-not-allowed`}
            `}
          >
            <input
              checked={form.style === style.id}
              //disabled={disabled}
              onChange={handleChangeStyle}
              className="absolute opacity-0 h-0 w-0 "
              // className={`${s.check_input} ${disabled && style[disabled]}`}
              name={style.id}
              type="checkbox"
            />
            <span className="text-2xl font-bold flex justify-center items-center rounded-lg checked-sibiling:bg-green-400 w-full h">
              {style.label}
            </span>
          </label>
        ))}
      </div>
      Distacia
      <div className="flex w-full justify-evenly py-2 px-1">
        {distances.map((distance) => (
          <label
            key={distance.id}
            className={` 
            group
            flex
            relative
            h-9
            w-14
            justify-center
            items-center
            m-2
            cursor-pointer
            shadow-lg 
            hover:shadow-sm
            ${false && `opacity-40 shadow-none cursor- cursor-not-allowed`}
            `}
          >
            <input
              checked={form.distance === distance.label}
              //disabled={disabled}
              onChange={handleChangeDistance}
              className="absolute opacity-0 h-0 w-0 "
              // className={`${s.check_input} ${disabled && style[disabled]}`}
              name={distance.label}
              type="checkbox"
            />
            <span className="text-2xl font-bold flex justify-center items-center rounded-lg checked-sibiling:bg-green-400 w-full h">
              {distance.label}
            </span>
          </label>
        ))}
      </div>
      <div className="sm:flex text-center w-full justify-evenly py-2 px-1 items-center">
        <div className="my-2">
          Tiempo
          <PickerRecord handleChange={handleSetRecord} value={form?.record} />
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
      {/*  <PickerRecord /> */}
      {/*  <div>
        <Autocomplete items={athletes} />
      </div> */}
    </div>
  )
}
