import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { Aggregates, Post, User } from './types'

admin.initializeApp()

const firestore = admin.firestore()
const storage = admin.storage().bucket()

export const createUserDocument = functions.auth
  .user()
  .onCreate(({ displayName, uid, photoURL, email }) => {
    return firestore.collection('users').doc(uid).set({
      displayName,
      email,
      uid,
      photoURL,
      favorites: [],
      posts: 0,
    })
  })

export const aggregatePostsCreate = functions.firestore
  .document('posts/{postId}')
  .onCreate(post => {
    const { uid } = post.data() as Post

    const postCountRef = firestore.collection('aggregates').doc('posts')
    const userDocRef = firestore.collection('users').doc(uid)

    return Promise.all([
      firestore.runTransaction(async transaction => {
        const snapshot = await transaction.get(postCountRef)
        const data = snapshot.data() as Aggregates
        return transaction.set(postCountRef, { ...data, count: data.count + 1 })
      }),
      firestore.runTransaction(async transaction => {
        const snapshot = await transaction.get(userDocRef)
        const data = snapshot.data() as User
        const newData: User = { ...data, posts: data.posts + 1 }
        return transaction.set(userDocRef, newData)
      }),
    ])
  })

export const aggregatePostsDelete = functions.firestore
  .document('posts/{postId}')
  .onDelete(post => {
    const { uid } = post.data() as Post

    const postCountRef = firestore.collection('aggregates').doc('posts')
    const userDocRef = firestore.collection('users').doc(uid)

    return Promise.all([
      firestore.runTransaction(async transaction => {
        const snapshot = await transaction.get(postCountRef)
        const data = snapshot.data() as Aggregates
        return transaction.set(postCountRef, { ...data, count: data.count - 1 })
      }),
      firestore.runTransaction(async transaction => {
        const snapshot = await transaction.get(userDocRef)
        const data = snapshot.data() as User
        const newData: User = { ...data, posts: data.posts - 1 }
        return transaction.set(userDocRef, newData)
      }),
    ])
  })

// export const createPostThumbnail = functions.firestore
//   .document('posts/{postId}')
//   .onCreate(async snapshot => {
//     const postData = snapshot.data() as Post

//     const tempPath = path.join(os.tmpdir(), `thumb-${snapshot.id}.jpeg`)

//     const res = await fetch(postData.url)
//     const buffer = await res.buffer()

//     return gm(buffer)
//       .compress('JPEG')
//       .write(tempPath, async err => {
//         if (err) {
//           return console.log('Error Compressing!', { err })
//         }

//         const uploadRes = await storage.upload(tempPath)
//         const thumbUrl = await uploadRes[0].getSignedUrl({
//           action: 'read',
//           expires: '03-09-2491',
//         })

//         return snapshot.ref.update({ thumbUrl })
//       })
//   })
