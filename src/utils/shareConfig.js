import LZString from 'lz-string';

export function encodeConfig(data) {
  const json = JSON.stringify(data);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeConfig(encoded) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    console.error('Failed to decode config', e);
    return null;
  }
}
