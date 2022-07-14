import Icon from '@comps/Icon'
import React from 'react'

const Modal = React.forwardRef(({
  title = 'Modal title',
  open,
  handleOpen = () => { },
  headerComponent,
  children,
}, ref) => {
  const modalId = `${title.split(' ').join('-').toLowerCase()}-${new Date().getTime()}-${Math.random()}`

  return (
    <div
      style={{ position: 'fixed' }}
      className={`
      ${open ? 'block' : 'hidden'} 
      bg-black 
      fixed
      top-0 
      bottom-0 
      left-0 
      right-0 
      flex 
      justify-center
      items-center
      bg-opacity-50 
      z-20 
       `}
      id={`container-${modalId}`}
      onClick={(e) => {
        e.stopPropagation()
        e.target.id === `container-${modalId}` && handleOpen()
      }}
    >
      <div
        id={`modal-${modalId}`}
        className='bg-base-100 overflow-auto max-h-full rounded-lg w-full max-w-sm  z-20 
      '>
        <header className={'flex justify-between sticky top-0 bg-base-100 px-3 py-1 z-20  h-8 '}>
          <div className={''}>
            <h5 className='font-bold'>{title}</h5>
          </div>
          <button
            id={`close-modal-${modalId}`}
            className={''}
            onClick={(e) => {
              e.preventDefault()
              handleOpen()
            }}
          >
            <Icon name='cross' />
          </button>

        </header>
        {headerComponent &&
          <div className='sticky top-8 z-20'>
            {headerComponent}
          </div>
        }

        <div className='p-5 pt-0 '>{children}</div>

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
