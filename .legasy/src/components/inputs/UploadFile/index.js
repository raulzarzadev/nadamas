import { removeFile, uploadFile } from '@/legasy/firebase/files'
import {
  DoneIcon,
  TrashBinIcon,
  UploadIcon,
  UploadingIcon,
  WarningIcon
} from '@/legasy/src/utils/Icons'
import DeleteModal from '@/legasy/src/components/Modals/DeleteModal'
import { useEffect, useState } from 'react'
import Button from '../Button'

export default function UploadFile({
  storeRef = null,
  file = null,
  fileUploaded = () => {},
  fileDeleted = () => {}
}) {
  const [task, setTask] = useState()
  const [progress, setProgress] = useState(0)
  const handleChangeImage = (e) => {
    const file = e.target.files[0]
    uploadFile({ storeRef, file })
      .then((res) => {
        setTask(res?.task)
      })
      .catch((err) => console.log(`err`, err))
  }

  useEffect(() => {
    if (task) {
      const onProgress = (snapshot) => {
        setUpladStatus('RUNNING')
        let progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        // console.log('Upload is ' + progress + '% done')
      }
      const onError = (err) => {
        // console.log('erro', err)
      }
      const onComplete = () => {
        task.snapshot.ref.getDownloadURL().then(function (downloadURL) {
          fileUploaded(downloadURL)
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
    READY: <UploadIcon size="1rem" />,
    RUNNING: <UploadingIcon size="1rem" />,
    DONE: <DoneIcon size="1rem" />,
    ERROR: <WarningIcon size="1rem" />,
    REDY_TO_DELETE: <TrashBinIcon size="1rem" />,
    DELETED: <DoneIcon />
  }

  const [openDelete, setOpenDelete] = useState()
  const handleOpenDelete = (e) => {
    setOpenDelete(!openDelete)
  }
  const [deleteStatus, setDeleteStatus] = useState(null)
  const handleDeleteFile = async (e) => {
    await removeFile({ file })
      .then((res) => {
        fileDeleted()
        setDeleteStatus('DELETED')
        setTimeout(() => {
          setDeleteStatus(null)
        }, 400);
      })
      .catch((err) => console.log(`err`, err))
  }

  useEffect(() => {
    console.log(`file`, file)
    if (file) setDeleteStatus('REDY_TO_DELETE')
  }, [file])

  return (
    <div className="flex">
      <label className="mx-1">
        {STATUS_ICONS[upladStatus]}
        <input
          onChange={handleChangeImage}
          style={{ display: 'none' }}
          type="file"
          name="uplad-image"
        />
      </label>
      {deleteStatus && (
        <div className="mx-1">
          <Button
            size="sm"
            iconOnly
            variant="outlined"
            className="flex"
            type="button"
            onClick={handleOpenDelete}
          >
            {STATUS_ICONS[deleteStatus]}
          </Button>
          <DeleteModal
            handleOpen={handleOpenDelete}
            open={openDelete}
            handleDelete={handleDeleteFile}
          ></DeleteModal>
        </div>
      )}
    </div>
  )
}
