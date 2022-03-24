import Icon from '@comps/Icon'
import React from 'react'

export default function Modal({
  title = 'Modal title',
  open,
  handleOpen = () => {},
  children
}) {
  return (
    <div
      className={`${open ? 'flex' : 'hidden'} modal modal-open `}
      id="modal-1"
      onClick={(e) => {
        e.target.id === 'modal-1' && handleOpen()
      }}
    >
      <div className="modal-box  p-2 py-1 bg-slate-700 ">
        <header className={'flex justify-between'}>
          <div className={'w-[80%] text-center'}>
            <h5>{title}</h5>
          </div>
          <button
            className={'p-1'}
            onClick={(e) => {
              e.preventDefault()
              handleOpen()
            }}
          >
            <Icon name="cross" />
          </button>
        </header>
        <main className={'min-h-44 grid place-content-center'}>{children}</main>
      </div>
    </div>
  )
}
