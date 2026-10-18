import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { deleteApp, initializeApp } from 'firebase/app'
import { connectAuthEmulator, deleteUser, getAuth, signInAnonymously } from 'firebase/auth'
import { connectStorageEmulator, getStorage, ref, uploadBytes } from 'firebase/storage'

const host = process.env.FIREBASE_STORAGE_EMULATOR_HOST

test('Storage rules allow image uploads and public reads while protecting payment receipts', {
  skip: !host,
}, async () => {
  assert.match(host, /^(127\.0\.0\.1|localhost):\d+$/, 'Only local emulators may be tested')
  const bucket = 'nadamas-b1ecf.appspot.com'
  const app = initializeApp(
    { projectId: 'nadamas-b1ecf', apiKey: 'local-test', storageBucket: bucket },
    randomUUID()
  )
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  const storage = getStorage(app)
  const [hostname, port] = host.split(':')
  connectStorageEmulator(storage, hostname, Number(port))
  const suffix = randomUUID()
  const imagePath = `school-logos/${suffix}/logo.png`
  const receiptPath = `paymentReceipts/${suffix}/receipt.png`
  const endpoint = (path) => `http://${host}/v0/b/${bucket}/o/${encodeURIComponent(path)}`
  const user = (await signInAnonymously(auth)).user
  try {
    await uploadBytes(ref(storage, imagePath), new Uint8Array([1, 2, 3]), {
      contentType: 'image/png',
    })
    assert.equal((await fetch(`${endpoint(imagePath)}?alt=media`)).status, 200)
    await assert.rejects(
      uploadBytes(ref(storage, receiptPath), new Uint8Array([1]), { contentType: 'image/png' }),
      { code: 'storage/unauthorized' }
    )
    await assert.rejects(
      uploadBytes(ref(storage, `school-logos/${suffix}/invalid.txt`), new Uint8Array([1]), {
        contentType: 'text/plain',
      }),
      { code: 'storage/unauthorized' }
    )
    const seeded = await fetch(
      `http://${host}/v0/b/${bucket}/o?name=${encodeURIComponent(receiptPath)}`,
      {
        method: 'POST',
        headers: { authorization: 'Bearer owner', 'content-type': 'image/png' },
        body: new Uint8Array([1]),
      }
    )
    assert.equal(seeded.status, 200)
    assert.equal((await fetch(`${endpoint(receiptPath)}?alt=media`)).status, 403)
    assert.equal(
      (
        await fetch(`${endpoint(receiptPath)}?alt=media`, {
          headers: { authorization: `Bearer ${await user.getIdToken()}` },
        })
      ).status,
      403
    )
    await auth.signOut()
    await assert.rejects(
      uploadBytes(ref(storage, `school-logos/${suffix}/anonymous.png`), new Uint8Array([1]), {
        contentType: 'image/png',
      }),
      { code: 'storage/unauthorized' }
    )
  } finally {
    for (const path of [imagePath, receiptPath])
      await fetch(endpoint(path), { method: 'DELETE', headers: { authorization: 'Bearer owner' } })
    await deleteUser(user)
    await deleteApp(app)
  }
})
