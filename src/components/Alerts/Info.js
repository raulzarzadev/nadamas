import { WarningIcon } from '@/src/utils/Icons'

export default function Info({ text, fullWidth }) {
  return (
    <div className="m-4  flex    ">
      <div
        className={`bg-gray-50 bg-opacity-10 flex font-light justify-center rounded-md items-center p-0.5 text-xs
        ${fullWidth && 'w-full'}`}
      >
        <div className="mr-2">
          <WarningIcon />
        </div>
        <p className="">{text}</p>
      </div>
    </div>
  )
}
