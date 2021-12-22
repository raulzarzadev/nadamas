import { _deleteAthlete, _deleteUser } from '@/firebase/admin'
import { useAuth } from '@/src/context/AuthContext'
import useAdmin from '@/src/hooks/useAdmin'
import useCopyToClipboard from '@/src/hooks/useCopyToClipboard'
import { TrashBinIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import DeleteModal from '@comps/Modals/DeleteModal'
import { formatDistanceToNowStrict } from 'date-fns'
import { useEffect, useState } from 'react'
import { bool } from 'yup'

export default function AdminDashboard () {
  const { user } = useAuth()
  const { data } = useAdmin({ getUsers: true, getAthletes: true })
  const sortBy = (a, b) => {
    if (a.name < b.name) return 1
    if (a.name > b.name) return -1
    return 0
  }


  const columns = [
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
      fieldName: 'avatar',
    },
    {
      label: 'E@',
      title: 'email',
      onChange: (e) => console.log(e),
      fieldName: 'email',
    },
    {
      label: 'LN',
      title: 'lastName',
      onChange: (e) => console.log(e),
      fieldName: 'lastName',
    },
    {
      label: 'EM',
      title: 'emerMobile',
      onChange: (e) => console.log(e),
      fieldName: 'emerMobile',
    },
    {
      label: 'MB',
      title: 'mobile',
      onChange: (e) => console.log(e),
      fieldName: 'mobile',
    },
    {
      label: 'SC',
      title: 'schedule',
      onChange: (e) => console.log(e),
      fieldName: 'schedule',
    },
    {
      label: 'CO',
      title: 'coach',
      onChange: (e) => console.log(e),
      fieldName: 'coach',
    },
  ]
  const [filtered, setFiltered] = useState(undefined)
  const [filterBy, setFilterBy] = useState(undefined)

  useEffect(() => {
    const athletesFiltered = (filter = { field: '', value: undefined }, athletes) => {
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

  }, [filterBy, data.athletes])

  const handleSetFilter = (field, value = undefined) => {
    setFilterBy({ field, value })
  }

  /*  const handleSetFilter = (field, value = true) => {
     if (typeof value === bool) {
       if (filterBy?.value === true) {
         setFilterBy({ field, value })
       } else {
         setFilterBy({ field, value: false })
       }
     }else{
       setF
     }
   }
  */
  const [userSelected, setUserSelected] = useState(null)

  useEffect(() => {
    setUserSelected(data?.users?.find(({ id }) => id === filterBy.value))
  }, [filterBy])
  console.log(`filtered`, filtered)
  console.log(`filterBy`, filterBy)
  console.log(`userSelected`, userSelected)
  const [openDeleteUser, setOpenDeleteUser] = useState()
  const handleOpenDeleteUser = () => {
    setOpenDeleteUser(!openDeleteUser)
  }
  const handleDeleteUser = (userId) => {
    _deleteUser(userId)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }
  return (
    <div className="">
      Cantidad de usuarios Estado actual de cada usuario athleta asosciado
      cantidad de atletas
      <div>
        <div>
          Usuarios

          <div className='flex flex-wrap justify-center '>
            { data?.users?.sort(sortBy).map(user =>
              <div className={ `w-1/6 text-xs m-1 truncate ${filterBy?.value === user?.id && 'border'}` } key={ user.id } onClick={ () => handleSetFilter('userId', user.id) }>
                { user.name }
              </div>) }
          </div>
          <div>
            Usuario:
            <div className='flex'>
              <div className='w-1/12'>Coach</div>
              <div></div>
            </div>
            <div className='flex'>
              <input className='w-1/12' checked={ userSelected?.coach } type='checkbox' />
              { `${userSelected?.name} ${userSelected?.lastName || 'sin'}  ${userSelected?.email} ${userSelected?.joinedAt && formatDistanceToNowStrict(userSelected?.joinedAt)}` }
              <div>
                <Button iconOnly onClick={ handleOpenDeleteUser } size='xs' variant='danger'>
                  <TrashBinIcon />
                </Button>
                <DeleteModal handleOpen={ handleOpenDeleteUser } open={ openDeleteUser } title='Eliminar usuario' handleDelete={ () => handleDeleteUser(userSelected.value) } />
              </div>
            </div>
          </div>
        </div>
        <div>
          Atletas totales { `${data?.athletes?.length}` }
        </div>
        <div>
          Filtro { `${filtered?.length}` }
        </div>
        <div className="flex ">
          <div className="grid grid-flow-col gap-1  content-center">
            { columns.map(col =>
              <div key={ col.fieldName } className='relative group   w-8 flex justify-center items-center ' onClick={ () => handleSetFilter(col.fieldName) }>
                <label  >{ col.label }</label>
                <label className='absolute -top-5 -right-3  hidden group-hover:block bg-primary p-1 py-0.5 rounded-lg z-10'>{ col.title }</label>
              </div>
            ) }

          </div>
          <div className='relative group w-20 flex justify-center items-center ' >
            <label  >OW</label>
            <label className='absolute -top-5 -right-3  hidden group-hover:block bg-primary p-1 py-0.5 rounded-lg z-10'>owner</label>
          </div>
          <div className='relative group w-20 flex justify-center items-center '>
            <label  >Nombre</label>
            <label className='absolute -top-5 -right-3  hidden group-hover:block bg-primary p-1 py-0.5 rounded-lg z-10'>name</label>
          </div>
          <div className='relative group w-20 flex justify-center items-center '>
            <label  >ACTIONS</label>
            <label className='absolute -top-5 -right-3  hidden group-hover:block bg-primary p-1 py-0.5 rounded-lg z-10'>actions</label>
          </div>
        </div>
        <div className="flex flex-col">
          { filtered?.sort(sortBy).map((athlete) => (
            <AthleteRow key={ athlete.id } athlete={ athlete } columns={ columns } users={ data?.users } />
          )) }
        </div>
      </div>
    </div>
  )
}

const AthleteRow = ({ athlete, columns, users }) => {
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
  return <div className="flex " key={ athlete.id }>
    <div className="grid grid-flow-col gap-1 content-center">
      { columns.map(col =>
        <div className=' w-8 flex justify-center items-center'>
          <input type="checkbox" defaultChecked={ athlete[col.fieldName] }></input>
        </div>
      ) }
      <div className='w-20 truncate'>
        { users?.find(
          ({ id }) => id === athlete?.userId
        )?.name }
      </div>

    </div>
    <div
      className={ `${visible && value === athlete.id && 'border'
        } relative truncate  w-20 flex  ` }
      onClick={ () => copy(athlete.id) }
    >
      <label className='truncate'>
        { `${athlete.name} ${athlete.lastName || ''}` }
        { visible && value === athlete.id && (
          <div className="absolute -right-20 -top-2 bg-success text-dark">
            id copiado
          </div>
        ) }
      </label>
    </div>
    <div className='relative w-20 flex justify-center items-center ' >
      <Button iconOnly onClick={ handleOpenDelete } size='xs' variant='danger'>
        <TrashBinIcon />
      </Button>
      <DeleteModal handleOpen={ handleOpenDelete } open={ openDelete } title='Eliminar atleta' handleDelete={ () => handleDeleteAthlete(athlete.id) } />
    </div>
  </div>
}