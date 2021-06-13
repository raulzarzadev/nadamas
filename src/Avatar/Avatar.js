import Link from 'next/link'
import s from './styles.module.css'
import Image from 'next/image'
import { UpladIcon } from '../utils/Icons'
import React from 'react'
import { uploadFile } from '@/firebase/client'
const Avatar = React.forwardRef(
  ({ image, athleteId, alt = '', upload, onClick, size = 'md' }, ref) => {
    const handleChange = (e) => {
      console.log(e.target.files[0])
      const file = e.target.files[0]
      if (file) {
        uploadFile({ type: 'avatar', athleteId, file })
      }
    }
    return (
      <a ref={ref} className={s.avatar} onClick={onClick} talla={size}>
        {image ? (
          <Image
            src={image}
            alt={alt.charAt(1).toUpperCase()}
            layout="fill"
            objectFit="cover"
            style={{ borderRadius: '50%', zIndex: 1 }}
          />
        ) : (
          <div>{alt.charAt(0).toUpperCase()}</div>
        )}
        {upload && (
          <>
            <label className={s.upload}>
              <UpladIcon />
              <input
                name="avatar-image"
                onChange={handleChange}
                type="file"
                style={{ display: 'none' }}
              ></input>
            </label>
          </>
        )}
      </a>
    )
  }
)

export default Avatar
