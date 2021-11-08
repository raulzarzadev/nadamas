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
import { createOrUpdatePayment, removePayment } from '@/firebase/payments'
import { getAthlete } from '@/firebase/athletes'
export default function FormPayment({
  payment,
  paymentUpdated = () => {},
  handleClose,
  showSearchAthlete = false,
  athleteId
}) {
  const defaultFormValue = { date: new Date(), athleteId }
  const [form, setForm] = useState(defaultFormValue)
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

  useEffect(() => {
    if (id) {
      getAthlete(id).then((athlete) => {
        setForm({
          ...form,
          athleteId: athlete?.id,
          athlete: {
            id: athlete?.id,
            name: `${athlete?.name} ${athlete?.lastName}`,
            email: athlete?.email || null
          }
        })
      })
    }
  }, [id])

  const handleSetAthlete = (athlete) => {
    setForm({
      ...form,
      athleteId: athlete?.id,
      athlete: {
        id: athlete?.id,
        name: `${athlete?.name} ${athlete?.lastName}`,
        email: athlete?.email || null
      }
    })
  }
  const handleChangeQuantity = (quantity) => {
    setForm({ ...form, quantity })
  }

  const upladedImage = (url) => {
    setForm({ ...form, image: url })
  }

  const handleSavePayment = async () => {
    await createOrUpdatePayment(form)
      .then((res) => {
        paymentUpdated()
        setForm(defaultFormValue)
        setTimeout(() => {
          handleClose()
        }, 300)
      })
      .catch((err) => console.log('err', err))
  }
  const handleDeletePayment = async (id) => {
    await removePayment(id)
      .then((res) => {
        console.log(`res`, res)
        paymentUpdated()
        setTimeout(() => {
          handleClose()
        }, 300)
      })
      .catch((err) => console.log('err', err))
  }
  console.log(`form`, form)
  return (
    <div className="">
      {showSearchAthlete && (
        <SearchAthletes
          athleteSelected={id}
          AthleteRowResponse={AthleteSimpleRow}
          setAthlete={handleSetAthlete}
        />
      )}
      <Text
        onChange={handleChange}
        name="date"
        type="date"
        value={formatInputDate(form?.date)}
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

      {!!form?.image && (
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
      <div className="mt-4">
        <Button
          label="Eliminar"
          variant="danger"
          onClick={() => handleDeletePayment(form?.id)}
        />
      </div>
    </div>
  )
}
