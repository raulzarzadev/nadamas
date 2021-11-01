export default function Toggle({
  label = 'Toggle me',
  onChange,
  checked = false,
  name = 'toggle',
  labelPosition = 'left', // left | top
  size = 'md' // sm | md | lg
}) {
  const labelPos = {
    left: 'mr-3',
    top: 'mr-0 flex-col'
  }
  const sizign = {
    lg: {
      container: ' w-14 h-6',
      circle: 'w-6 h-6'
    },
    md: {
      container: ' w-14 h-6',
      circle: 'w-6 h-6'
    },
    sm: {
      container: ' w-10 h-4',
      circle: 'w-4 h-4'
    }
  }
  return (
    <div className="flex items-center justify-center w-full">
      <label
        htmlFor={`toogle-${name}`}
        className={`flex items-center cursor-pointer ${labelPos[labelPosition]}`}
      >
        <div className={`${labelPos[labelPosition]}`}>{label}</div>
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
          <div
            className={`block bg-gray-600 ${sizign[size].container} rounded-full`}
          ></div>
          <div
            className={`checked-sibiling:bg-green-500 transform checked-sibiling:translate-x-full  absolute left-1 top-0 bg-white ${sizign[size].circle} rounded-full transition`}
          ></div>
        </div>
      </label>
    </div>
  )
}
