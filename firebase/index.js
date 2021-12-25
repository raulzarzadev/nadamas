import firebase from 'firebase/app'
import 'firebase/storage'
import 'firebase/firestore'
import 'firebase/auth'


const firebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_CONFIG



if (!firebase?.apps?.length) {
  firebase.initializeApp(JSON.parse(firebaseConfig))

  firebase.firestore().settings({
    merge: true,
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
  });


  firebase.firestore().enablePersistence()
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled
        // in one tab at a a time.
        // ...
      } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the
        // features required to enable persistence
        // ...
      }
    });

}


export const mFirebase = firebase
export const db = firebase.firestore()
