
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
import { lovedEntryBy, unlovedEntryBy } from '@/firebase/entries/main'
import { getUser } from '@/firebase/users'
import Tooltip from '../../Tooltip';
import Image from 'next/image';
import PreviewImage from '../../PreviewImage';
import ButtonAdd from '../../Inputs/Button/ButtonAdd';
const BlogEntry = ({ entry, blocked = true }) => {

  const router = useRouter()
  const { user } = useUser()


  const { title, updatedAt, createdAt, options } = entry

  const hanldeLoveEntry = (boolean) => {
    if (boolean) {
      lovedEntryBy(entry.id, user.id)
    } else {
      unlovedEntryBy(entry.id, user.id)
    }
  }



  const publishedBy = entry?.userInfo
  const { publishedAsAnonymous, publishedAt } = options

  return (
    <div className=' bg-base-100 text-base-content pt-4 my-4'>
      <div className='sticky top-0 w-full bg-base-100 z-10'>
        <h1 className='font-bold text-center text-xl min-h-6    '>{title || ''}</h1>
        <div className='text-center flex flex-col justify-center items-center'>
          {/* {createdAt &&
            <span className='text-sm font-thin '>
              Creado : {`${Dates.fromNow(createdAt)}`}
            </span>
          }
          {updatedAt &&
            <span className='text-sm font-thin '>
              Editado : {`${Dates.fromNow(updatedAt)}`}
            </span>
          } */}
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
        {blocked &&
          <div className="absolute h-60 w-full bottom-0  bg-gradient-to-t from-black to-transparent flex justify-center items-end pb-6 " >
            <button className='text-white' onClick={() => router.push(`${ROUTES.BLOG.href}/${entry.id}`)}>Click para ver articulo</button>
          </div>
        }

        <SideButtons
          entryId={entry.id}
          entryOwner={entry?.userId}
          lovedBy={entry?.lovedBy}
          onLoveEntry={hanldeLoveEntry}
        />


        <div className={`${blocked ? 'max-h-[40vh]' : ''}`}>
          <MarkdownEntry content={entry?.content} />
        </div>
      </div>
      <ButtonAdd
        onClick={() => router.push(`${ROUTES.BLOG.href}/new`)}
      />
    </div>
  )
}

const SideButtons = ({ entryId, entryOwner, lovedBy = [], onLoveEntry }) => {
  const { user } = useUser()
  const router = useRouter()
  const isOwner = user?.id === entryOwner
  const alreadyInArticle = router.pathname === '/blog/[id]'
  const loved = lovedBy.includes(user?.id)
  return <div className='w-20 sm:w-32 h-full flex flex-col justify-center items-center sticky top-16 bottom-16 '>

    <div className='my-2'>

      {loved ?
        <button
          onClick={() => onLoveEntry(false)}
        >
          <Icon
            name={ICONS.heartFill}
          />
        </button>
        :
        <button
          onClick={() => onLoveEntry(true)}
        >
          <Icon
            name={ICONS.heart}
          />
        </button>
      }
      <div className='text-center -mt-2 font-bold'>
        <span>{lovedBy?.length}</span>
      </div>
    </div>
    {/*   <button className='my-2' onClick={(e) => {
      e.preventDefault()
      handleOpenComentsModal()
    }} >
      <Icon name={ICONS.coments} size='xs' />
    </button> */}
    {!alreadyInArticle &&
      <Tooltip label='Leer' side='right'>
        <button
          onClick={() => router.push(`${ROUTES.BLOG.href}/${entryId}`)}
          className='my-2'
        >
          <Icon name={ICONS.openEye} size='lg' />
        </button>
      </Tooltip>
    }

    {isOwner &&
      <button
        className='my-2'
        onClick={() => router.push(`${ROUTES.BLOG.href}/${entryId}/edit`)}
      >
        <Icon name={ICONS.edit} size='md' />
      </button>
    }
    <div>

    </div>
  </div>
}

const MarkdownEntry = ({ content }) => {
  // console.log(content)
  const [markdown, setMarkdown] = useState()
  useEffect(() => {
    if (window) {
      const markdownString = draftToMarkdown(content, {
        escapeMarkdownCharacters: true,
        entityItems: {
          IMAGE: {
            open: function (entity, block) {
              return ``;
            },
            close: function (entity) {
              return `![alt text](${entity.data.src}) `;
            }
          }
        }
      });
      setMarkdown(markdownString)
    }
  }, [])

  /* const viewSizes = {
    sm: 'max-h-[10rem]',
    full: 'h-full'
  } */

  const components = {
    //This custom renderer changes how images are rendered
    //we use it to constrain the max width of an image to its container
    img: ({
      alt,
      src,
      title,
    }) => (
      <PreviewImage  image={src} modalImageSize='full' />
    ),
  };

  return (
    <article className='prose lg:prose-xl '>
      <div className='  '>
        <ReactMarkdown
          children={markdown}
          className={''}
          components={components}
        />
      </div>
    </article>
  )
}

export default BlogEntry
