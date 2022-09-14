
import { useRouter } from 'next/router';
import { ROUTES } from '../../../CONSTANTS/ROUTES';
import { useUser } from '../../../context/UserContext';
import Icon from '../../Icon';
import { ICONS } from '../../Icon/icon-list';
import Tooltip from '../../Tooltip';
import { lovedEntryBy, unlovedEntryBy } from '@/firebase/entries/main'
import ShareButton from '../../ShareButton';

const SideButtons = ({ entryId, entryOwner, lovedBy = [] }) => {

  const router = useRouter()
  const { user } = useUser()

  const isOwner = user?.id === entryOwner
  const alreadyInArticle = router.pathname === '/blog/[id]'

  // TODO add shere button
  // TODO add Coments Modal
  // TODO add delete button

  return <div className='w-20 sm:w-32 h-full z-10 flex flex-col justify-center items-center sticky top-16 bottom-16 '>


    <HeartButton lovedBy={lovedBy} entryId={entryId} />


    {!alreadyInArticle &&
      <WatchButton entryId={entryId} />
    }
    {alreadyInArticle &&
      <ShareButton />
    }

    {isOwner &&
      <EditButton entryId={entryId} />
    }
    <div>

    </div>
  </div>
}
const EditButton = ({ entryId }) => {
  const { push } = useRouter()
  return <button
    className='my-2'
    onClick={() => push(`${ROUTES.BLOG.href}/${entryId}/edit`)}
  >
    <Icon name={ICONS.edit} size='md' />
  </button>
}
const WatchButton = ({ entryId }) => {
  const { push } = useRouter()
  return <Tooltip label='Leer' side='right'>
    <button
      onClick={() => push(`${ROUTES.BLOG.href}/${entryId}`)}
      className='my-2'
    >
      <Icon name={ICONS.openEye} size='lg' />
    </button>
  </Tooltip>
}
const HeartButton = ({ entryId, lovedBy = [] }) => {
  const hanldeLoveEntry = (boolean) => {
    if (boolean) {
      lovedEntryBy(entryId, user.id)
    } else {
      unlovedEntryBy(entryId, user.id)
    }
  }
  const { user } = useUser()
  const loved = lovedBy.includes(user?.id)
  return <div className='my-2'>

    {loved ?
      <button
        onClick={() => hanldeLoveEntry(false)}
      >
        <Icon
          name={ICONS.heartFill}
        />
      </button>
      :
      <button
        onClick={() => hanldeLoveEntry(true)}
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
}
export default SideButtons
