import Button from '@comps/inputs/Button'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import FormPayment from '@comps/FormPayment'
import Modal from '@comps/Modals/Modal'
import { getAthletePayments } from '@/firebase/payments'
import { format } from '@/src/utils/Dates'

export default function Payments({ athleteId }) {
  const [payments, setPayments] = useState([])
  useEffect(() => {
    if (athleteId) {
      getAthletePayments(athleteId)
        .then((res) => {
          setPayments(res?.sort(paymentDateSort))
        })
        .catch((err) => console.log('err', err))
    }
  }, [athleteId])

  const [openNewPayment, setOpenNewPayment] = useState(false)
  const paymentDateSort = (a, b) => {
    console.log('a,b', a, b)

    if (a.date > b.date) return -1
    if (a.date < b.date) return 1
    return 0
  }
  return (
    <div className="p-2 flex max-w-full overflow-auto">
      <div className="m-2">
        <div
          className="w-12 h-12 border flex justify-center items-center "
          onClick={() => setOpenNewPayment(true)}
        >
          <span className="text-sm">+</span>
        </div>
        <NewPaymentModal
          athleteId={athleteId}
          handleOpen={() => setOpenNewPayment(!openNewPayment)}
          open={openNewPayment}
        />
      </div>
      {payments.map((payment, i) => (
        <div key={i} className="m-2">
          <Payment key={payment.id} payment={payment} />
        </div>
      ))}
    </div>
  )
}

const Payment = ({ payment }) => {
  const [open, setOpen] = useState(false)
  const handleOpen = () => {
    setOpen(!open)
  }
  return (
    <div>
      <div onClick={handleOpen} className="shadow-md">
        <div className="relative w-20 h-12 flex items-end justify-center rounded-md">
          <Image
            layout="fill"
            src={payment?.image}
            className="opacity-50 rounded-md"
          />
          <span className="text-sm font-bold z-10">
            {format(payment?.date, 'dd/MM/yy')}
          </span>
        </div>
      </div>
      <DetailsPaymentModal
        payment={payment}
        handleOpen={handleOpen}
        open={open}
      />
    </div>
  )
}

const DetailsPaymentModal = ({ handleOpen, open, payment }) => {
  return (
    <Modal handleOpen={handleOpen} open={open} title={'Detalles de pago'}>
      <FormPayment payment={payment} />
    </Modal>
  )
}
const NewPaymentModal = ({ athleteId, handleOpen, open }) => {
  return (
    <Modal handleOpen={handleOpen} open={open} title={'Nuevo Pago'}>
      <FormPayment athleteId={athleteId} />
    </Modal>
  )
}
