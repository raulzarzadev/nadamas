import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore"
import { auth, db } from "."
import { deepFormatFirebaseDates } from "./deepFormatFirebaseDates"
import { formatResponse, normalizeDoc } from "./firebase-helpers"


export const listenUserEvents = async (cb) => {
    const user = auth?.currentUser
    const q = query(
        collection(db, 'events'),
        where('userId', '==', user?.uid),
        // limit(4)
        //orderBy('updatedAt')
    )
    onSnapshot(q, (querySnapshot) => {
        const res = []
        querySnapshot.forEach((doc) => {
            res.push(normalizeDoc(doc))
        })
        cb(res)
    })
}

export const listenEvent = (...props) => {
    const eventId = props[0]
    const cb = props.pop()

    const q = doc(db, 'events', eventId)
    onSnapshot(q, (doc) => {
        cb(normalizeDoc(doc))
    })

}

export const deleteEvent = async (eventId) => {
    const eventRef = doc(db, 'events', eventId)
    return await deleteDoc(eventRef)
        .then((res) => formatResponse(true, 'EVENT_DELETED', res))
}

export const submitEvent = async (event) => {
    const user = auth?.currentUser
    const docRef = event.id ? doc(db, 'events', event?.id) : null

    const eventAlreadyExist = docRef

    if (eventAlreadyExist) {
        return await updateDoc(
            doc(db, 'events', event.id),
            {
                ...deepFormatFirebaseDates({
                    ...event, updatedAt: new Date(),
                })
            }
        )
            .then(res => formatResponse(true, 'EVENT_UPDATED', { id: event.id, ...res }))
            .catch(err => console.error(err))

    } else {

        return await addDoc(collection(db, 'events'), {
            ...deepFormatFirebaseDates({
                ...event,
                createdAt: new Date(),
                userId: user.uid
            })
        })
            .then((res) => formatResponse(true, 'EVENT_CREATED', res))
            .catch((err) => formatResponse(false, 'EVENT_CREATED_ERROR', err))
    }
}