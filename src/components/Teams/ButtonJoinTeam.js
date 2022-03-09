import {
  cancelTeamRequest,
  sendTeamRequests,
  unjoinTeam
} from '@/firebase/teams'
import { ROUTES } from '@/ROUTES'
import { useAuth } from '@/src/context/AuthContext'
import Button from '@comps/inputs/Button'
import Modal from '@comps/Modals/Modal'
import router from 'next/router'
import { useEffect, useState } from 'react'

export default function ButtonJoinTeam({
  requestList = [],
  participantsList = [],
  teamId = null
}) {
  const { user } = useAuth()
  const athleteId = user?.athleteId || null

  const [loading, setLoading] = useState(false)
  const [responseStatus, setResponseStatus] = useState(undefined)
  const [openAutenticateFirst, setOpenAutenticateFirst] = useState(false)
  const handleOpenAutenticateFirst = () => {
    setOpenAutenticateFirst(!openAutenticateFirst)
  }
  const handleJoin = () => {
    if (!athleteId) return setOpenAutenticateFirst(true)
    setLoading(true)

    sendTeamRequests(teamId, athleteId).then((res) => {
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
    cancelTeamRequest(teamId, athleteId).then((res) => {
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
    unjoinTeam(teamId, athleteId).then((res) => {
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
      label: 'CANCELAR UNIRSE',
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
        label: `MIEMBRO`,
        handleClick: handleOpenAlreadyIn,
        buttonVariant: 'danger'
      }
    }
  }

  const getRequestStatus = () => {
    if (requestList?.includes(athleteId)) {
      return REQUEST_STATUS.whatingRes
    } else {
    }
    const participant = participantsList.includes(athleteId)
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
    danger: `border-danger`,
    primary: `border-success`,
    secondary: `border-primary`
  }

  return (
    <>
      {/*  <Button
        variant={responseStatus?.buttonVariant}
        loading={loading}
        label={responseStatus?.label}
      /> */}
      <button
        className={`
        ${buttonStyle[responseStatus?.buttonVariant]} border-2 p-1 w-full`}
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
            router.push(ROUTES.signin)
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
