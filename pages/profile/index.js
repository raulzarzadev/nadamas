import { useUser } from '@/context/UserContext'
import UserForm from '@comps/Forms/UserForm'
import { Head } from '@comps/Head'
import authRoute from '@comps/HOC/authRoute'
import Icon from '@comps/Icon'
import Link from '@comps/Link'
import Modal from '@comps/Modal'
import SectionUserInfo from '@comps/Profile/SectionUserInfo'

function profile() {
  const {
    user: { name, displayName, id }
  } = useUser()

  return (
    <>
      <Head title={name || displayName} />
      <>
        <SectionUserInfo userId={id} />
      </>
    </>
  )
}

const JoinTeam = () => {
  return (
    <>
      <h3 className="flex">
        Unete a un equipo{' '}
        <Link href={'/teams'}>
          <span className="ml-1 flex ">
            buscar <Icon name="search" />
          </span>
        </Link>
      </h3>
    </>
  )
}

export default authRoute(profile)
