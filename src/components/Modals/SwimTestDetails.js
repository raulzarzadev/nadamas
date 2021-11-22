import Modal from './Modal'

export default function SwimTestDetails({ result, open, handleOpen }) {
  return (
    <Modal open={open} handleOpen={handleOpen} title="Detalles de prueba">
      <div className="text-base">
        <div className="italic">{result?.date || 'no date'}</div>
        <div>{result?.event?.title}</div>
        <div className='font-bold text-lg'>{`${result?.test?.distance}m ${result?.test?.style}`}</div>
        <div className='text-2xl font-thin'>{result?.test?.record}</div>
      </div>
    </Modal>
  )
}
