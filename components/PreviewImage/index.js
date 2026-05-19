'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Modal from '../Modal'

/**
 * @param {{
 *   label?: string | null
 *   alt?: string | null
 *   image?: string | null
 *   canOpenModal?: boolean
 *   previewSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full-w' | 'avatar'
 *   previewClassName?: string
 *   modalImageSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
 *   variant?: 'modal' | 'lightbox'
 * }} props
 */
const PreviewImage = ({
  label = null,
  alt = null,
  image = null,
  canOpenModal = true,
  previewSize = 'md',
  previewClassName,
  modalImageSize = 'lg',
  variant = 'modal',
}) => {
  const [openModal, setOpenModal] = useState(false)
  const handleOpenModal = () => setOpenModal(!openModal)

  useEffect(() => {
    if (!openModal || variant !== 'lightbox') return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpenModal(false)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [openModal, variant])

  const previewSizing = {
    sm: 'w-32 aspect-video',
    md: 'w-48 aspect-video',
    lg: 'w-64 aspect-video',
    xl: 'w-96 aspect-video',
    'full-w': 'w-full h-32',
    avatar: 'h-20 w-20',
  }

  return (
    <div className="">
      {image ? (
        <div className="">
          {label && <span className="">{label}</span>}
          <button
            type="button"
            aria-label={label ? `Ver imagen de ${label}` : 'Ver imagen'}
            className={`
             ${previewSizing[previewSize]}
             ${previewClassName} 
            relative  
            mx-auto 
            opacity-60 
            hover:opacity-100 
            shadow-lg 
            m-1 
            `}
            onClick={() => {
              canOpenModal && handleOpenModal()
            }}
          >
            <Image
              src={image}
              fill
              style={{ objectFit: 'cover' }}
              placeholder="blur"
              blurDataURL={`/images/defaultBlurImage-small.jpg`}
              alt={alt || label || ''}
            />
          </button>
          {variant === 'lightbox' ? (
            openModal &&
            createPortal(
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,37,64,0.78)] p-5 backdrop-blur-sm sm:p-8">
                <button
                  type="button"
                  aria-label="Cerrar imagen"
                  className="absolute inset-0"
                  onClick={handleOpenModal}
                />
                <button
                  type="button"
                  aria-label="Cerrar imagen"
                  onClick={handleOpenModal}
                  className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/14 text-2xl text-white backdrop-blur-sm transition hover:bg-white/24"
                >
                  ×
                </button>
                <div className="relative z-10 h-[min(76vh,48rem)] w-[min(88vw,60rem)]">
                  <Image
                    fill
                    style={{ objectFit: 'contain' }}
                    placeholder="blur"
                    blurDataURL={`/images/defaultBlurImage-small.jpg`}
                    src={image}
                    alt={alt || label || ''}
                    className="drop-shadow-2xl"
                  />
                </div>
              </div>,
              document.body
            )
          ) : (
            <Modal
              modalSize={modalImageSize}
              title="Image"
              open={openModal}
              handleOpen={handleOpenModal}
            >
              <div className="relative mx-auto aspect-video w-full">
                <Image
                  fill
                  style={{ objectFit: 'contain' }}
                  placeholder="blur"
                  blurDataURL={`/images/defaultBlurImage-small.jpg`}
                  src={image}
                  alt={alt || label || ''}
                />
              </div>
            </Modal>
          )}
        </div>
      ) : (
        <span className="italic">No image</span>
      )}
    </div>
  )
}

export default PreviewImage
