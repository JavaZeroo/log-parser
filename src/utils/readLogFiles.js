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
      const id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
      loaded.push({ id, name, content: result.value });
    } else {
      failed.push(name);
    }
  });
  return { loaded, failed };
}
