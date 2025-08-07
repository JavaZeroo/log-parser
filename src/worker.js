self.onmessage = (event) => {
  const files = event.data;
  const fileArray = Array.from(files);

  if (fileArray.length === 0) {
    self.postMessage([]);
    return;
  }

  const processedFiles = fileArray.map(file => ({
    file,
    name: file.name,
    id: Math.random().toString(36).substr(2, 9),
    data: null,
    content: null,
  }));

  Promise.all(
    processedFiles.map(fileObj =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          fileObj.content = e.target.result;
          // Don't send the raw file object back
          delete fileObj.file;
          resolve(fileObj);
        };
        reader.onerror = (e) => {
          // Handle potential errors
          console.error("FileReader error:", e);
          fileObj.content = "Error reading file";
          delete fileObj.file;
          resolve(fileObj);
        }
        reader.readAsText(fileObj.file);
      })
    )
  ).then(filesWithContent => {
    self.postMessage(filesWithContent);
  });
};
