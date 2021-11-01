export default function TeamCard({ onClick, team }) {
  return (
    <button
      className="bg-gray-600 p-2 rounded-lg shadow-lg w-full"
      onClick={(e) => {
        e.preventDefault()
        onClick()
      }}
    >
      <h4 className="text-right">
        {team.title}{' '}
        <span className="font-thin text-sm">({team.athletes?.length})</span>
      </h4>
      <p className="font-extralight text-right">{team.coach.name}</p>
      <p className="font-extralight text-left">
        Solicitudes pendientes:{' '}
        <span className="font-normal">{team?.joinRequests?.length || '0'}</span>
      </p>
    </button>
  )
}
