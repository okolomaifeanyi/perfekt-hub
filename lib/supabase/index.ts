import { createLazyProxy } from "./lazy.mjs";
import { getAuth as getSupabaseAuth } from "../shims/supabase/auth";
import { getFirestore as getSupabaseFirestore } from "../shims/supabase/firestore";

export { getSupabaseBrowserClient, getSupabaseServerClient } from "./client";
export { getSupabaseAdminClient } from "./admin";
export { updateSession } from "./middleware";
export { createClient as createBrowserClient } from "./browser";
export { createClient as createServerClient } from "./server";
export { authAdmin, firestoreAdmin, dbAdmin } from "./admin";
export {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  signInWithCustomToken,
  updateProfile,
  getAdditionalUserInfo,
  type User,
  type UserCredential,
} from "../shims/supabase/auth";
export const auth = createLazyProxy(() => getSupabaseAuth());
export const db = getSupabaseFirestore();
export {
  FieldValue,
  Timestamp,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  select,
  startAt,
  endAt,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type FirestoreData,
  type FirestoreError,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  type WriteBatch,
} from "../shims/supabase/firestore";
export {
  getDatabase,
  onDisconnect,
  ref,
  serverTimestamp as realtimeServerTimestamp,
  set,
  update,
} from "../shims/supabase/database";
