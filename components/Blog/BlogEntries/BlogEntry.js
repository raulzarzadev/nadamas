
import { useRouter } from 'next/router';
import { ROUTES } from '../../../CONSTANTS/ROUTES';
import { Dates } from 'firebase-dates-util';
import ButtonAdd from '../../Inputs/Button/ButtonAdd';
import MarkdownEntry from './MarkdownEntry';
import SideButtons from './SideButtons';

const BlogEntry = ({ entry, blocked = true }) => {

  const router = useRouter()
  const { title, updatedAt, createdAt, options = { publishedAsAnonymous: false } } = entry

  const publishedBy = entry?.userInfo
  const { publishedAsAnonymous, publishedAt } = options

  return (
    <div className=' bg-base-100 text-base-content pt-4 my-4'>
      <div className='sticky top-0 w-full bg-base-100 z-10'>
        <h1 className='font-bold text-center text-xl min-h-6    '>{title || ''}</h1>
        <div className='text-center flex flex-col justify-center items-center'>

          {publishedAt &&
            <span className='text-sm font-thin '>
              Publicado : {`${Dates.fromNow(publishedAt)}`}
            </span>
          }

          <span className='text-sm font-thin '>
            Por : {!publishedAsAnonymous && publishedBy ? publishedBy?.alias : 'anonimo'}
          </span>
        </div>
      </div>

      <div className='flex items-center  '>
        <SideButtons
          entryId={entry.id}
          entryOwner={entry?.userId}
          lovedBy={entry?.lovedBy}
        />

        <div className={`${blocked ? 'max-h-[40vh]' : ''}`}>
          <MarkdownEntry content={entry?.content} />
        </div>
      </div>
      {blocked &&
        <div className="absolute h-60 w-full bottom-0  bg-gradient-to-t from-black to-transparent flex justify-center items-end pb-6 " >
          <button className='text-white' onClick={() => router.push(`${ROUTES.BLOG.href}/${entry.id}`)}>Click para ver articulo</button>
        </div>
      }
      <ButtonAdd
        onClick={() => router.push(`${ROUTES.BLOG.href}/new`)}
      />
    </div>
  )
}



export default BlogEntry
