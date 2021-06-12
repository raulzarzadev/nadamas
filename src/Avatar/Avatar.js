import Link from 'next/link'
import s from './styles.module.css'
import Image from 'next/image'
import { UpladIcon } from '../utils/Icons'
import React from 'react'
const Avatar = React.forwardRef(
  ({ image, alt = '', upload, onClick, size = 'md' }, ref) => {
    return (
      <a ref={ref} className={s.avatar} onClick={onClick} talla={size}>
        {image ? (
          <Image
            src={image}
            alt={alt.charAt(1).toUpperCase()}
            layout="fill"
            objectFit="cover"
            style={{ borderRadius: '50%' }}
          />
        ) : (
          <div>{alt.charAt(0).toUpperCase()}</div>
        )}
        {upload && (
          <>
            <label className={s.upload}>
              <UpladIcon />
              <input type="file" style={{ display: 'none' }}></input>
            </label>
          </>
        )}
      </a>
    )
  }
)

export default Avatar
