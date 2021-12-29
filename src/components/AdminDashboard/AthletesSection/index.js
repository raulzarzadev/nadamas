import useCopyToClipboard from '@/src/hooks/useCopyToClipboard'
import { TrashBinIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import DeleteModal from '@comps/Modals/DeleteModal'
import { useEffect, useState } from 'react'

export default function AthletesSection({ athletes, userSelected }) {
  const [userAthletes, setUserAthletes] = useState(undefined)

  useEffect(() => {
    let aux = athletes?.filter(({ userId }) => userId === userSelected?.id)
    setUserAthletes(aux)
  }, [userSelected])

  return (
    <div className="">
      <AthletesTable atheltes={userAthletes} userSelected={userSelected} />
    </div>
  )
}

const AthletesTable = ({ atheltes, userSelected }) => {
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
  const handleSetFilter = () => {}
  const sortBy = (a, b) => {
    if (a.name > b.name) return 1
    if (a.name < b.name) return -1
    return 0
  }
  return (
    <div className=" ">
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
      <div className="flex flex-col">
        {atheltes?.sort(sortBy).map((athlete) => (
          <AdminAthleteRow
            key={athlete.id}
            athlete={athlete}
            columns={TABLE_COLUMNS}
            woner={userSelected}
          />
        ))}
      </div>
    </div>
  )
}

const AdminAthleteRow = ({ athlete, columns, owner }) => {
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
          {owner?.name}
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
