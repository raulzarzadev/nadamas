import { updateAtlete, updateRecord, uploadFile } from '@/firebase/client'
import { UpladIcon } from '../utils/Icons'
import s from './styles.module.css'

export default function UploadFile({ type, id }) {
  const handleChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      await uploadFile({ type, id, file }).on(
        'state_changed',
        async function (snapshot) {
          const url = await snapshot.ref.getDownloadURL()
          type === 'avatar' && updateAtlete({ id, avatar: url })
          type === 'record' && updateRecord({ id, image: url })
        },
        (err) => console.log('err', err),
        (succ) => {
          console.log('hanlde success')
        }
      )
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
