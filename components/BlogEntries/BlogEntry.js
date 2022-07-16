
import { useRouter } from 'next/router';
import { ROUTES } from '../../CONSTANTS/ROUTES';
import { useUser } from '../../context/UserContext';
import TextEditor from '../Blog/TextEditor';
import { ICONS } from '../Icon/icon-list';
import ButtonIcon from '../Inputs/Button/ButtonIcon';
import { draftToMarkdown } from 'markdown-draft-js';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown'

const BlogEntry = ({ entry, maxHeight=999 }) => {

  const router = useRouter()

  const { user } = useUser()

  const isOwner = user.id === entry.userId

  return (
    <div className='my-4 bg-base-100 text-base-content'>
      <div className='flex justify-end bg-base-300'>
        {isOwner &&
          <ButtonIcon iconName={ICONS.edit} onClick={() => router.push(`${ROUTES.BLOG.href}/${entry.id}/edit`)} />
        }
        <ButtonIcon iconName={ICONS.openEye} onClick={() => router.push(`${ROUTES.BLOG.href}/${entry.id}`)} />
      </div>
      <h1 className='font-bold text-center mt-2 text-lg min-h-6 '>{entry?.title || ''}</h1>
      <MarkdownEntry content={entry?.content} maxHeight={maxHeight} />
      {/*  <TextEditor JSONContentState={entry.content}  editorMaxHeight={10} disabled /> */}

    </div>
  )
}

const MarkdownEntry = ({ content, maxHeight }) => {
  console.log(maxHeight)
  const [markdown, setMarkdown] = useState()
  useEffect(() => {
    if (window) {
      const markdownString = draftToMarkdown(content);
      setMarkdown(markdownString)
    }
  }, [])
  return <div>
    <article className='prose lg:prose-xl'>
      <ReactMarkdown children={markdown} className={`max-h-[${maxHeight}rem] overflow-y-auto`} />
    </article>
  </div>
}

export default BlogEntry
