/*
 https://react-icons.github.io/react-icons/icons?name=ri
 */
import { RiEditFill } from 'react-icons/ri'
import { RiHeartPulseLine } from 'react-icons/ri'
import { RiTimeFill } from 'react-icons/ri'
import { RiWhatsappFill } from 'react-icons/ri'
import { RiArrowLeftSLine } from 'react-icons/ri'
import { RiArrowRightSLine } from 'react-icons/ri'
import { RiCloseFill } from 'react-icons/ri'
import { RiCustomerService2Fill } from 'react-icons/ri'
import { RiDeleteBin6Fill } from 'react-icons/ri'

const size = '1.8rem'
export const EditIcon = (props) => <RiEditFill size={size} {...props} />
export const EmergencyIcon = (props) => (
  <RiHeartPulseLine size={size} {...props} />
)
export const ScheduleIcon = (props) => <RiTimeFill size={size} {...props} />
export const ContactIcon = (props) => <RiWhatsappFill size={size} {...props} />

export const BackIcon = (props) => <RiArrowLeftSLine size={size} {...props} />
export const ForwardIcon = (props) => (
  <RiArrowRightSLine size={size} {...props} />
)
export const CloseIcon = (props) => <RiCloseFill size={size} {...props} />
export const CallIcon = (props) => (
  <RiCustomerService2Fill size={size} {...props} />
)
export const TrashBinIcon = (props) => (
  <RiDeleteBin6Fill size={size} {...props} />
)
