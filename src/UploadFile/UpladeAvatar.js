import { updateAtlete, uploadFile } from '@/firebase/client'
import { AddImageIcon } from '../utils/Icons'
import s from './styles.module.css'

export default function UploadAvatar({ type, id }) {
  const handleChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      const task = await uploadFile({ type, id, file })
      const url = await task.ref.getDownloadURL()
      updateAtlete({ id, avatar: url })
        .then((res) => console.log('res', res))
        .catch((err) => console.log('err', err))
    }
  }

  return (
    <>
      <label className={s.upload}>
        <AddImageIcon size="2rem" />
        <input
          id="camera"
          accept="image/*"
          name="avatar-image"
          onChange={handleChange}
          type="file"
          style={{ display: 'none' }}
        ></input>
      </label>
    </>
  )
}
