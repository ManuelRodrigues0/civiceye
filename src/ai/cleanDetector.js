import * as tmImage from "@teachablemachine/image";

let model;

export async function loadModel() {
  if (!model) {
    const modelURL = "/model/model.json";
    const metadataURL = "/model/metadata.json";

    model = await tmImage.load(modelURL, metadataURL);
    console.log("Pollution classifier loaded");
  }
}

export async function analyzeImage(imgElement) {
  if (!model) await loadModel();

  const predictions = await model.predict(imgElement);

  // Convert predictions array into an object
  let probs = {};

  predictions.forEach(p => {
    probs[p.className.toLowerCase()] = p.probability;
  });

  // Find highest probability class
  let best = predictions.reduce((a, b) =>
    a.probability > b.probability ? a : b
  );

  return {
  label: best.className.toLowerCase(),
  confidence: best.probability,

  clean: probs.clean || 0,
  moderate: probs.moderate || 0,
  dirty: probs.dirty || 0
};
}