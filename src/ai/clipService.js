export async function getClipEmbedding(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("https://manuelrodrigues0-civiceye-ai.hf.space/embedding", {
  method: "POST",
  body: formData
});

  const data = await res.json();
  return data.embedding;
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  return dot / (magA * magB);
}
