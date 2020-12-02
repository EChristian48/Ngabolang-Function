import firebase from 'firebase/app'
import { NextApiRequest, NextApiResponse } from 'next'

export type User = Pick<
  firebase.User,
  'displayName' | 'email' | 'uid' | 'photoURL'
> & {
  favorites: string[]
  posts: number
}

export type Post = {
  thumbUrl?: string
  url: string
  location: string
  date: firebase.firestore.FieldValue | firebase.firestore.Timestamp
} & Pick<User, 'uid'>

export type Aggregates = {
  count: number
}
