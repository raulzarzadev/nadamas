import { convertToRaw, EditorState, ContentState, convertFromRaw } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { ROUTES } from '../../CONSTANTS/ROUTES';
import { useUser } from '../../context/UserContext';
import TextEditor from '../Blog/TextEditor';
import { ICONS } from '../Icon/icon-list';
import ButtonIcon from '../Inputs/Button/ButtonIcon';


const BlogEntry = ({ entry }) => {

  const router = useRouter()

  const { user } = useUser()

  const isOwner = user.id === entry.userId

  return (
    <div className='my-4 bg-base-200 text-base-content'>
      <div className='flex justify-between'>
        <h1 className='font-bold'>{entry?.title}</h1>
        {isOwner &&
          <ButtonIcon iconName={ICONS.edit} onClick={() => router.push(`${ROUTES.BLOG.href}/${entry.id}/edit`)} />
        }
      </div>
      <TextEditor JSONContentState={entry.content} editable={false} />

    </div>
  )
}

export default BlogEntry
