import { AiOutlineSave } from '@react-icons/all-files/ai/AiOutlineSave'
import { AiOutlineRight } from '@react-icons/all-files/ai/AiOutlineRight'
import { AiOutlineLeft } from '@react-icons/all-files/ai/AiOutlineLeft'

import { TiDocumentText } from '@react-icons/all-files/ti/TiDocumentText'
import { TiCogOutline } from '@react-icons/all-files/ti/TiCogOutline'
import { TiPhoneOutline } from '@react-icons/all-files/ti/TiPhoneOutline'
import { TiTimes } from '@react-icons/all-files/ti/TiTimes'
import { TiPlusOutline } from '@react-icons/all-files/ti/TiPlusOutline'
import { TiMinusOutline } from '@react-icons/all-files/ti/TiMinusOutline'
import { TiInfoLarge } from '@react-icons/all-files/ti/TiInfoLarge'
import { TiFilter } from '@react-icons/all-files/ti/TiFilter'
import { TiEdit } from '@react-icons/all-files/ti/TiEdit'
import { TiTrash } from '@react-icons/all-files/ti/TiTrash'

// https://react-icons.github.io/react-icons/icons?name=ti
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiChevronLeft,
  TiChevronRight,
  TiGroup,
  TiHome,
  TiMail,
  TiMediaPlay,
  TiMediaPlayReverse,
  TiTick,
  TiUser,
  TiUserAdd,
  TiUserDelete,
  TiWiFi,
  TiZoom
} from 'react-icons/ti'

// https://react-icons.github.io/react-icons/icons?name=si
import { SiWhatsapp } from 'react-icons/si'

//https://react-icons.github.io/react-icons/icons?name=md
import { MdOutlineEmergency, MdOutlineMoreVert, MdOutlinePhoneForwarded } from 'react-icons/md'

//react-icons.github.io/react-icons/icons?name=fc
import { FcGoogle } from 'react-icons/fc'

import { FaSignInAlt } from 'react-icons/fa'

// ALL ICONS SHOULD BE OUTLINE

const ICON_LIST = {
  signin: FaSignInAlt,
  'color-google': FcGoogle,
  emergency: MdOutlineEmergency,
  email: TiMail,
  whatsapp: SiWhatsapp,
  save: AiOutlineSave,
  'rigth-arrow': AiOutlineRight,
  'left-arrow': AiOutlineLeft,
  document: TiDocumentText,
  gear: TiCogOutline,
  phone: MdOutlinePhoneForwarded,
  cross: TiTimes,
  plus: TiPlusOutline,
  minus: TiMinusOutline,
  info: TiInfoLarge,
  filter: TiFilter,
  edit: TiEdit,
  trash: TiTrash,
  delete: TiTrash,
  down: TiArrowSortedDown,
  up: TiArrowSortedUp,
  back: TiChevronLeft,
  forward: TiChevronRight,
  home: TiHome,
  group: TiGroup,
  user: TiUser,
  wifi: TiWiFi,
  done: TiTick,
  addUser: TiUserAdd,
  removeUser: TiUserDelete,
  search: TiZoom,
  right: TiMediaPlay,
  left: TiMediaPlayReverse,
  dots: MdOutlineMoreVert
}
export default ICON_LIST
