import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { auth } from "../firebase";

const provider = new GoogleAuthProvider();

/**
 * Initiates the Google Sign-In popup flow.
 * @returns {Promise<UserCredential>} A promise that resolves with the user's credentials.
 */
export const signInWithGoogle = () => {
  return signInWithPopup(auth, provider);
};

/**
 * Signs the current user out.
 * @returns {Promise<void>} A promise that resolves when the sign-out is complete.
 */
export const doSignOut = () => {
  return signOut(auth);
};

/**
 * Subscribes to changes in the user's authentication state.
 * @param {function} callback - The function to call when the auth state changes.
 * It receives the user object (or null) as an argument.
 * @returns {function} An unsubscribe function.
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};
