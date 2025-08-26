export function encodeConfig(data) {
  const json = JSON.stringify(data);
  const base64 = typeof btoa === 'function'
    ? btoa(json)
    : Buffer.from(json, 'utf-8').toString('base64');
  return encodeURIComponent(base64);
}

export function decodeConfig(encoded) {
  try {
    const base64 = decodeURIComponent(encoded);
    const json = typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to decode config', e);
    return null;
  }
}
