export function newFileId() {
  return crypto.randomUUID?.() ?? crypto.getRandomValues(new Uint32Array(3)).join('-');
}

export async function readLogFiles(selection) {
  const files = Array.from(selection);
  const results = await Promise.allSettled(files.map(file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = reader.onabort = () => reject(reader.error);
    reader.readAsText(file);
  })));

  const loaded = [];
  const failed = [];
  results.forEach((result, i) => {
    const { name } = files[i];
    if (result.status === 'fulfilled') {
      loaded.push({ id: newFileId(), name, content: result.value });
    } else {
      failed.push(name);
    }
  });
  return { loaded, failed };
}
