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
  return (
    <div>
      <div className="grid grid-flow-col gap-2 overflow-auto">
        <div className="grid grid-flow-col overflow-auto gap-4 p-2">
          <div className='w-28'>
            <SquareAdd onClick={() => router.push(`${ROUTES.BLOG.href}/new`)} />
          </div>
          {entries?.map(({ id, title, options: { isPublic, publishedAt } }) => (
            <Link key={id} href={`/blog/${id}`}>
              <a className="border-base-100 border-2  hover:border-base-content rounded">

                {/* <div className={`h-10 bg-center bg-cover rounded-t`} style={{ backgroundImage: `url(${image})` }} /> */}
                {/* <PreviewImage image={image} /> */}
                <div className=" h-32 w-28  flex flex-col justify-between  p-0.5" >
                  <div>
                    <p className=" text-2xs font-thin text-right">{isPublic ? `Públicado ${Dates.fromNow(publishedAt)}` : 'Privado'}</p>
                    <h3 className="font-bold text-sm whitespace-nowrap  truncate">{title}</h3>
                    <p className="text-xs max-h-20 overflow-auto">
                      {/*  {description} */}
                    </p>
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
