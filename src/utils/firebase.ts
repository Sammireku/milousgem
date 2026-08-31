import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { Character, StoryBook, UserAccount } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Subscribe to Auth State Changes
 */
export function subscribeToAuthChanges(callback: (user: UserAccount | null) => void) {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      const profile = await fetchUserProfile(fbUser.uid);
      if (profile) {
        callback(profile);
      } else {
        const defaultAccount: UserAccount = {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Storyteller',
          email: fbUser.email || 'user@milousgem.ai',
          avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
          authProvider: fbUser.isAnonymous ? 'guest' : fbUser.providerData?.[0]?.providerId.includes('google') ? 'google' : 'email',
          createdAt: Date.now(),
          genrePreferences: ['fantasy', 'steampunk', 'cyberpunk', 'cozy_mystery'],
          bio: 'Chronicle Weaver powered by Gemini AI and MilousGem Studio.',
        };
        await syncUserProfile(defaultAccount);
        callback(defaultAccount);
      }
    } else {
      callback(null);
    }
  });
}

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<UserAccount> {
  const result = await signInWithPopup(auth, googleProvider);
  const fbUser = result.user;

  const userAccount: UserAccount = {
    id: fbUser.uid,
    name: fbUser.displayName || 'Google Storyteller',
    email: fbUser.email || 'user@milousgem.ai',
    avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
    authProvider: 'google',
    createdAt: Date.now(),
    genrePreferences: ['fantasy', 'steampunk', 'cyberpunk', 'cozy_mystery'],
    bio: 'Chronicle Weaver powered by Gemini AI and MilousGem Studio.',
  };

  await syncUserProfile(userAccount);
  return userAccount;
}

/**
 * Sign up with Email and Password
 */
export async function signUpWithEmail(email: string, pass: string, name?: string): Promise<UserAccount> {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  const fbUser = result.user;

  if (name) {
    await updateProfile(fbUser, { displayName: name });
  }

  const userAccount: UserAccount = {
    id: fbUser.uid,
    name: name || fbUser.email?.split('@')[0] || 'Storyteller',
    email: fbUser.email || email,
    avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
    authProvider: 'email',
    createdAt: Date.now(),
    genrePreferences: ['fantasy', 'solarpunk', 'fairytale'],
    bio: 'Storyteller exploring imaginative realms.',
  };

  await syncUserProfile(userAccount);
  return userAccount;
}

/**
 * Sign in with Email and Password
 */
export async function signInWithEmail(email: string, pass: string): Promise<UserAccount> {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  const fbUser = result.user;

  const existing = await fetchUserProfile(fbUser.uid);
  if (existing) return existing;

  const userAccount: UserAccount = {
    id: fbUser.uid,
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Storyteller',
    email: fbUser.email || email,
    avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
    authProvider: 'email',
    createdAt: Date.now(),
    genrePreferences: ['fantasy', 'cyberpunk'],
  };

  await syncUserProfile(userAccount);
  return userAccount;
}

/**
 * Sign in as Guest / Anonymous
 */
export async function signInAsGuest(): Promise<UserAccount> {
  const result = await signInAnonymously(auth);
  const fbUser = result.user;

  const userAccount: UserAccount = {
    id: fbUser.uid,
    name: 'Guest Chronicler',
    email: 'guest@milousgem.local',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
    authProvider: 'guest',
    createdAt: Date.now(),
    genrePreferences: ['fantasy', 'steampunk', 'cozy_mystery'],
    bio: 'Guest storyteller exploring interactive branching chronicles.',
  };

  await syncUserProfile(userAccount);
  return userAccount;
}

/**
 * Sign Out
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Synchronize User Profile to Firestore
 */
export async function syncUserProfile(user: UserAccount): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', user.id);
    await setDoc(userDocRef, { ...user, updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    console.warn('Firestore profile sync note:', err);
  }
}
export const saveUserProfile = syncUserProfile;

/**
 * Fetch User Profile from Firestore
 */
export async function fetchUserProfile(userId: string): Promise<UserAccount | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserAccount;
    }
  } catch (err) {
    console.warn('Firestore fetch user profile note:', err);
  }
  return null;
}

/**
 * Sync Character to Firestore
 */
export async function saveCharacterToCloud(userId: string, character: Character): Promise<void> {
  try {
    const charDocRef = doc(db, 'users', userId, 'characters', character.id);
    await setDoc(charDocRef, { ...character, userId }, { merge: true });
  } catch (err) {
    console.warn('Firestore character save note:', err);
  }
}
export const saveCharacterToFirestore = saveCharacterToCloud;

/**
 * Delete Character from Firestore
 */
export async function deleteCharacterFromCloud(userId: string, characterId: string): Promise<void> {
  try {
    const charDocRef = doc(db, 'users', userId, 'characters', characterId);
    await deleteDoc(charDocRef);
  } catch (err) {
    console.warn('Firestore character delete note:', err);
  }
}
export const deleteCharacterFromFirestore = deleteCharacterFromCloud;

/**
 * Fetch All User Characters from Firestore
 */
export async function fetchUserCharactersFromCloud(userId: string): Promise<Character[]> {
  try {
    const colRef = collection(db, 'users', userId, 'characters');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => d.data() as Character);
  } catch (err) {
    console.warn('Firestore fetch characters note:', err);
    return [];
  }
}
export const syncUserCharactersFromCloud = fetchUserCharactersFromCloud;

/**
 * Save StoryBook to Firestore
 */
export async function saveStoryToCloud(userId: string, story: StoryBook): Promise<void> {
  try {
    const storyDocRef = doc(db, 'users', userId, 'stories', story.id);
    await setDoc(storyDocRef, { ...story, userId, updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    console.warn('Firestore story save note:', err);
  }
}
export const saveStoryToFirestore = saveStoryToCloud;

/**
 * Delete StoryBook from Firestore
 */
export async function deleteStoryFromCloud(userId: string, storyId: string): Promise<void> {
  try {
    const storyDocRef = doc(db, 'users', userId, 'stories', storyId);
    await deleteDoc(storyDocRef);
  } catch (err) {
    console.warn('Firestore story delete note:', err);
  }
}
export const deleteStoryFromFirestore = deleteStoryFromCloud;

/**
 * Fetch All User Stories from Firestore
 */
export async function fetchUserStoriesFromCloud(userId: string): Promise<StoryBook[]> {
  try {
    const colRef = collection(db, 'users', userId, 'stories');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => d.data() as StoryBook);
  } catch (err) {
    console.warn('Firestore fetch stories note:', err);
    return [];
  }
}
export const syncUserStoriesFromCloud = fetchUserStoriesFromCloud;
