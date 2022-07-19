
import { useRouter } from 'next/router';
import { ROUTES } from '../../../CONSTANTS/ROUTES';
import { useUser } from '../../../context/UserContext';
import { ICONS } from '../../Icon/icon-list';
import ButtonIcon from '../../Inputs/Button/ButtonIcon';
import { draftToMarkdown } from 'markdown-draft-js';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown'
import { Dates } from 'firebase-dates-util';
import Icon from '../../Icon';

const BlogEntry = ({ entry, blocked = true }) => {

  const router = useRouter()
  const { user } = useUser()



  const { title, updatedAt, createdAt, options: { isPublic, publishedAt } = { isPublic: false, publishedAt: false } } = entry

  return (
    <div className=' bg-base-100 text-base-content pt-4 '>
      <div className=''>
        <h1 className='font-bold text-center text-xl min-h-6  bg-base-100  '>{title || ''}</h1>
        <div className='text-center flex flex-col justify-center items-center'>
          {createdAt &&
            <span className='text-sm font-thin '>
              Creado : {`${Dates.fromNow(createdAt)}`}
            </span>
          }
          {updatedAt &&
            <span className='text-sm font-thin '>
              Editado : {`${Dates.fromNow(updatedAt)}`}
            </span>
          }
          {publishedAt &&
            <span className='text-sm font-thin '>
              Publicado : {`${Dates.fromNow(publishedAt)}`}
            </span>
          }
        </div>
      </div>

      <div className='flex items-center  '>
        {blocked &&
          <div className="absolute h-60 w-full bottom-0  bg-gradient-to-t from-black to-transparent flex justify-center items-end pb-6 " >
            <button onClick={() => router.push(`${ROUTES.BLOG.href}/${entry.id}`)}>Click para ver articulo</button>
          </div>
        }

        <SideButtons entryId={entry.id} entryOwner={entry?.userId} />


        <div className={`max-h-screen ${!blocked && 'overflow-auto'}`}>
          <MarkdownEntry content={entry?.content} />
        </div>
      </div>
    </div>
  )
}

const SideButtons = ({ entryId, entryOwner }) => {
  const { user } = useUser()
  const router = useRouter()
  const isOwner = user?.id === entryOwner
  const alreadyInArticle = router.pathname === '/blog/[id]'

  return <div className='w-20 sm:w-32 h-full flex flex-col justify-center items-center sticky top-16 bottom-16 '>
    <button className='my-2' >
      <Icon name={ICONS.heart} size='xs' />
    </button>
    <button className='my-2' >
      <Icon name={ICONS.coments} size='xs' />
    </button>
    {!alreadyInArticle &&
      <button
        onClick={() => router.push(`${ROUTES.BLOG.href}/${entryId}`)}
        className='my-2'
      >
        <Icon name={ICONS.openEye} size='xs' />
      </button>
    }
    <button
      className='my-2'
      onClick={() => router.push(`${ROUTES.BLOG.href}/new`)}
    >
      <Icon name={ICONS.plus} />
    </button>
    {isOwner &&
      <button
        className='my-2'
        onClick={() => router.push(`${ROUTES.BLOG.href}/${entryId}/edit`)}
      >
        <Icon name={ICONS.edit} size='md' />
      </button>
    }
  </div>
}

const MarkdownEntry = ({ content }) => {
  const [markdown, setMarkdown] = useState()
  useEffect(() => {
    if (window) {
      const markdownString = draftToMarkdown(content);
      setMarkdown(markdownString)
    }
  }, [])

  /* const viewSizes = {
    sm: 'max-h-[10rem]',
    full: 'h-full'
  } */

  return (
    <article className='prose lg:prose-xl '>
      <div className='  '>
        <ReactMarkdown children={markdown} className={''} />

      </div>
    </article>
  )
}

export default BlogEntry
