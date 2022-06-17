import Link from "next/link"
import Image from 'next/image'
import PreviewImage from "../../PreviewImage"

const TeamSquare = ({ team }) => {
  const { name, id, image, description, joinRequests = [], members = [], isPublic } = team
  return (
    <Link href={`/teams/${id}`}>
      <a className="border-base-100 border-2  hover:border-base-content rounded">
        <div className={`h-10 bg-center bg-cover rounded-t`} style={{ backgroundImage: `url(${image})` }} />
        {/* <PreviewImage image={image} /> */}
        <div className=" h-40 w-28  flex flex-col justify-between  p-0.5" >
          <div>
            <h3 className="font-bold text-sm whitespace-nowrap  truncate">{name}</h3>
            <p className=" text-2xs font-thin text-right">{isPublic ? 'publico' : 'privado'}</p>
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
