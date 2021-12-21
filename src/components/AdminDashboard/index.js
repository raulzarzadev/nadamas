import useAdmin from '@/src/hooks/useAdmin'
import useCopyToClipboard from '@/src/hooks/useCopyToClipboard'

export default function AdminDashboard () {
  const { data } = useAdmin({ getUsers: true, getAthletes: true })
  const sortBy = (a, b) => {
    if (a.name < b.name) return 1
    if (a.name > b.name) return -1
    return 0
  }
  const [value, copy, visible] = useCopyToClipboard()

  console.log(`data`, data)

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
  return (
    <div className="">
      Cantidad de usuarios Estado actual de cada usuario athleta asosciado
      cantidad de atletas
      <div>
        Atletas { `${data?.athletes?.length}` }
        <div className="flex flex-col">
          <div className="grid grid-flow-col gap-1 w-1/2 content-center">
            { columns.map(col =>
              <div className='relative group '>
                <label  >{ col.label }</label>
                <label className='absolute -top-5 -right-3  hidden group-hover:block bg-primary p-1 py-0.5 rounded-lg z-10'>{ col.title }</label>
              </div>
            ) }
          </div>
        </div>
        <div className="flex flex-col">

          { data?.athletes?.sort(sortBy).map((athlete) => (
            <div className="flex ">
              <div className="grid grid-flow-col gap-1 w-1/2 content-center">
                { columns.map(col =>
                  <>
                    <input type="checkbox" defaultChecked={ athlete[col.fieldName] }></input>
                  </>
                ) }

                {/*  <input
                  defaultChecked={data?.users?.find(
                    ({ id }) => id === athlete?.userId
                  )}
                  type="checkbox"
                /> */}
                { console.log(`find`, athlete.userId) }
              </div>
              <div
                className={ `${visible && value === athlete.id && 'border'
                  } relative` }
                onClick={ () => copy(athlete.id) }
              >
                { `${athlete.name} ${athlete.lastName || ''}` }
                { visible && value === athlete.id && (
                  <div className="absolute -right-20 -top-2 bg-success text-dark">
                    id copiado
                  </div>
                ) }
              </div>
            </div>
          )) }
        </div>
      </div>
    </div>
  )
}
