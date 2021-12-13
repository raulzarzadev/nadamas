import React, { useEffect } from 'react'
import { CloseIcon } from '../../../utils/Icons'
import styles from './styles.module.css'

export default function Modal({
  title = 'Modal title',
  open,
  handleOpen = () => {},
  children
}) {
  useEffect(() => {
    const a = document.getElementById(`modal-${title}`)
    a.addEventListener('click', (e) => {
      const { id } = e.target
      if (id === `modal-${title}`) handleOpen()
    })
    a.removeEventListener('click', (e) => {
      const { id } = e.target
      if (id === `modal-${title}`) handleOpen()
    })
  }, [open])
  return (
    <div
      className={`${styles.modal}`}
      id={`modal-${title}`}
      style={{ display: !open && 'none' }}
    >
      <div
        id="modal"
        className={`${styles.modal_dialog} bg-light dark:bg-primary-dark`}
      >
        <header className={styles.modal_header}>
          <div className={styles.modal_title}>
            <h5>{title}</h5>
          </div>
          <button
            type="button"
            autoFocus
            className={styles.modal_button_close}
            id="close-button"
            onClick={(e) => {
              e.preventDefault()
              handleOpen()
            }}
          >
            <CloseIcon />
          </button>
        </header>
        <section className={styles.modal_content}>{children}</section>
        <footer className={styles.modal_footer}></footer>
      </div>
    </div>
  )
}
