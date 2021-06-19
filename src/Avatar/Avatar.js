import s from './styles.module.css'
import Image from 'next/image'
import React from 'react'
const Avatar = React.forwardRef(
  ({ image, alt = '', onClick, size = 'md' }, ref) => {
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
      </a>
    )
  }
)

export default Avatar
