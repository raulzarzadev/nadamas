import { useState, useEffect } from "react"
import { useUser } from "@/context/UserContext"
import { listenTeam, removeMember } from "@/firebase/teams"
import { dateFormat } from "@/utils/dates"
import Icon from "@comps/Icon"
import Link from "@comps/Link"
import ModalDelete from "@comps/Modal/ModalDelete"
import RecordsSection from "@comps/Records/RecordsSection"
import Section from "@comps/Section"
import EmergencyCall from "./EmergencyCall"
import { getTeamMember } from "@/firebase/users"
import Loading from "@comps/Loading"
const emailCC = null
const subject = 'Infomación relevante de nadamas'


export default function MemberDetails({ memberId, teamId }) {
    const { user } = useUser()
    const [member, setMember] = useState(undefined)
    useEffect(() => {
        memberId && getTeamMember(memberId).then(setMember)
    }, [memberId])
    const [team, setTeam] = useState(undefined)
    useEffect(() => {
        teamId && listenTeam(teamId, setTeam)
    }, [teamId])

    if (!member || !team) return <Loading />

    const isOwner = [team?.userId, team?.coach?.id].includes(user.id)
    const { name, email, alias, birth, contact, emergencyContact, medicInformation, athleteId } = member

    const handleDeleteMember = () => {
        removeMember(team.id, memberId).then((res) => {
            res.ok
            // console.log(res)

        }
        )
    }

    return <div className="text-center">
        <p>{name}</p>
        <p>{email}</p>
        {alias && <p>{alias}</p>}
        <p>Fecha {dateFormat(birth, 'dd MMM yy')}</p>
        {/*  {birth && <p>Fecha {dateFormat(birth, 'dd MMM yy')}</p>} */}
        <div className=" flex w-full justify-evenly items-center">
            {contact?.whatsapp && (
                <Link
                    href={`https://wa.me/${contact?.whatsapp}`}
                    className="btn btn-circle btn-sm"
                >
                    <Icon name="whatsapp" />
                </Link>
            )}
            {email && (
                <Link
                    href={`mailto:${email}?${emailCC ? `cc=${emailCC}&` : ''
                        }subject=${subject}`}
                    className="btn btn-circle btn-sm"
                >
                    <Icon name="email" />
                </Link>
            )}
            {emergencyContact?.phone && (
                <EmergencyCall contact={emergencyContact} />
            )}
        </div>

        <div>
            <h4>Información médica</h4>
            {medicInformation?.blodType && (
                <p>Tipo de sangre: {medicInformation?.blodType}</p>
            )}
            {medicInformation?.considerations && (
                <p>Alergias: {medicInformation?.considerations}</p>
            )}
        </div>
        <RecordsSection athleteId={member.id} canCreateNewRecord={isOwner} />
        {/*  <AthleteSection userId={member.id} canCreateNewRecord={isOwner} /> */}
        <Section title={'Opciones'}>
            <ModalDelete
                buttonVariant="btn"
                buttonLabel={'Sacar del equipo'}
                labelDelete={name ? `Miembro del equipo: ${name}` : null}
                handleDelete={handleDeleteMember}

            />
        </Section>
    </div>
}
