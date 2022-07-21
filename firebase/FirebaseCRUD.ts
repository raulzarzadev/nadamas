import { getAuth } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, Timestamp, updateDoc, where } from "firebase/firestore";
// import { deepFormatFirebaseDates } from "./deepFormatFirebaseDates";
import { Dates } from 'firebase-dates-util'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { v4 as uidGenerator } from 'uuid';
import { db, storage } from ".";


interface FirebaseResponse {
  id: string,
  message?: string,
  info?: any
}

export class FirebaseCRUD {
  constructor(
    private collectionName: string = '',

  ) { }

  async create(item: object) {
    const currentUser = getAuth().currentUser
    // if (!this.currentUser) return console.error('No user logged')
    const newItem = {
      ...Dates.deepFormatObjectDates({
        createdAt: new Date(),
        userId: currentUser?.uid,
        ...item
      }, 'number')
    }

    return await addDoc(collection(db, this.collectionName), newItem)
      .then((res) => this.CRUDResponse(true, `CREATED`, res))
      .catch((err) => console.error(err))
  }

  async update(itemId: string, item: object) {
    const newItem = {
      ...Dates.deepFormatObjectDates({
        updatedAt: Timestamp.now(),
        ...item
      }, 'number')
    }
    // console.log(newItem)
    return await updateDoc(doc(db, this.collectionName, itemId), newItem)
      .then(res => this.CRUDResponse(true, `UPDATED`, { id: itemId }))
      .catch(err => console.error(err))
  }

  async delete(itemId: string) {
    return await deleteDoc(doc(db, this.collectionName, itemId))
      .then(res => this.CRUDResponse(true, `DELETED`, { id: itemId }))
      .catch(err => console.error(err))
  }

  async get(itemId: string) {
    const ref = doc(db, this.collectionName, itemId)
    const docSnap = await getDoc(ref)
    return FirebaseCRUD.normalizeDoc(docSnap)
  }

  async listen(itemId: string, cb: CallableFunction) {
    const q = doc(db, this.collectionName, itemId)
    onSnapshot(q, (doc) => {
      cb(FirebaseCRUD.normalizeDoc(doc))
    })
  }

  static formatResponse = (ok: boolean, type: string, res: any) => {
    if (!ok) throw new Error(type)
    const formatedType = type?.toUpperCase()
    return { type: formatedType, ok, res }
  }

  CRUDResponse(ok: boolean, type: string, res: FirebaseResponse) {
    const formatType = `${!ok ? `ERROR_` : ''}${this.collectionName.slice(0, -1)}_${type}`.toUpperCase()
    return {
      ok,
      type: formatType,
      res
    }
  }

  static normalizeDoc(doc) {
    if (!doc?.exists()) return null
    const data = doc.data()
    const id = doc.id
    const res = Dates.deepFormatObjectDates(data, 'number')
    return {
      id,
      ...res
    }
  }


  async listenUserDocs(cb: CallableFunction) {
    const currentUser = getAuth().currentUser
    this.listenMany([where('userId', '==', currentUser.uid)], cb)
  }


  async listenMany(filters: any[], cb: CallableFunction) {
    this.listenDocs(filters, cb)
  }


  async listenDocs(filters: any[], cb: CallableFunction) {
    /**
    * @param filters: any[]
    * * Recive an array of where firebase filters 
    *  [where('userId', '==', userId || null)]
    */
    if (!filters) return console.error('Should have filters implentade')
    const q = query(
      collection(db, this.collectionName),
      ...filters
    )

    onSnapshot(q, (querySnapshot) => {
      const res = []
      querySnapshot.forEach((doc) => {
        res.push(FirebaseCRUD.normalizeDoc(doc))
      })
      cb(res)
    })

  }

  async listenAll(cb: CallableFunction) {
    const q = query(
      collection(db, this.collectionName),
    )

    onSnapshot(q, (querySnapshot) => {
      const res = []
      querySnapshot.forEach((doc) => {
        res.push(FirebaseCRUD.normalizeDoc(doc))
      })
      cb(res)
    })
  }

  static uploadFile = (
    {
      file,
      fieldName = 'image'
    }: {
      file: Blob | Uint8Array | ArrayBuffer,
      fieldName?: string
    },
    cb = (progress: number = 0, downloadURL: string | null = null): void => { }
  ) => {
    const storageRef = (path = '') => ref(storage, path)
    const uuid = uidGenerator()
    const imageRef = storageRef(`${fieldName}/${uuid}`)
    const uploadTask = uploadBytesResumable(imageRef, file)

    uploadTask.on('state_changed',
      (snapshot) => {
        // Observe state change events such as progress, pause, and resume
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        const progress = (snapshot.bytesTransferred / (snapshot.totalBytes + 1)) * 100;
        console.log('Upload is ' + progress + '% done');
        cb(progress, null)
        switch (snapshot.state) {
          case 'paused':
            console.log('Upload is paused');
            break;
          case 'running':
            console.log('Upload is running');
            break;
        }
      },
      (error) => {
        // Handle unsuccessful uploads
      },
      () => {
        // Handle successful uploads on complete
        // For instance, get the download URL: https://firebasestorage.googleapis.com/...
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          console.log('File available at', downloadURL);
          cb(100, downloadURL)
        });

      }
    );
    /*   uploadBytes(storageRef(storagePath), file).then((snapshot) => {
        console.log('Uploaded a blob or file!');
      } */
  }
}


