import { useUser } from '@/context/UserContext'
import { removeMember, removeRequest, sendRequest } from '@/firebase/teams'
import Modal from '@comps/Modal'
import router from 'next/router'
import { useEffect, useState } from 'react'
import Button from './Button'

export default function ButtonJoinTeam({
  membersList = [],
  requestList = [],
  teamId = null,
  disabled = false,
  isTheTeamOwner = false,
}) {
  const { user } = useUser()
  const userId = user?.id || null

  const [loading, setLoading] = useState(false)
  const [responseStatus, setResponseStatus] = useState(undefined)
  const [openAutenticateFirst, setOpenAutenticateFirst] = useState(false)
  const handleOpenAutenticateFirst = () => {
    setOpenAutenticateFirst(!openAutenticateFirst)
  }
  const handleJoin = () => {
    if (!userId) return setOpenAutenticateFirst(true)
    setLoading(true)

    sendRequest(teamId, userId).then((res) => {
      if (res.ok) {
        setResponseStatus(REQUEST_STATUS.whatingRes)
        setLoading(false)
      } else {
        console.log(`err`, res)
        setLoading(false)
      }
    })
  }
  const handleCancelRequest = () => {
    setLoading(true)
    removeRequest(teamId, userId).then((res) => {
      if (res.ok) {
        setResponseStatus(REQUEST_STATUS.notJoined)
        setLoading(false)
      } else {
        console.log(`res`, res)
        setLoading(false)
      }
    })
  }

  const handleUnjoin = () => {
    setLoading(true)
    removeMember(teamId, userId).then((res) => {
      if (res.ok) {
        setResponseStatus(REQUEST_STATUS.notJoined)
        setLoading(false)
      } else {
        console.log(`res`, res)
        setLoading(false)
      }
    })
  }

  const [openAlreadyIn, setOpenAlreadyIn] = useState(false)
  const handleOpenAlreadyIn = () => {
    // router.push(ROUTES.teams.details(teamId))
    setOpenAlreadyIn(!openAlreadyIn)
  }

  const REQUEST_STATUS = {
    notJoined: {
      type: 'NOT_JOINED',
      label: 'SOLICITAR UNIRSE',
      handleClick: handleJoin,
      buttonVariant: 'secondary'
    },
    whatingRes: {
      type: 'WATING_RESPONSE',
      label: 'CANCELAR SOLICITUD',
      handleClick: handleCancelRequest,
      buttonVariant: 'primary'
    },
    resRejected: {
      type: 'REQUEST_REJECTED',
      label: 'RECHAZADA',
      buttonVariant: 'disabled',
      handleClick: () => {
        console.log('solicitud rechada')
      }
    },
    alreadyIn: function () {
      return {
        type: 'ALREDY_JOINED',
        label: `ERES MIEMBRO`,
        handleClick: handleOpenAlreadyIn,
        buttonVariant: 'danger'
      }
    },
    isTheTeamOwner: {
      type: 'IS_THE_TEAM_OWNER',
      label: 'ERES DUEÑO',
      buttonVariant: 'disabled',
      handleClick: () => {
        console.log('solicitud rechada, no te puedes unir a tu propio equipo')
      }
    }
  }

  const getRequestStatus = () => {
    if (isTheTeamOwner) return REQUEST_STATUS.isTheTeamOwner
    if (requestList?.includes(userId)) {
      return REQUEST_STATUS.whatingRes
    } else {
    }
    const participant = membersList.includes(userId)
    if (participant) {
      return REQUEST_STATUS.alreadyIn(participant)
    } else {
      return REQUEST_STATUS.notJoined
    }
  }

  useEffect(() => {
    setResponseStatus(getRequestStatus())
  }, [])

  const buttonStyle = {
    danger: `border-error`,
    primary: `border-success`,
    secondary: `border-info`
  }

  return (
    <>
      {/*  <Button
        variant={responseStatus?.buttonVariant}
        loading={loading}
        label={responseStatus?.label}
      /> */}
      <button
        disabled={disabled}
        className={`
        ${buttonStyle[responseStatus?.buttonVariant]
          } border-2  p-1 w-full disabled:opacity-50 border-opacity-60 hover:border-opacity-100 text-xs`}
        onClick={async (e) => {
          e.stopPropagation()
          e.preventDefault()
          responseStatus?.handleClick()
        }}
      >
        {responseStatus?.label}
      </button>
      <Modal
        open={openAutenticateFirst}
        handleOpen={handleOpenAutenticateFirst}
        title="Neceistas autenticarte"
      >
        Para poder unirte a un equipo debes autenticarte primero.
        <Button
          label="Ingresar"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            router.push('/login')
          }}
        />
      </Modal>
      <Modal
        handleOpen={handleOpenAlreadyIn}
        open={openAlreadyIn}
        title="Salir del equipo"
      >
        <div className="">
          <p>¿De verdad desa salir de este equipo?</p>
          <div className="w-1/2 mx-auto mt-6">
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                handleUnjoin()
                setOpenAlreadyIn(false)
              }}
            >
              Salir
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
