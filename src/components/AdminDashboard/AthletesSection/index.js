import { TrashBinIcon, UpRigthIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import CopyButton from '@comps/inputs/CopyButton'
import DeleteModal from '@comps/Modals/DeleteModal'
import Modal from '@comps/Modals/Modal'
import { formatDistanceToNow } from 'date-fns'
import { useEffect, useState } from 'react'
import { OptionsMenu } from '../OptionsMenu'

export default function AthletesSection({ athletes, userSelected }) {
  const [userAthletes, setUserAthletes] = useState(undefined)

  useEffect(() => {
    let aux = athletes?.filter(({ userId }) => userId === userSelected?.id)
    setUserAthletes(aux)
  }, [userSelected])

  return (
    <div className="max-w-sm mx-auto p-2">
      <div className="grid  overflow-auto max-h-60 shadow-inner ">
        {userAthletes?.map((athlete) => (
          <AdminAthleteRow key={athlete.id} athlete={athlete} />
        ))}
      </div>
    </div>
  )
}

const AdminAthleteRow = ({ athlete: user }) => {
  const [openDeleteUser, setOpenDeleteUser] = useState()
  const handleOpenDeleteUser = () => {
    setOpenDeleteUser(!openDeleteUser)
  }
  const handleDeleteUser = (userId) => {
    console.log('delete user')
    /* _deleteUser(userId)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err)) */
  }

  const [openUserDetails, setOpenUserDetails] = useState()
  const handleOpenUserDetails = () => {
    setOpenUserDetails(!openUserDetails)
  }

  const handleUpdateOptions = (options) => {
    console.log('update options')
   /*  updateUser({ id: user.id, options }).then((res) => console.log(`res`, res)) */
  }

  return (
    <div className="">
      {user && (
        <div className="m-1">
          <button onClick={handleOpenUserDetails} className='border w-full'>
            <span className=" truncate ">
              {user?.name ?? ' '} {user?.lastName}
            </span>
          </button>
          {/*  <div className="m-1">
            <Button onClick={handleOpenUserDetails} iconOnly size="sm">
              <UpRigthIcon />
            </Button>
          </div> */}
          <Modal
            title="Información de usuario"
            open={openUserDetails}
            handleOpen={handleOpenUserDetails}
          >
            <div>
              <h3 className="text-left">Usuario</h3>
              <div className="flex items-center justify-center">
                <span className="truncate max-w-[10rem]">{user?.id}</span>
                <CopyButton value={user?.id} />
              </div>
              <div className="flex items-center justify-center">
                <span className="truncate max-w-[10rem]">{user?.name}</span>
                <CopyButton value={user?.name} />
              </div>
              <div className="flex items-center justify-center">
                <span className="truncate max-w-[10rem]">{user?.lastName}</span>
              </div>
              <div className="flex items-center justify-center">
                <span className="truncate max-w-[10rem]">{user?.email}</span>
                <CopyButton value={user?.email} />
              </div>
              <div className="">
                <span className="truncate max-w-[10rem]">
                  Joined{' '}
                  {user?.joinedAt &&
                    formatDistanceToNow(user?.joinedAt, { addSuffix: true })}
                </span>
              </div>
            </div>
            <div>
              <OptionsMenu
                options={user?.options}
                setOptions={handleUpdateOptions}
              />
            </div>
            <div className="border m-2 grid place-content-center p-2">
              <Button onClick={handleOpenDeleteUser} size="sm" variant="danger">
                Eliminar
                <TrashBinIcon />
              </Button>
              <DeleteModal
                handleOpen={handleOpenDeleteUser}
                open={openDeleteUser}
                title="Eliminar usuario"
                handleDelete={() => handleDeleteUser(user.id)}
              />
            </div>
          </Modal>
        </div>
      )}
    </div>
  )
}
/* 
div className="relative w-12 mx-1 flex justify-center items-center ">
        <Button iconOnly onClick={handleOpenDelete} size="xs" variant="danger">
          <TrashBinIcon />
        </Button>
        <DeleteModal
          handleOpen={handleOpenDelete}
          open={openDelete}
          title="Eliminar atleta"
          handleDelete={() => handleDeleteAthlete(athlete.id)}
        />
      </div>
      <div
        className={`${
          visible && value === athlete.id && 'border'
        } relative truncate  w-20 flex  `}
        onClick={() => copy(athlete.id)}
      >
        <label className="truncate">
          {`${athlete.name} ${athlete.lastName || ''}`}
          {visible && value === athlete.id && (
            <div className="absolute -right-20 -top-2 bg-success text-dark">
              id copiado
            </div>
          )}
        </label>
      </div>
      <div className="w-20 truncate">{owner?.name}</div>
      <div className="grid grid-flow-col gap-1 content-center">
        {columns.map((col) => (
          <div
            key={col.fieldName}
            className="   items-center w-[20px] min-w-fit  flex justify-center"
          >
            <input
              type="checkbox"
              defaultChecked={athlete[col.fieldName]}
            ></input>
          </div>
        ))}
      </div> */
