
export const SquareAdd = ({ ...props }) => {
  return (
    <div {...props}  className='h-full w-full border-2 border-dashed rounded-lg min-w-[4rem] flex justify-center items-center hover:border-dotted cursor-pointer'>
      <span className='text-5xl'>
        +
      </span>

    </div>
  )
}
