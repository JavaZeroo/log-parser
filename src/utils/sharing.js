import LZString from 'lz-string';

/**
 * Serializes the application state into a compressed, URL-safe string.
 * @param {object} state The application state to serialize.
 * @returns {string} The compressed state string.
 */
export function serializeStateForURL(state) {
  try {
    const jsonString = JSON.stringify(state);
    return LZString.compressToEncodedURIComponent(jsonString);
  } catch (error) {
    console.error("Failed to serialize state:", error);
    return '';
  }
}

/**
 * Deserializes the application state from a URL hash.
 * @returns {object|null} The deserialized state object, or null if not present or invalid.
 */
export function deserializeStateFromURL() {
  try {
    const hash = window.location.hash.slice(1);
    if (!hash) return null;

    const params = new URLSearchParams(hash);
    const compressedState = params.get('s');

    if (!compressedState) return null;

    const jsonString = LZString.decompressFromEncodedURIComponent(compressedState);
    if (!jsonString) return null;

    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to deserialize state:", error);
    return null;
  }
}
