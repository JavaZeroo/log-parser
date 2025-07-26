export function mergeFilesWithReplacement(prevFiles, newFiles) {
  const updated = [...prevFiles];
  newFiles.forEach(file => {
    const idx = updated.findIndex(f => f.name === file.name);
    if (idx !== -1) {
      const existing = updated[idx];
      updated[idx] = { ...file, enabled: existing.enabled, config: existing.config };
    } else {
      updated.push(file);
    }
  });
  return updated;
}
