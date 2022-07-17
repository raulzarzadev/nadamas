
import { useRouter } from 'next/router';
import { ROUTES } from '../../../CONSTANTS/ROUTES';
import { useUser } from '../../../context/UserContext';
import TextEditor from '../TextEditor';
import { ICONS } from '../../Icon/icon-list';
import ButtonIcon from '../../Inputs/Button/ButtonIcon';
import { draftToMarkdown } from 'markdown-draft-js';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown'
import { Dates } from 'firebase-dates-util';
import Icon from '../../Icon';

const BlogEntry = ({ entry, size }) => {

  const router = useRouter()

  const { user } = useUser()

  const isOwner = user?.id === entry?.userId

  const { options: { isPublic, publishedAt } } = entry
  return (
    <div className='my-4 bg-base-100 text-base-content'>
      <div className='flex justify-end bg-base-300'>
        {isOwner &&
          <ButtonIcon iconName={ICONS.edit} onClick={() => router.push(`${ROUTES.BLOG.href}/${entry.id}/edit`)} />
        }
        <ButtonIcon iconName={ICONS.openEye} onClick={() => router.push(`${ROUTES.BLOG.href}/${entry.id}`)} />
      </div>
      <h1 className='font-bold text-center mt-2 text-lg min-h-6 '>{entry?.title || ''}</h1>
      <div className='text-center'>
        <span className='text-sm font-thin '>
          Publicado : {`${Dates.fromNow(publishedAt)}`}
        </span>
      </div>
      <div className='flex items-center'>
        <div className='w-20 sm:w-32 h-full flex flex-col justify-center items-center sticky top-16 bottom-16 '>
          <button className='my-2' >
            <Icon name={ICONS.heart} size='xs' />
          </button>
          <button className='my-2' >
            <Icon name={ICONS.coments} size='xs' />
          </button>
        </div>
        <MarkdownEntry content={entry?.content} size={size} />
      </div>
      {/*  <TextEditor JSONContentState={entry.content}  editorMaxHeight={10} disabled /> */}

    </div>
  )
}

const MarkdownEntry = ({ content, size = 'full' }) => {
  const [markdown, setMarkdown] = useState()
  useEffect(() => {
    if (window) {
      const markdownString = draftToMarkdown(content);
      setMarkdown(markdownString)
    }
  }, [])

  const viewSizes = {
    sm: 'max-h-[10rem]',
    full: ''
  }

  return <div>
    <article className='prose lg:prose-xl'>
      <ReactMarkdown children={markdown} className={`${viewSizes[size]} overflow-y-auto`} />
    </article>
  </div>
}

export default BlogEntry
