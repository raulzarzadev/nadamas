export default function Loading({ size = 'sm' }) {
  const sizing = {
    sm: 'border-4 w-7 h-7',
    md: 'border-8 w-14 h-14',
    lg: 'border-8 w-24 h-24'
  }
  return (
    <div className="flex justify-center items-center">
      <div
        className={`${sizing[size]}  rounded-full border-t-0 border-b-0  border-r-0 animate-spin`}
      ></div>
    </div>
  )
}
