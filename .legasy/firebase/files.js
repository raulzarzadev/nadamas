import { mFirebase } from '.'
import { formatResponse } from './firebase-helpers'
/* -------------------- */
/* ------FILES------ */
/* -------------------- */

export const uploadFile = async ({ storeRef = undefined, file }) => {
  if (!storeRef) return formatResponse(false, 'TYPE_UNDEFINED')
  const ref = mFirebase.storage().ref(storeRef)
  const task = ref.put(file)
  return task
}

export const uploadImage = ({ storeRef = undefined, file }) => {
  if (!storeRef) return { ok: false, type: 'REF_NOT_INCLUDED' }
  const ref = mFirebase.storage().ref(storeRef)
  const task = ref.put(file)
  return task
}

export const removeFile = async ({ file, origin }) => {
  const fileRef = mFirebase.storage().refFromURL(file)
  return await fileRef
    .delete()
    .then((res) => formatResponse(true, 'FILE_DELETED', res))
    .catch((err) => formatResponse(false, 'DELETED_ERROR', err))
}
