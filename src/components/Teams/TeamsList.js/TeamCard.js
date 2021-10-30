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
    </button>
  )
}
