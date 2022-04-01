import authRoute from '@comps/HOC/authRoute'
import TeamForm from '@comps/Teams/TeamForm'

function newTeam() {
  return (
    <div className="">
      <h1 className="text-center my-2">Nuevo equipo</h1>
      <TeamForm />
    </div>
  )
}

export default authRoute(newTeam)