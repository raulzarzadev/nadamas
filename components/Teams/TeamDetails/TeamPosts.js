import { useEffect, useState } from "react"
import { listenTeamPosts } from '../../../firebase/posts/main'
import MainModal from "../../Modal/MainModal"
import { SquareAdd } from "../../SquareAdd"
import FormPost from "../Posts/formPost"
import PostSquare from "../Posts/postSquare"

const TeamPosts = ({ team, isOwnerOrCoach, isMember }) => {
  const [teamPosts, setTeamPosts] = useState([])
  useEffect(() => {
    listenTeamPosts(team?.id, (teams) => setTeamPosts(teams))
  }, [])
  return (
    <div>
       <h2 className='font-bold text-lg text-left'>
          Publicaciones
        </h2>
      <div className='grid grid-flow-col overflow-auto gap-4 p-2'>
        {isOwnerOrCoach &&
          <div className='w-20'>
            <MainModal title={'Nuevo post'} OpenComponent={SquareAdd} OpenComponentProps={{id:'square-add-post'}} >
              <FormPost team={team} />
            </MainModal>
          </div>
        }

        {teamPosts.map(post => (
          <PostSquare key={post.id} post={post} isMemeber={isOwnerOrCoach || isMember} />
        ))}

      </div>
    </div>
  )
}

export default TeamPosts
