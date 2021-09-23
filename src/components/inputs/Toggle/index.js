export default function Toggle({ label = 'Toggle me' , onChange , checked , name='toggle' , labelPosition='left'}) {
  const labelPos = {
    left: 'mr-3',
    top: 'mr-0 flex-col'
  }
  return (
    <div className="flex items-center justify-center w-full">
      <label
        htmlFor={`toogle-${name}`}
        className={`flex items-center cursor-pointer ${labelPos[labelPosition]}`}
      >
        <div
          className={`${labelPos[labelPosition]}`}
        >
          {label}
        </div>
        <div className="relative">
          <input
            type="checkbox"
            name={name}
            id={`toogle-${name}`}
            className="sr-only"
            onChange={onChange}
            checked={checked}
            name={name}
          />
          <div className="block bg-gray-600 w-14 h-6 rounded-full"></div>
          <div className="checked-sibiling:bg-green-500 transform checked-sibiling:translate-x-full  absolute left-1 top-0 bg-white w-6 h-6 rounded-full transition"></div>
        </div>
      </label>
    </div>
  )
}
