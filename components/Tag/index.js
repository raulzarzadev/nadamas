
const Tag = ({ tag, onClick = (tagId) => { }, variant = 'light', onClose = (tagId) => { }, hiddeCloseButton, ...props }) => {
  const { label, id } = tag
  const variants = {
    light: ' bg-base-100',
    dark: ' bg-base-300'
  }
  return (
    <div onClick={(e) => {
      e.preventDefault()
      e.stopPropagation()
      onClick(id)
    }}>
      <span
        className={`
        ${variants[variant]}
        px-4 py-2 rounded-full  ligth text-base-content font-semibold text-sm flex align-center w-max cursor-pointer active:bg-gray-300 transition duration-300 ease
        `}>
        {label || 'not found'}
        {!hiddeCloseButton &&
          <button
            class="bg-transparent hover focus:outline-none "
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClose(id)
            }}
          >
            <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="times"
              class="w-3 ml-3" role="img" xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 352 512">
              <path fill="currentColor"
                d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z">
              </path>
            </svg>
          </button>
        }
      </span>
    </div>
  )
}

export default Tag
