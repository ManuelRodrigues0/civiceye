import * as mobilenet from "@tensorflow-models/mobilenet";
import "@tensorflow/tfjs";

let model = null;

// load only once
export async function loadSceneModel() {
  if (!model) {
    model = await mobilenet.load({ version: 2, alpha: 0.5 });
    console.log("Scene model loaded");
  }
}

// extract fingerprint vector from image
export async function getImageEmbedding(imgElement) {
  if (!model) await loadSceneModel();

  // "conv_preds" gives feature vector instead of labels
  const embedding = model.infer(imgElement, true);

  // convert tensor → normal array
  const data = await embedding.data();
  embedding.dispose();

  return Array.from(data);
}

// compare similarity between two embeddings
export function compareEmbeddings(a, b) {
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

  return dot / (magA * magB); // cosine similarity (0–1)
}