import { getAuth } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { deepFormatFirebaseDates } from "./deepFormatFirebaseDates";
import { formatResponse, normalizeDoc } from "./firebase-helpers";
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { v4 as uidGenerator } from 'uuid';
import { db, storage } from ".";



export class FirebaseCRUD {
  constructor(
    private collectionName: string = '',

  ) { }
  async create(item: object) {
    const currentUser = getAuth().currentUser
    console.log(currentUser)
    // if (!this.currentUser) return console.error('No user logged')
    return await addDoc(collection(db, this.collectionName), {
      ...deepFormatFirebaseDates({
        createdAt: new Date(),
        userId: currentUser?.uid,
        ...item
      })
    })
      .then((res) => formatResponse(true, `${this.collectionName}_CREATED`, res))
      .catch((err) => console.error(err))
  }

  async update(itemId: string, item: object) {
    return await updateDoc(doc(db, this.collectionName, itemId), {
      ...deepFormatFirebaseDates({ ...item, updatedAt: new Date() })
    })
      .then(res => formatResponse(true, `${this.collectionName}_UPDATED`, res))
      .catch(err => console.error(err))
  }

  async delete(itemId: string) {
    return await deleteDoc(doc(db, this.collectionName, itemId))
      .then(res => formatResponse(true, `${this.collectionName}_DELETED`, res))
      .catch(err => console.error(err))
  }

  async get(itemId: string) {
    const ref = doc(db, this.collectionName, itemId)
    const docSnap = await getDoc(ref)
    return normalizeDoc(docSnap)
  }

  async listen(itemId: string, cb: CallableFunction) {
    const q = doc(db, this.collectionName, itemId)
    onSnapshot(q, (doc) => {
      cb(normalizeDoc(doc))
    })

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
        res.push(normalizeDoc(doc))
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
        res.push(normalizeDoc(doc))
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
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
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


