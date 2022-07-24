
import { useRouter } from 'next/router';
import { ROUTES } from '../../../CONSTANTS/ROUTES';
import { useUser } from '../../../context/UserContext';
import Icon from '../../Icon';
import { ICONS } from '../../Icon/icon-list';
import Tooltip from '../../Tooltip';
import { lovedEntryBy, unlovedEntryBy } from '@/firebase/entries/main'

const SideButtons = ({ entryId, entryOwner, lovedBy = [] }) => {
  const hanldeLoveEntry = (boolean) => {
    if (boolean) {
      lovedEntryBy(entryId, user.id)
    } else {
      unlovedEntryBy(entryId, user.id)
    }
  }
  const { user } = useUser()
  const router = useRouter()

  const isOwner = user?.id === entryOwner
  const alreadyInArticle = router.pathname === '/blog/[id]'
  const loved = lovedBy.includes(user?.id)

  return <div className='w-20 sm:w-32 h-full z-10 flex flex-col justify-center items-center sticky top-16 bottom-16 '>

    <div className='my-2'>

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
export default SideButtons
