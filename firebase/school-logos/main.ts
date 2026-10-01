import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { auth, storage } from '@/firebase/index'

export function uploadSchoolLogo(file: File, onProgress: (progress: number) => void) {
  const uid = auth.currentUser?.uid
  if (!uid) return Promise.reject(new Error('SCHOOL_SESSION_MISSING'))
  return new Promise<string>((resolve, reject) => {
    const task = uploadBytesResumable(
      ref(storage, `school-logos/${uid}/${crypto.randomUUID()}`),
      file,
      { contentType: file.type }
    )
    task.on(
      'state_changed',
      (snapshot) => {
        onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100))
      },
      reject,
      () => {
        getDownloadURL(task.snapshot.ref).then(resolve, reject)
      }
    )
  })
}
