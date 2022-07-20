import Tooltip from "../../Tooltip"

const ButtonAdd = ({ onClick }) => {
  return (
    <div className=" fixed sm:bottom-16 sm:right-16 bottom-8 right-8  z-10  ">
      <Tooltip label='Crear nueva entrada' side='left'>
        <button
          className=' h-10 w-10 text-4xl flex justify-center items-centerp-1 bg-base-content  rounded-full text-base-100  font-extrabold radiant shadow-md hover:shadow-sm shadow-base-content'
          onClick={onClick}
        >
          <span className="absolute -top-0.5 ">
            +
          </span>
          {/* <Icon name={ICONS.plus} />  */}
        </button>
      </Tooltip>
    </div>
  )
}

export default ButtonAdd
