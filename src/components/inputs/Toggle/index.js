export default function Toggle({ label = 'Toggle me' , onChange , checked}) {
  return (
    <div className="flex items-center justify-center w-full">
      <label for="toggle" className="flex items-center cursor-pointer">
        <div className="mr-3">{label}</div>
        <div className="relative">
          <input type="checkbox" id="toggle" className="sr-only" onChange={onChange} checked={checked}/>
          <div className="block bg-gray-600 w-14 h-6 rounded-full"></div>
          <div className="checked-sibiling:bg-green-500 transform checked-sibiling:translate-x-full  absolute left-1 top-0 bg-white w-6 h-6 rounded-full transition"></div>
        </div>
      </label>
    </div>
  )
}
