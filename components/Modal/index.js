import Icon from '@comps/Icon'
import React from 'react'

const Modal = React.forwardRef(({
  title = 'Modal title',
  open,
  handleOpen = () => { },
  children
}, ref) => {
  const modalId = `modal-${new Date().getTime()}-${Math.random()}`

  return (
    <div
      className={` top-0 bottom-0 left-0 right-0 flex justify-center items-center bg-black bg-opacity-50 z-10 ${open ? 'fixed' : 'hidden'} `}
      id={modalId}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        e.target.id === modalId && handleOpen()
      }}
    >
      <div className='bg-base-100 overflow-auto max-h-full rounded-lg w-full max-w-sm  '>
        <header className={'flex justify-between sticky top-0 bg-base-100 z-10 px-3 py-1'}>
          <div className={''}>
            <h5 className='font-bold'>{title}</h5>
          </div>
          <button
            className={''}
            onClick={(e) => {
              e.preventDefault()
              handleOpen()
            }}
          >
            <Icon name='cross' />
          </button>
        </header>
        <main className={'pt-5 p-5'}>{children}</main>
      </div>

    </div>
  )
})
/* 
  <div
        // className="modal-box py-1 pt-0 bg-base-300 min-h-[10rem] "
        className=" "
      >
        <header className={'flex justify-between sticky top-0 bg-base-300'}>
          <div className={'w-[80%] text-center'}>
            <h5>{title}</h5>
          </div>
          <button
            className={''}
            onClick={(e) => {
              e.preventDefault()
              handleOpen()
            }}
          >
            </button>
            </header>
            <main className={'pt-5'}>{children}</main>
          </div> */
export default Modal