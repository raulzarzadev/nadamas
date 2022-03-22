import { updateUser } from '@/legasy/firebase/client'
import { AddIcon, TrashBinIcon, UpRigthIcon } from '@/legasy/src/utils/Icons'
import Button from '@/legasy/src/components/inputs/Button'
import ButtonSave from '@/legasy/src/components/inputs/ButtonSave'
import CopyButton from '@/legasy/src/components/inputs/CopyButton'
import Loading from '@/components/Loading'
import DeleteModal from '@/legasy/src/components/Modals/DeleteModal'
import Modal from '@/legasy/src/components/Modals/Modal'
import { formatDistanceToNow } from 'date-fns'
import { useEffect, useState } from 'react'
import { OptionsMenu } from '../OptionsMenu'

let render = 0

export default function UsersSection({ users, setUser = () => {} }) {
  const [userSelected, setUserSelected] = useState(null)
  const [filterBy, setFilterBy] = useState(null)
  useEffect(() => {
    setUserSelected(users?.find(({ id }) => id === filterBy?.value))
  }, [filterBy])

  useEffect(() => {
    setUser(userSelected)
  }, [userSelected])

  if (!users) return <Loading />
  return (
    <div className="">
      <UsersTable
        users={users}
        handleSetFilter={setFilterBy}
        filterBy={filterBy}
      />
      <AdminUserRow user={userSelected} />
    </div>
  )
}

const UsersTable = ({ users, handleSetFilter = () => {}, filterBy }) => {
  const sortBy = (a, b) => {
    if (a.name < b.name) return 1
    if (a.name > b.name) return -1
    return 0
  }
  return (
    <div>
      <h3>
        Usuarios: <span>({users?.length})</span>{' '}
      </h3>
      <div className="flex flex-wrap justify-center border max-h-16 overflow-y-auto  ">
        {users?.sort(sortBy).map((user) => (
          <div
            className={`relative w-1/6 text-xs m-1 truncate ${
              filterBy?.value === user?.id && 'border'
            }`}
            key={user.id}
            onClick={() => handleSetFilter({ field: 'userId', value: user.id })}
          >
            {user.name}
          </div>
        ))}
      </div>
    </div>
  )
}

const AdminUserRow = ({ user }) => {
  const [openDeleteUser, setOpenDeleteUser] = useState()
  const handleOpenDeleteUser = () => {
    setOpenDeleteUser(!openDeleteUser)
  }
  const handleDeleteUser = (userId) => {
    _deleteUser(userId)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }

  const [openUserDetails, setOpenUserDetails] = useState()
  const handleOpenUserDetails = () => {
    setOpenUserDetails(!openUserDetails)
  }

  const handleUpdateOptions = (options) => {
    updateUser({ id: user.id, options }).then((res) => console.log(`res`, res))
  }

  return (
    <div className=" h-10">
      {user && (
        <div className="text-center flex justify-center items-center">
          <span>{user?.name}</span>
          <div className="m-1">
            <Button onClick={handleOpenUserDetails} iconOnly size="sm">
              <UpRigthIcon />
            </Button>
          </div>
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
