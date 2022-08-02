import { useEffect, useState } from "react"
import { listenUserEntries } from '@firebase/entries/main'
import { SquareAdd } from "../../SquareAdd"
import Link from "next/link"
import { ROUTES } from "../../../CONSTANTS/ROUTES"
import { useRouter } from "next/router"
import { Dates } from "firebase-dates-util"
const UserBlogEntries = () => {
  const router = useRouter()
  const [entries, setEntries] = useState([])
  useEffect(() => {
    listenUserEntries(setEntries)
  }, [])
  const sortByDate = (a, b) => {
    return b?.createdAt - a?.createdAt
  }
  return (
    <div>
      <div className="grid grid-flow-col gap-2 overflow-auto">
        <div className="grid grid-flow-col overflow-auto gap-4 p-2">
          <div className='w-12'>
            <SquareAdd onClick={() => router.push(`${ROUTES.BLOG.href}/new`)} />
          </div>
          {entries?.sort(sortByDate).map(({ id, title, createdAt, updatedAt, options: { isPublic, publishedAt } = { isPublic: false, publishedAt: false } }) => (
            <Link key={id} href={`/blog/${id}`}>
              <a className="border-base-100 border-2  hover:border-base-content rounded">

                {/* <div className={`h-10 bg-center bg-cover rounded-t`} style={{ backgroundImage: `url(${image})` }} /> */}
                {/* <PreviewImage image={image} /> */}
                <div className=" h-32 w-32  flex flex-col justify-between  p-0.5" >
                  <div>
                    { }
                    <h3 className="font-bold text-xs ">{title}</h3>
                    <p className="text-xs max-h-20 overflow-auto">
                      {/*  {description} */}
                    </p>
                    <div className="text-2xs">
                      {updatedAt ? <div>Actualizado: <br />{Dates.fromNow(updatedAt)}</div> : <div>Creado: {Dates.fromNow(createdAt)}</div>}
                      {publishedAt &&
                        <p className=" ">Públicado: <br />{isPublic ? ` ${Dates.fromNow(publishedAt)}` : ''}</p>
                      }
                    </div>
                  </div>

                </div>
              </a>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}


export default UserBlogEntries
