import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { Aggregates, Post, User } from './types'

admin.initializeApp()

const fs = admin.firestore()

export const createUserDocument = functions.auth
  .user()
  .onCreate(({ displayName, uid, photoURL, email }) => {
    return fs.collection('users').doc(uid).set({
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

    const postCountRef = fs.collection('aggregates').doc('posts')
    const userDocRef = fs.collection('users').doc(uid)

    return Promise.all([
      fs.runTransaction(async transaction => {
        const snapshot = await transaction.get(postCountRef)
        const data = snapshot.data() as Aggregates
        return transaction.set(postCountRef, { ...data, count: data.count + 1 })
      }),
      fs.runTransaction(async transaction => {
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

    const postCountRef = fs.collection('aggregates').doc('posts')
    const userDocRef = fs.collection('users').doc(uid)

    return Promise.all([
      fs.runTransaction(async transaction => {
        const snapshot = await transaction.get(postCountRef)
        const data = snapshot.data() as Aggregates
        return transaction.set(postCountRef, { ...data, count: data.count - 1 })
      }),
      fs.runTransaction(async transaction => {
        const snapshot = await transaction.get(userDocRef)
        const data = snapshot.data() as User
        const newData: User = { ...data, posts: data.posts - 1 }
        return transaction.set(userDocRef, newData)
      }),
    ])
  })

// export const compressPost = functions.storage.object().onFinalize(async obj => {
//   const { name, contentType } = obj
//   const filename = (<string>name).split('/')[1]
//   const tempPath = path.join(os.tmpdir(), <string>filename)
//   await st.file(<string>name).download({ destination: tempPath })
//   const file = await imagemin([tempPath], {})
// })
