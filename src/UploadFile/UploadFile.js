import { uploadFile } from '@/firebase/client'
import { UpladIcon } from '../utils/Icons'
import s from './styles.module.css'

export default function UploadFile({type, id }) {
  const handleChange = (e) => {
    console.log(e.target.files[0])
    const file = e.target.files[0]
    if (file) {
      uploadFile({ type: 'avatar', athleteId, file })
    }
  }
  return (
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
  )
}
