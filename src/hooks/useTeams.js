import { updateTeam } from "@/firebase/teams"

export default function useTeams() {
  const editTeam =()=>{
    if(user?.limits?.teams >= 1)
    updateTeam(team)
  }
 return {editTeam}
}