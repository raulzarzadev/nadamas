import { useAuth } from '@/src/context/AuthContext'
import useTeams from '@/src/hooks/useTeams'
import { EditIcon } from '@/src/utils/Icons'
import Modal from '@comps/Modals/Modal'
import Section from '@comps/Section'
import { useState } from 'react'
import FormTeam from './FormTeam'
import JoinTeamRequests from './JoinTeamReaquests'
import RequestsSection from './RequestsSection'
import TeamMembersSection from './TeamMembersSection'
import TeamOptionsSection from './TeamOptionsSection'

function Team({ team }) {
  const { teamOwner, teamMember } = useTeams({ team })
  const [openEditTeam, setOpenEditTeam] = useState(false)
  const handleEditTeam = () => {
    setOpenEditTeam(!openEditTeam)
  }

  console.log(teamMember)

  return (
    <div className="text-center">
      {/* ------------------------------------------------------- TEAM INFORMATION */}
      <div className="flex w-full justify-center">
        <h2>{team?.title}</h2>
        {teamOwner && (
          <>
            <button className="mx-2" onClick={handleEditTeam}>
              <EditIcon />
            </button>
            <ModalTeamForm
              open={openEditTeam}
              handleOpen={setOpenEditTeam}
              team={team}
            />
          </>
        )}
      </div>
      <p>{team?.description}</p>
      <p>{team?.publicTeam ? 'Público' : 'Privado'}</p>
      {/* ------------------------------------------------------- TEAM MEMBERS */}
      <TeamMembersSection team={team} />
      {/* ------------------------------------------------------- TEAM REQUESTS */}
      {teamOwner && <RequestsSection team={team} />}
      {/* ------------------------------------------------------- TEAM OPTIONS */}
      <TeamOptionsSection team={team} />
    </div>
  )
}

const ModalTeamForm = ({ open, handleOpen, team }) => {
  return (
    <Modal open={open} handleOpen={handleOpen}>
      <FormTeam team={team} />
    </Modal>
  )
}

export default Team
