import Link from 'next/link'
import s from './styles.module.css'
import Image from 'next/image'
import { UpladIcon } from '../utils/Icons'
export default function Avatar({ image, href, alt = '', upload, onClick }) {
  return (
    <a className={s.avatar} onClick={onClick}>
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
