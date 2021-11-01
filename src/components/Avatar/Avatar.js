import Image from 'next/image'
import React from 'react'
const Avatar = React.forwardRef(
  ({ image, alt = '', onClick, size = 'md' }, ref) => {
    return (
      <a ref={ref} onClick={onClick} talla={size}>
        {image ? (
          <div className='relative w-32 h-32 rounded-full'>
            <Image
              src={image}
              alt={alt.charAt(1).toUpperCase()}
              layout="fill"
              objectFit="cover"
              className='rounded-full'
            />
          </div>
        ) : (
          <div>{alt.charAt(0).toUpperCase()}</div>
        )}
      </a>
    )
  }
)

export default Avatar
