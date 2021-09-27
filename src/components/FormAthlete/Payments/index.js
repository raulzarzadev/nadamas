import Button from '@comps/inputs/Button'
import { useState } from 'react'
import Image from 'next/image'
import FormPayment from '@comps/FormPayment'
import Modal from '@comps/Modals/Modal'

const testImage =
  'https://images.unsplash.com/photo-1527656855834-0235e41779fd?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=774&q=80'

export default function Payments({ athleteId }) {
  const [payments, setPayments] = useState([
    {
      id: '1',
      athleteId: '123',
      quantity: '200',
      image: testImage,
      date: '12/23/03'
    },

    {
      id: '12',
      athleteId: '123',
      quantity: '200',
      image: testImage,
      date: '12/12/23'
    },
    {
      id: '124',
      athleteId: '123',
      quantity: '200',
      image: testImage,
      date: '12/12/23'
    },
    {
      id: '123',
      athleteId: '123',
      quantity: '200',
      image: testImage,
      date: '12/12/23'
    },
    {
      id: '123',
      athleteId: '123',
      quantity: '200',
      image: testImage,
      date: '12/12/23'
    }
  ])

  const [openNewPayment, setOpenNewPayment] = useState(false)
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

const Payment = ({ payment: { date, image } }) => (
  <div className=" relative w-20 h-12 flex items-end justify-center rounded-md ">
    <Image layout="fill" src={image} className="opacity-50 rounded-md" />
    <span className="text-sm font-bold z-10">{date}</span>
  </div>
)

const NewPaymentModal = ({ athleteId, handleOpen, open }) => {
  return (
    <Modal handleOpen={handleOpen} open={open} title={'Nuevo Pago'}>
      <FormPayment athleteId={athleteId} />
    </Modal>
  )
}
