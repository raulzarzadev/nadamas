import { formatInputDate } from '@/src/utils/Dates'
import AthleteSimpleRow from '@comps/AthleteRow/AthleteSimpleRow'
import CurrencyInput from '@comps/inputs/CurrencyInput'
import SearchAthletes from '@comps/inputs/SearchAthletes'
import Text from '@comps/inputs/Text'
import UploadImage from '@comps/inputs/UploadImage'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Button from '@comps/inputs/Button'
import { createOrUpdatePayment } from '@/firebase/payments'
export default function FormPayment({ payment }) {
  const [form, setForm] = useState({})
  const {
    query: { id }
  } = useRouter()
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  useEffect(() => {
    if (payment) {
      setForm(payment)
    }
  }, [payment])

  const handleSetAthlete = (athlete) => {
    setForm({
      ...form,
      athleteId: athlete?.id,
      athlete: {
        id: athlete?.id,
        name: `${athlete?.name} ${athlete?.lastName}`,
        email: athlete?.email
      }
    })
  }
  const handleChangeQuantity = (quantity) => {
    setForm({ ...form, quantity })
  }

  const upladedImage = (url) => {
    setForm({ ...form, image: url })
  }

  const handleSavePayment = () => {
    createOrUpdatePayment(form)
      .then((res) => console.log(res))
      .catch((err) => console.log('err', err))
  }

  return (
    <div className="">
      <SearchAthletes
        athleteSelected={id}
        AthleteRowResponse={AthleteSimpleRow}
        setAthlete={handleSetAthlete}
      />
      <Text
        onChange={handleChange}
        name="date"
        type="date"
        value={formatInputDate(form.date)}
        label="Fecha"
      />
      <CurrencyInput
        label="Cantidad"
        handleChange={handleChangeQuantity}
        value={form?.quantity}
        placeholder="Cantidad ($)"
      />
      <div className="flex justify-center items-center">
        Comprobante
        <div className=" m-4">
          <UploadImage
            upladedImage={upladedImage}
            storeRef={`payments/${form?.athleteId}-${form?.id || ''}`}
          />
        </div>
      </div>

      {form?.image && (
        <div className="relative p-4">
          <div className="relative w-full  h-52 border">
            <Image
              src={form?.image}
              layout="fill"
              objectFit="cover"
              className="absolute"
            />
          </div>
        </div>
      )}

      <Button label="Guardar" onClick={handleSavePayment} />
    </div>
  )
}
