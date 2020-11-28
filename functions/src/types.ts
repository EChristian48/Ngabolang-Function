import firebase from 'firebase/app'

export type User = Pick<
  firebase.User,
  'displayName' | 'email' | 'uid' | 'photoURL'
> & {
  favorites: string[]
  posts: number
}

export type Post = {
  url: string
  thumbUrl: string
  location: string
  date: firebase.firestore.FieldValue | firebase.firestore.Timestamp
} & Pick<User, 'uid'>

export type Aggregates = {
  count: number
}
