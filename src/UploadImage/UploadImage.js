import { uploadImage } from '@/firebase/client'
import { useEffect, useState } from 'react'
import {
  DoneIcon,
  UploadIcon,
  UploadingIcon,
  WarningIcon
} from '../utils/Icons'

export default function UploadImage({
  storeRef = null,
  upladedImage = () => {}
}) {
  const [task, setTask] = useState()
  const [progress, setProgress] = useState(0)
  const handleChangeImage = (e) => {
    const file = e.target.files[0]
    const task = uploadImage({ storeRef, file })
    setTask(task)
  }

  useEffect(() => {
    if (task) {
      const onProgress = (snapshot) => {
        setUpladStatus('RUNNING')
        let progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        console.log('Upload is ' + progress + '% done')
        /* switch (snapshot.state) {
          case firebase.storage.TaskState.PAUSED: // or 'paused'
            console.log('Upload is paused')
            break
          case firebase.storage.TaskState.RUNNING: // or 'running'
            console.log('Upload is running')
            break
        } */
      }
      const onError = (err) => {
        console.log('erro', err)
      }
      const onComplete = () => {
        task.snapshot.ref.getDownloadURL().then(function (downloadURL) {
          upladedImage(downloadURL)
        })
        setUpladStatus('DONE')
        setTimeout(() => {
          setUpladStatus('READY')
        }, 1000)
      }
      task.on('state_change', onProgress, onError, onComplete)
    }
  }, [task])

  const [upladStatus, setUpladStatus] = useState('READY')

  const STATUS_ICONS = {
    READY: <UploadIcon />,
    RUNNING: <UploadingIcon />,
    DONE: <DoneIcon />,
    ERROR: <WarningIcon />
  }

  return (
    <label>
      {STATUS_ICONS[upladStatus]}
      <input
        onChange={handleChangeImage}
        style={{ display: 'none' }}
        type="file"
        name="uplad-image"
      />
    </label>
  )
}
