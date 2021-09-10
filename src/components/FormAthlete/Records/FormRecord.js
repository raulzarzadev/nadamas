import SWIMMING_TESTS from '@/src/constants/SWIMMING_TESTS'
import { formatInputDate } from '@/src/utils/Dates'
import { AddIcon, SaveIcon, TrashBinIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import Text from '@comps/inputs/Text'
import Autocomplete from '@comps/inputs/TextAutocomplete'
import { useEffect, useState } from 'react'
import PickerRecord from './PickerRecord'
import Image from 'next/image'
import Modal from '@comps/Modals/Modal'
import { useRouter } from 'next/router'
export default function FormRecord({
  handleAddRecord,
  athletes = [],
  details,
  record
}) {
  const initialState = {
    athlete: '',
    date: new Date(),
    place: 'CREA',
    test: '',
    time: '00:00.000'
  }
  const {
    query: { id: athleteId }
  } = useRouter()

  useEffect(() => {
    if (athleteId) {
      setForm({ ...form, athleteId })
    }
  }, [athleteId])
  

  const [form, setForm] = useState(record || initialState)
  const handleChange = ({ target: { value, name } }) => {
    setForm({ ...form, [name]: value })
  }
  const handleChangeRecord = (time) => {
    setForm({ ...form, time })
  }

  const handleSetTest = (test) => {
    setForm({ ...form, test })
    console.log('test', test)
  }
  const handleSetAthlete = (athlete) => {
    const athleteId = athletes.find(({ label }) => label === athlete)?.id
    setForm({ ...form, athlete, athleteId })
  }

  return (
    <div className="flex flex-wrap">
      <div className="p-1 w-full sm:w-1/2  ">
        <Text
          onChange={handleChange}
          name="date"
          type="date"
          value={formatInputDate(form.date)}
          label="Fecha"
        />
      </div>
      <div className="p-1 w-full sm:w-1/2 ">
        <Text
          onChange={handleChange}
          name="place"
          value={form?.place}
          label="Instalaciones"
        />
      </div>

      <div className="p-1  w-full   ">
        <Autocomplete
          label="Prueba"
          placeholder="Prueba"
          items={SWIMMING_TESTS}
          value={form?.test}
          onSelect={(value) => handleSetTest(value)}
          onChange={({ target: { value } }) => handleSetTest(value)}
        />
      </div>
      <div className="p-1  w-full ">
        {!details  && (
          <Autocomplete
            value={form.athlete}
            name="athlete"
            label="Buscar athleta"
            placeholder="Buscar athleta"
            items={athletes}
            onSelect={(value) => handleSetAthlete(value)}
            onChange={({ target: { value } }) => handleSetAthlete(value)}
          />
        )}
      </div>
      <div className="p-1  w-full  ">
        <PickerRecord handleChange={handleChangeRecord} />
      </div>
      <div className="my-4">
        {/* <Images
          images={[
            {
              src: 'https://images.unsplash.com/photo-1530138948699-6a75eebc9d9b?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1049&q=80'
            },
            {
              src: 'https://images.unsplash.com/photo-1530138948699-6a75eebc9d9b?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1049&q=80'
            },
            {
              src: 'https://images.unsplash.com/photo-1530138948699-6a75eebc9d9b?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1049&q=80'
            }
          ]}
        /> */}
      </div>
      <div className="p-1  w-full sm:w-1/2  mx-auto ">
        <Button
          fullWidth
          variant="primary"
          p="sm"
          onClick={(e) => {
            e.preventDefault()
            handleAddRecord(form)
            setForm(initialState)
          }}
        >
          Guardar <SaveIcon />
        </Button>
      </div>
      {details && (
        <div className="p-1 mt-8  w-1/2  mx-auto ">
          <Button
            fullWidth
            variant="danger"
            size="xs"
            onClick={(e) => {
              e.preventDefault()
              handleAddRecord(form)
              setForm(initialState)
            }}
          >
            Eliminar <TrashBinIcon />
          </Button>
        </div>
      )}
    </div>
  )
}

const Images = ({ images }) => {
  return (
    <div className="w-full max-h-full flex overflow-auto  ">
      <label className="border-4 rounded-lg border-dashed h-20 w-20 m-1 flex justify-center items-center">
        <input type="file" className="hidden" />
        <AddIcon size="4rem" />
      </label>
      <div className="flex">
        {images?.map((image, i) => (
          <ImageDisplay key={i} image={image} />
        ))}
      </div>
    </div>
  )
}

const ImageDisplay = ({ image: { src } }) => {
  const [openImage, setOpenImage] = useState(false)
  const handleOpen = () => {
    setOpenImage(!openImage)
  }
  return (
    <div>
      <div className="relative  h-20 w-20 m-1 rounded-lg " onClick={handleOpen}>
        <Image
          src={src}
          className="rounded-lg"
          layout="fill"
          objectFit="cover"
        />
      </div>
      <Modal handleOpen={handleOpen} open={openImage} title="Imagen">
        <div
          className="relative 
          w-[90%]
          h-72
         bg-gray-400"
        >
          <Image src={src} objectFit="cover" layout="fill" />
        </div>
      </Modal>
    </div>
  )
}

const DeleteRecordModal = ({ handleOpen, open, id, updateRecords }) => {
  const handleRemoveRecord = (id) => {
    removeRecord(id)
    updateRecords()
    handleOpen()
  }
  return (
    <Modal handleOpen={handleOpen} open={open} title="Eliminar Rgistro">
      <div>
        ¿Seguro que deseas eliminar este registro?
        <Button
          variant="danger"
          onClick={() => {
            handleRemoveRecord(id)
            handleOpen()
          }}
        >
          Eliminar
        </Button>
      </div>
    </Modal>
  )
}
