import { getAuth } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db } from ".";
import { deepFormatFirebaseDates } from "./deepFormatFirebaseDates";
import { formatResponse, normalizeDoc } from "./firebase-helpers";


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


  async listenDocs(filters: any, cb: CallableFunction) {
    // let = filters = {"athlete.id":'sdasd3232 sfsf sdf'}
    if (!filters) return console.error('Should have filters implentade')
    const q = query(
      collection(db, this.collectionName),
      filters
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
}


