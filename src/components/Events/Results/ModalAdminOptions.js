import { updateAwardsEventResult } from '@/firebase/events'
import AWARDS, { TEST_AWARDS } from '@/src/constants/AWARDS'
import { TrashBinIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import ButtonSave from '@comps/inputs/ButtonSave'
import DeleteModal from '@comps/Modals/DeleteModal'
import Modal from '@comps/Modals/Modal'
import { useState } from 'react'

export default function ModalAdminOptions({
  id,
  test,
  athlete,
  closeDetails = () => {}
}) {
  return (
    <>
      <div className="grid gap-4">
        <DeleteModalAdmin
          test={test}
          id={id}
          athlete={athlete}
          closeDetails={closeDetails}
        />
        <AwardModalAdmin
          test={test}
          id={id}
          athlete={athlete}
          closeDetails={closeDetails}
        />
      </div>
    </>
  )
}

const DeleteModalAdmin = ({ test, athlete, id, closeDetails }) => {
  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }
  const handleDelete = () => {
    closeDetails()
    console.log(`delete`, id)
    removeEventResult(id)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }
  return (
    <>
      <Button size="md" variant="danger" onClick={handleOpenDelete}>
        Borrar
        <TrashBinIcon />
      </Button>
      <DeleteModal
        open={openDelete}
        handleOpen={handleOpenDelete}
        handleDelete={handleDelete}
        text={''}
      >
        <div className="text-base">
          <h3>Eliminar prueba </h3>
          <div className="border my-6">
            <p>{`${test?.distance || ''} ${test?.style || ''}`}</p>
            <p>{`  ${athlete.name || ''} ${athlete.lastName || ''}`}</p>
            <p className="text-2xl font-thin m-2">{`  ${
              test.record || ''
            } `}</p>
          </div>
        </div>
      </DeleteModal>
    </>
  )
}

const AwardModalAdmin = ({ test, athlete, id, closeDetails }) => {
  const [openAwardModalAdmin, setOpenAwardModalAdmin] = useState(false)
  const handleOpenAwardModalAdmin = () => {
    setOpenAwardModalAdmin(!openAwardModalAdmin)
  }
  console.log(`test`, test)
  const [testAwards, setTestAwards] = useState(test?.awards || [])

  const handleAssingAdward = (newAward) => {
    testAwards.includes(newAward)
      ? setTestAwards(testAwards.filter((id) => id !== newAward))
      : setTestAwards([...testAwards, newAward])
    setButtonSatatus('dirty')
  }
  const awardAlreadyRecived = (award) => {
    return testAwards.includes(award)
  }
  const handleSaveAwards = () => {
    // guardar en la prueba/evento
    updateAwardsEventResult(id, testAwards)
      .then((res) => {
        setButtonSatatus('saved')
        console.log(`res`, res)
      })
      .catch((err) => console.log(`err`, err))
  }

  const [buttonSatatus, setButtonSatatus] = useState('clean')
  return (
    <>
      <Button variant="secondary" onClick={handleOpenAwardModalAdmin}>
        Premiar prueba
      </Button>
      <Modal
        open={openAwardModalAdmin}
        handleOpen={handleOpenAwardModalAdmin}
        title="Premiar prueba"
      >
        <div className="flex w-full flex-wrap justify-evenly">
          {Object.keys(TEST_AWARDS).map((award) => (
            <button
              onClick={() => handleAssingAdward(award)}
              key={award}
              className={`${
                awardAlreadyRecived(award) && 'bg-green-700'
              } text-sm  border rounded-full h-16 w-16 flex justify-center items-center m-1`}
            >
              {TEST_AWARDS[award]?.label}
            </button>
          ))}
        </div>
        <div className="text-base mt-4 flex justify-center w-1/2 mx-auto">
          <ButtonSave onClick={handleSaveAwards} status={buttonSatatus} />
        </div>
      </Modal>
    </>
  )
}
