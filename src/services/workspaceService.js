import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * Saves a user's workspace data to Firestore.
 * @param {string} userId - The ID of the user.
 * @param {object} workspaceData - The workspace data object to save.
 * @returns {Promise<void>}
 */
export const saveWorkspace = (userId, workspaceData) => {
  const workspaceRef = doc(db, 'workspaces', userId);
  return setDoc(workspaceRef, workspaceData, { merge: true });
};

/**
 * Retrieves a user's workspace data from Firestore.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<object|null>} A promise that resolves with the workspace data, or null if it doesn't exist.
 */
export const loadWorkspace = async (userId) => {
  const workspaceRef = doc(db, 'workspaces', userId);
  const docSnap = await getDoc(workspaceRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    console.log("No such workspace!");
    return null;
  }
};
