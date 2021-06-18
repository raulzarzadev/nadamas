import { updateAtlete, updateRecord, uploadFile } from '@/firebase/client'
import router from 'next/router'
import { useEffect, useState } from 'react'
import { AddImageIcon, UpladIcon } from '../utils/Icons'
import s from './styles.module.css'

export default function UploadRecordImage({ type, id, setUrl }) {
  const handleChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      const onProgess = (e) => {
        console.log('e', e)
      }
      const task = await uploadFile({ type: 'record', id, file })
      const url = await task.ref.getDownloadURL()
      setUrl(url)
    }
  }

  useEffect(() => {
    const photo = document.querySelector('#photo')
    const camera = document.querySelector('#camera')
    camera.addEventListener('change', function (e) {
      photo.src = URL.createObjectURL(e.target.files[0])
    })
    console.log('photo, camera', photo, camera)
  })

  return (
    <>
      <label className={s.upload}>
        <AddImageIcon />
        <img id="photo" style={{ width: 100, height: 100 }} />
        <input
          id="camera"
          accept="image/*"
          name="avatar-image"
          onChange={handleChange}
          capture="camera"
          type="file"
          style={{ display: 'none' }}
        ></input>
      </label>
    </>
  )
}
