import { useState, useEffect } from 'react'
import { getTeamMember } from '@/firebase/users'
import Loading from '@comps/Loading'
import { useUser } from '@/context/UserContext'
import Button from '@comps/Inputs/Button'
import { acceptRequest, removeMember } from '@/firebase/teams'
import Link from '@comps/Link'
import Icon from '@comps/Icon'
import Image from 'next/image'
import MainModal from '@comps/Modal/MainModal'
import MemberDetails from '@comps/User/MemberDetails'
import EmergencyCall from '@comps/User/EmergencyCall'

export default function TeamMember({
  memberId,
  team,
  isRequestRow,
  isTeamRow
}) {
  const { user } = useUser()
  const [member, setMember] = useState()
  // console.log(memberId)
  useEffect(() => {
    getTeamMember(memberId).then(setMember)
  }, [])

  const [openmemberModal, setOpenmemberModal] = useState()
  const handleOpenmemberModal = () => {
    setOpenmemberModal(!openmemberModal)
  }

  if (!member) return <Loading />

  const {
    name,
    photoURL: image,
    joinedAt,
    contact,
    email,
    alias,
    emergencyContact,
    medicInformation,
    birth,
    athleteId
  } = member

  const handleAcceptRequest = () => {
    acceptRequest(team.id, memberId).then((res) => {
      console.log(res)
    })
  }

  const emailCC = null
  const subject = 'Infomación relevante de nadamas'

  // *** *** *** *** *** ***  *** *** ***  *** *** ***
  //                  CONFIGURATIONS
  // *** *** *** *** *** ***  *** *** ***  *** *** ***

  // Should be condigurable
  const isPublicProfile = false

  // Is the owner team or de coach
  const isOwner = [team.userId, team?.coach?.id].includes(user.id)

  // is the current user, it can see their own info
  const ITS_ME = member.id === user.id

  const SHOW_QUICK_ACTIONS =
    (isTeamRow && isOwner) ||
    (isTeamRow && isPublicProfile) ||
    (isTeamRow && ITS_ME)

  // just coachs can see and accepts new members

  const SHOW_REQUEST_ROW = isRequestRow && isOwner

  // IF you can not se quick actions you can not see more data ?

  const OPEN_MEMBER_DETAILS = SHOW_QUICK_ACTIONS

  // You can open the modal, but what info you can see ?
  //const OPEN_MEMBER_DETAILS = true

  return (
    <>
      <div
        className=" bg-base-300 p-1 rounded-lg shadow-lg w-full"
        onClick={() => {
          OPEN_MEMBER_DETAILS && handleOpenmemberModal()
        }}
      >
        <div className=" flex justify-around">
          <div className="flex w-full  items-center">
            <div className="avatar">
              <div className="relative w-10 rounded-full bg-blue-300 ">
                {image && (
                  <Image src={image} layout="fill" className="rounded-full " />
                )}
              </div>
            </div>
            <div className="ml-1">
              <h4 className="">
                {name?.split(' ')?.[0]} {name?.split(' ')?.[2] || name?.split(' ')?.[1]} <span className='font-thin'>{alias}</span>
                <span className="text-xs font-thin ">{ITS_ME && ' (Tú)'}</span>
              </h4>
              <p className="font-thin text-sm hidden sm:block">{email}</p>
            </div>
          </div>

          {/* -------------------------------------------------------------------- Quick actions buttons  */}
          {SHOW_QUICK_ACTIONS && (
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
          )}
          {/* <p className="whitespace-nowrap">
        Activo desde {dateDistance(joinedAt, new Date(), { addSuffix9: true })}
      </p> */}
          {SHOW_REQUEST_ROW && (
            <div className="flex items-center ml-2">
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleAcceptRequest()
                }}
                variant="outline"
              >
                Acceptar
              </Button>
            </div>
          )}
          <Link href={`/teams/${team.id}/member?memberId=${member.id}`}>
            <Icon name='dots' />
          </Link>
          {/*  <MainModal OpenComponent={Icon} OpenComponentProps={{ name: 'dots' }}>
            <MemberDetails member={member} team={team} />
          </MainModal> */}
        </div>
        {/*  <div className="w-full">
          <Section title={ 'Detalles' }>
            
          </Section>
        </div> */}

      </div>

    </>
  )
}


