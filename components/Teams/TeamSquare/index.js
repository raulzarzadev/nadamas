import Link from "next/link"

const TeamSquare = ({ team }) => {
  console.log(team)
  const { name, id, image, description, joinRequests = [], members = [], isPublic } = team
  return (
    <Link href={`/teams/${id}`}>
      <a className="border-base-100 border-2  hover:border-base-content rounded p-0.5">
        <div className=" h-40 w-28  flex flex-col justify-between" >
          <div>
            <p className=" text-xs text-right">{isPublic ? 'publico' : 'privado'}</p>

            <h3 className="text-center text-sm whitespace-nowrap  truncate">{name}</h3>
            <p className="text-xs max-h-20 overflow-auto">
              {description}
            </p>
          </div>
          <div className="text-sm text-center">
            <p>
              M:{members?.length}
            </p>
            <p>
              S:{joinRequests?.length}
            </p>
          </div>

        </div>
      </a>
    </Link>
  )
}

export default TeamSquare
