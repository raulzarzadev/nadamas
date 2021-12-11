import { TEST_AWARDS } from "@/src/constants/AWARDS"

const AwardBadge = ({ award, size = 'md' }) => {
  const sizign = {
    xs: 'w-8 h-8 text-2xl',
    sm: '',
    md: 'w-10 h-10 text-2xl',
    lg: ''
  }
  return (
    <div
      className={`${sizign[size]} m-2 text-warning  border rounded-full bg-primary-dark p-1 flex justify-center items-center`}
    >
      {TEST_AWARDS[award].icon}
    </div>
  )
}

export default AwardBadge
