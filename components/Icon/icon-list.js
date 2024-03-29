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

//https://react-icons.github.io/react-icons/icons?name=cg
import { CgGym } from "react-icons/cg";

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
import { MdOutlineEmergency, MdOutlineEvent, MdOutlineMoreVert, MdOutlinePhoneForwarded, MdWorkspacesOutline } from 'react-icons/md'

//react-icons.github.io/react-icons/icons?name=fc
import { FcGoogle } from 'react-icons/fc'

import { FaComments, FaRegComment, FaSignInAlt, FaRegHeart, FaHeart } from 'react-icons/fa'

import { RiFileCopyLine, RiFileCopyFill } from 'react-icons/ri'
// ALL ICONS SHOULD BE OUTLINE

import {
  BsFillEyeFill,
  BsFillEyeSlashFill,
  BsHeart,
  BsShareFill
} from "react-icons/bs";

const get_Enum_Icons = (list) => {
  let res = {}
  Object.keys(list).forEach(key => {
    res[key] = `${key}`
  })
  return res
}



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
  dots: MdOutlineMoreVert,
  workout: CgGym,
  event: MdOutlineEvent,
  copy: RiFileCopyLine,
  copyFill: RiFileCopyFill,
  openEye: BsFillEyeFill,
  closeEye: BsFillEyeSlashFill,
  heart: FaRegHeart,
  coments: FaRegComment,
  heartFill: FaHeart,
  share: BsShareFill
}
export const ICONS = {
  heart: 'heart',
  heartFill: 'heartFill',
  coments: 'coments',
  openEye: 'openEye',
  closeEye: 'closeEye',
  signin: "signin",
  'color-google': "color-google",
  emergency: "emergency",
  email: "email",
  whatsapp: "whatsapp",
  save: "save",
  'rigth-arrow': "rigth-arrow",
  'left-arrow': "left-arrow",
  document: "document",
  gear: "gear",
  phone: "phone",
  cross: "cross",
  plus: "plus",
  minus: "minus",
  info: "info",
  filter: "filter",
  edit: "edit",
  trash: "trash",
  delete: "delete",
  down: "down",
  up: "up",
  back: "back",
  forward: "forward",
  home: "home",
  group: "group",
  user: "user",
  wifi: "wifi",
  done: "done",
  addUser: "addUser",
  removeUser: "removeUser",
  search: "search",
  right: "right",
  left: "left",
  dots: "dots",
  workout: "workout",
  event: "event",
  copy: "copy",
  copyFill: "copyFill",
  share: 'share'
}

export default ICON_LIST
