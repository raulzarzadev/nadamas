import { _deleteAthlete, _deleteUser } from '@/firebase/admin'
import { useAuth } from '@/src/context/AuthContext'
import useAdmin from '@/src/hooks/useAdmin'
import useCopyToClipboard from '@/src/hooks/useCopyToClipboard'
import { CopyIcon, TrashBinIcon, UpRigthIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import DeleteModal from '@comps/Modals/DeleteModal'
import Modal from '@comps/Modals/Modal'
import { formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns'
import { useEffect, useState } from 'react'

export default function AdminDashboard() {
  const { data } = useAdmin({ getUsers: true, getAthletes: true })
  const sortBy = (a, b) => {
    if (a.name < b.name) return 1
    if (a.name > b.name) return -1
    return 0
  }

  const TABLE_COLUMNS = [
    {
      label: 'AC',
      title: 'Active',
      fieldName: 'active',
      onchange: (e) => console.log(`e`, e)
    },
    {
      label: 'AV',
      title: 'avatar',
      onChange: (e) => console.log(e),
      fieldName: 'avatar'
    },
    {
      label: 'E@',
      title: 'email',
      onChange: (e) => console.log(e),
      fieldName: 'email'
    },
    {
      label: 'LN',
      title: 'lastName',
      onChange: (e) => console.log(e),
      fieldName: 'lastName'
    },
    {
      label: 'EM',
      title: 'emerMobile',
      onChange: (e) => console.log(e),
      fieldName: 'emerMobile'
    },
    {
      label: 'MB',
      title: 'mobile',
      onChange: (e) => console.log(e),
      fieldName: 'mobile'
    },
    {
      label: 'SC',
      title: 'schedule',
      onChange: (e) => console.log(e),
      fieldName: 'schedule'
    },
    {
      label: 'CO',
      title: 'coach',
      onChange: (e) => console.log(e),
      fieldName: 'coach'
    }
  ]
  const [filtered, setFiltered] = useState(undefined)
  const [filterBy, setFilterBy] = useState(undefined)

  useEffect(() => {
    const athletesFiltered = (
      filter = { field: '', value: undefined },
      athletes
    ) => {
      if (filter.value === undefined) {
        return athletes?.filter((athlete) => {
          return !!athlete[filter.field]
        })
      } else {
        return athletes?.filter((athlete) => {
          return athlete[filter.field] === filter.value
        })
      }
    }
    setFiltered(athletesFiltered(filterBy, data?.athletes))
    return () => {
      setUserSelected(null)
    }
  }, [filterBy, data.athletes])

  const handleSetFilter = (field, value = undefined) => {
    setFilterBy({ field, value })
  }

  const [userSelected, setUserSelected] = useState(null)

  useEffect(() => {
    setUserSelected(data?.users?.find(({ id }) => id === filterBy?.value))
  }, [filterBy])

  return (
    <div className="">
      Cantidad de usuarios Estado actual de cada usuario athleta asosciado
      cantidad de atletas
      <div>
        <div>
          <UsersTable
            users={data?.users}
            handleSetFilter={handleSetFilter}
            filterBy={filterBy}
          />
          <div className="h-25">
            Usuario:
            {userSelected && <AdminUserRow user={userSelected} />}
          </div>
        </div>
        <div>Atletas totales {`${data?.athletes?.length}`}</div>
        <div>Filtro {`${filtered?.length}`}</div>

        <div className="flex ">
          <div className="grid grid-flow-col gap-1  content-center">
            {TABLE_COLUMNS.map((col) => (
              <div
                key={col.fieldName}
                className="relative group   w-8 flex justify-center items-center "
                onClick={() => handleSetFilter(col.fieldName)}
              >
                <label>{col.label}</label>
                <label className="absolute -top-5 -right-3  hidden group-hover:block bg-primary p-1 py-0.5 rounded-lg z-10">
                  {col.title}
                </label>
              </div>
            ))}
          </div>
          <div className="relative group w-20 flex justify-center items-center ">
            <label>OW</label>
            <label className="absolute -top-5 -right-3  hidden group-hover:block bg-primary p-1 py-0.5 rounded-lg z-10">
              owner
            </label>
          </div>
          <div className="relative group w-20 flex justify-center items-center ">
            <label>Nombre</label>
            <label className="absolute -top-5 -right-3  hidden group-hover:block bg-primary p-1 py-0.5 rounded-lg z-10">
              name
            </label>
          </div>
          <div className="relative group w-20 flex justify-center items-center ">
            <label>ACTIONS</label>
            <label className="absolute -top-5 -right-3  hidden group-hover:block bg-primary p-1 py-0.5 rounded-lg z-10">
              actions
            </label>
          </div>
        </div>
        <div className="flex flex-col">
          {filtered?.sort(sortBy).map((athlete) => (
            <AdminAthleteRow
              key={athlete.id}
              athlete={athlete}
              columns={TABLE_COLUMNS}
              users={data?.users}
            />
          ))}
        </div>
      </div>
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
            onClick={() => handleSetFilter('userId', user.id)}
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
    console.log(`userId`, userId)
    _deleteUser(userId)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }

  const [openUserDetails, setOpenUserDetails] = useState()
  const handleOpenUserDetails = () => {
    setOpenUserDetails(!openUserDetails)
  }
  const DEFAULT_OPTIONS = {
    active: true,
    coach: false
  }
  const handleChangeOptions = ({target}) => {
    console.log(`target`, target)
    
  }
  return (
    <div>
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
            <div className="flex items-center justify-center">
              {user?.id}
              <CopyButton value={user?.id} />
            </div>
            <div className="flex items-center justify-center">
              {user?.name}
              <CopyButton value={user?.name} />
            </div>
            <div className="flex items-center justify-center">
              {user?.lastName}
            </div>
            <div className="flex items-center justify-center">
              {user?.email}
              <CopyButton value={user?.email} />
            </div>
            <div className="">
              Joined{' '}
              {user?.joinedAt &&
                formatDistanceToNow(user?.joinedAt, { addSuffix: true })}
            </div>
          </div>
          <div className="border  my-2">
            Opciones
            {Object.keys(DEFAULT_OPTIONS).map((key) => {
              return (
                <div>
                  {`${key} :`}{' '}
                  <input
                    onChange={handleChangeOptions}
                    type="checkbox"
                    name={key}
                    defaultChecked={DEFAULT_OPTIONS[key]}
                  />
                </div>
              )
            })}
          </div>
          <div>
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
        {/*  
       
        */}
      </div>
    </div>
  )
}

const CopyButton = ({ value }) => {
  const [currentValor, copy, visible] = useCopyToClipboard()

  return (
    <button className="relative" onClick={() => copy(value)}>
      <CopyIcon />
      {visible && currentValor === value && (
        <div className="absolute right-0 -top-2 bg-success text-dark">
          Copiado
        </div>
      )}
    </button>
  )
}

const AdminAthleteRow = ({ athlete, columns, users }) => {
  const [value, copy, visible] = useCopyToClipboard()
  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }
  const handleDeleteAthlete = (athleteId) => {
    _deleteAthlete(athleteId)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }
  return (
    <div className="flex " key={athlete.id}>
      <div className="grid grid-flow-col gap-1 content-center">
        {columns.map((col) => (
          <div
            key={col.fieldName}
            className=" w-8 flex justify-center items-center"
          >
            <input
              type="checkbox"
              defaultChecked={athlete[col.fieldName]}
            ></input>
          </div>
        ))}
        <div className="w-20 truncate">
          {users?.find(({ id }) => id === athlete?.userId)?.name}
        </div>
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
      <div className="relative w-20 flex justify-center items-center ">
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
    </div>
  )
}
