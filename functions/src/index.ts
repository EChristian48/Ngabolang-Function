import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Aggregates } from './types'

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
    })
  })

export const aggregatePostsCreate = functions.firestore
  .document('posts/{postId}')
  .onCreate(() => {
    const postCountRef = fs.collection('aggregates').doc('posts')
    return fs.runTransaction(async transaction => {
      const snapshot = await transaction.get(postCountRef)
      const data = snapshot.data() as Aggregates
      return transaction.set(postCountRef, { ...data, count: data.count + 1 })
    })
  })

export const aggregatePostsDelete = functions.firestore
  .document('posts/{postId}')
  .onDelete(() => {
    const postCountRef = fs.collection('aggregates').doc('posts')
    return fs.runTransaction(async transaction => {
      const snapshot = await transaction.get(postCountRef)
      const data = snapshot.data() as Aggregates
      return transaction.set(postCountRef, { ...data, count: data.count - 1 })
    })
  })
