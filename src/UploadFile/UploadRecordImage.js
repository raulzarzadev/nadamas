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

  return (
    <>
      <label className={s.upload}>
        <AddImageIcon />
        <input
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
