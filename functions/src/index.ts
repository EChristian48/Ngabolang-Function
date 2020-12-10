import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { Aggregates, Post, User } from './types'
import * as sharp from 'sharp'
import fetch from 'node-fetch'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
const serviceAccount = require('../serviceAccount.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'ngabolang.appspot.com',
})

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

export const createPostThumbnail = functions.firestore
  .document('posts/{postId}')
  .onCreate(async snapshot => {
    const postData = snapshot.data() as Post
    console.log(
      `Starting compression on ${snapshot.id}, Original Image: ${postData.url}`
    )

    const tempPath = path.join(os.tmpdir(), `thumb-${snapshot.id}.jpeg`)

    const res = await fetch(postData.url)
    const buffer = await res.buffer()

    try {
      await sharp(buffer).resize(300).toFormat('jpeg').toFile(tempPath)
      const uploadRes = await storage.upload(tempPath)
      const thumbUrl = await uploadRes[0].getSignedUrl({
        action: 'read',
        expires: '03-09-2491',
      })

      console.log(`Created Thumbnail, ${thumbUrl}`)
      fs.unlinkSync(tempPath)
      console.log('FUCKING DELTETED')

      return snapshot.ref.set({ ...postData, thumbUrl: thumbUrl[0] })
    } catch (e) {
      return console.error({ error: e.message })
    }

    // return gm(buffer)
    //   .compress('JPEG')
    //   .write(tempPath, async err => {
    //     if (err) {
    //       return console.log('Error Compressing!', { err })
    //     }

    //     const uploadRes = await storage.upload(tempPath)
    //     const thumbUrl = await uploadRes[0].getSignedUrl({
    //       action: 'read',
    //       expires: '03-09-2491',
    //     })

    //     return snapshot.ref.update({ thumbUrl })
    //   })
  })
