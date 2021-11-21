/* https://react-icons.github.io/react-icons/icons?name=gi */

import { GiPodiumWinner } from 'react-icons/gi'
import { GiPodiumSecond } from 'react-icons/gi'
import { GiPodiumThird } from 'react-icons/gi'

const Icons = ['GiPodiumWinner', 'GiPodiumSecond', 'GiPodiumThird']
export default {
  theFastest: {
    label: 'El mas rapido'
  },
  theParticipant: {
    label: 'El participante'
  },
  theFinisher: {
    label: 'Entro y gano'
  },
  theCategoryWinner: {
    label: 'Categoria'
  },
  theGeneralWinner: {
    label: 'General'
  }
}

export const TEST_AWARDS = {
  firstPlace: {
    label: '1° Lugar',
    icon: <GiPodiumWinner />
  },
  secondPlace: {
    label: '2° Lugar',
    icon: <GiPodiumSecond />
  },
  thirdPlace: {
    label: '3° Lugar',
    icon: <GiPodiumThird />
  }
}
