export const chunkArray = (items, size) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const chunkSize = Math.max(1, size || 100);
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};
