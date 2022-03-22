import { formatInputDate } from '@/legasy/src/utils/Dates'
import AthleteSimpleRow from '@/legasy/src/components/AthleteRow/AthleteSimpleRow'
import CurrencyInput from '@/legasy/src/components/inputs/CurrencyInput'
import SearchAthletes from '@/legasy/src/components/inputs/SearchAthletes'
import Text from '@/legasy/src/components/inputs/Text'
import UploadImage from '@/legasy/src/components/inputs/UploadImage'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Button from '@/legasy/src/components/inputs/Button'
import { createOrUpdatePayment, removePayment } from '@/legasy/firebase/payments'
import { getAthlete } from '@/legasy/firebase/athletes'
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
        <div className=" m-2">
          <UploadImage
            upladedImage={upladedImage}
            storeRef={`payments/${form?.athleteId}-${form?.id || ''}`}
          />
        </div>
      </div>

      {!!form?.image && (
        <div className="relative my-2">
          <div className="relative w-full  h-52 shadow-xl ">
            <Image
              src={form?.image}
              layout="fill"
              objectFit="cover"
              className="absolute"
            />
          </div>
        </div>
      )}

      <div className="flex justify-evenly mt-4">
        <Button
          label="Eliminar"
          variant="danger"
          onClick={() => handleDeletePayment(form?.id)}
        />
        <Button label="Guardar" onClick={handleSavePayment} />
      </div>
    </div>
  )
}
