import { deleteResult, deleteUserResult } from '@/firebase/results'
import { ROUTES } from '@/ROUTES'
import { getStyleInfo } from '@/src/constants/SWIMMING_TESTS'
import { formatInputDate } from '@/src/utils/Dates'
import { AddIcon, CloseIcon, TrashBinIcon } from '@/src/utils/Icons'
import { averageRecordSpeed } from '@/src/utils/Records'
import Button from '@comps/inputs/Button'
import DeleteModal from '@comps/Modals/DeleteModal'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import AwardBadge from './AwardBadge'

export default function ResultsRow({ results = [] }) {
  return (
    <div className="">
      <h3 className="font-bold text-md"></h3>

      <div className="grid grid-flow-col overflow-auto gap-5 px-5 py-2">
        <NewResultCard />
        {results?.map((result) => (
          <ResultCard key={result?.id} result={result} />
        ))}
      </div>
    </div>
  )
}

const NewResultCard = () => {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(ROUTES.records.newPersonal())}
      className="relative text-base border h-full rounded-b-3xl w-24 flex flex-col justify-center items-center text-center "
    >
      Nueva prueba
      <AddIcon />
    </button>
  )
}

const ResultCard = ({ result }) => {
  const { record = '', distance, style, awards } = result?.test || {}
  const [openResultDetails, setOpenResultDetails] = useState()
  const handleOpenResultDetails = () => {
    setOpenResultDetails(!openResultDetails)
  }

  return (
    <>
      <button
        onClick={handleOpenResultDetails}
        className="relative text-base border h-full rounded-b-3xl w-24"
      >
        <header className="italic text-xs flex w-full justify-center items-center bg-red-400">
          {result.date ? formatInputDate(result?.date, 'dd MMM yy') : 'no date'}
        </header>
        <div className="absolute -top-4 -right-5">
          {awards?.map((award) => (
            <AwardBadge key={award} award={award} size="xs" />
          ))}
        </div>
        <footer className="p-1 text-sm text-center">
          <div>{`${distance}m `}</div>
          <div>{`${getStyleInfo(style)?.largeLabel}`}</div>
          <div className="text-lg font-thin">{record}</div>
          <div className="text-lg font-thin">
            {averageRecordSpeed(distance, record)}
            <span className="text-xs">ms</span>
          </div>
        </footer>
      </button>
      <ResultModal
        open={openResultDetails}
        handleOpen={handleOpenResultDetails}
        result={result}
      />
    </>
  )
}

function ResultModal({ open, handleOpen = () => {}, result }) {
  useEffect(() => {
    const a = document.getElementById(`modal-${result.id}`)

    a.addEventListener('click', (e) => {
      const { id } = e.target
      if (id === `modal-${result.id}`) handleOpen()
    })
  }, [open])

  const [openDeleteModal, setOpenDeleteModal] = useState(false)
  const handleOpenDeleteModal = () => {
    setOpenDeleteModal(!openDeleteModal)
  }
  const handleDelete = () => {
    const isEventNull = !!Object.keys(result.event).length
    if (isEventNull) {
      deleteResult(result.id)
    } else {
      deleteUserResult(result.id)
    }
  }

  const { record = '', distance, style, awards } = result?.test || {}

  return (
    <div
      className="fixed top-0 right-0 left-0 bottom-0 bg-black bg-opacity-50 z-10 flex justify-center items-center"
      id={`modal-${result.id}`}
      style={{ display: !open && 'none' }}
    >
      <div
        id="modal-content"
        className={`relative z-50 bg-white  dark:bg-primary-dark rounded-b-full  h-72 w-48 border px-2 flex flex-col justify-between items-center pb-4`}
      >
        <button className="absolute -top-6 right-0" onClick={handleOpen}>
          <CloseIcon />
        </button>
        <div>
          {result.date ? formatInputDate(result?.date, 'dd MMM yy') : 'no date'}
        </div>
        <div>{result?.event?.title || 'Registro personal'}</div>
        <div>
          {!awards?.length && 'Sin premios aún '}
          {awards?.map((award) => (
            <AwardBadge key={award} award={award} size="xs" />
          ))}
        </div>
        <div className="flex flex-wrap text-center">
          <div className="w-1/2">{distance ? `${distance}m ` : ''}</div>
          <div className="w-1/2">{`${
            getStyleInfo(style)?.largeLabel || ''
          }`}</div>
          <div className="w-1/2 text-lg font-thin">{record || ''}</div>
          <div className="w-1/2 text-lg font-thin">
            {averageRecordSpeed(distance, record)}
            <span className="text-xs">ms</span>
          </div>
        </div>
        {/*
        TODO We need include we write or validate this 
        <div>juez </div> */}
        <div>
          <Button
            iconOnly
            size="xs"
            variant="danger"
            onClick={handleOpenDeleteModal}
          >
            <TrashBinIcon size="1.2rem" />
          </Button>
        </div>
      </div>
      <DeleteModal
        open={openDeleteModal}
        handleOpen={handleOpenDeleteModal}
        handleDelete={handleDelete}
        title="Eliminar marca"
        text="Dejas de ver esta marca, pero no se eliminara del evento (si es que existe)"
      />
    </div>
  )
}
