import s from './styles.module.css'
import Image from 'next/image'
import React from 'react'
import UploadAvatar from '../UploadFile/UpladeAvatar'
const Avatar = React.forwardRef(
  (
    {
      image,
      id,
      alt = '',
      upload,
      onClick,
      size = 'md',
      type = 'avatar'
    },
    ref
  ) => {
    return (
      <a ref={ref} className={s.avatar} onClick={onClick} talla={size}>
        {image ? (
          <Image
            src={image}
            alt={alt.charAt(1).toUpperCase()}
            layout="fill"
            objectFit="cover"
            className={s.img}
          />
        ) : (
          <div>{alt.charAt(0).toUpperCase()}</div>
        )}
        {upload && <UploadAvatar type={type} id={id} />}
      </a>
    )
  }
)

export default Avatar
