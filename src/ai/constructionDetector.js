import * as tf from "@tensorflow/tfjs";

let model;
let labels;

// Load model
async function loadModel() {

  if (!model) {

    model = await tf.loadLayersModel(
      "/src/ai/constructionModel/model.json"
    );

    const metadata = await fetch(
      "/src/ai/constructionModel/metadata.json"
    );

    const meta = await metadata.json();
    labels = meta.labels;

  }

}

// Analyze image
export async function analyzeConstruction(img) {

  await loadModel();

  const tensor = tf.browser.fromPixels(img)
    .resizeNearestNeighbor([224, 224])
    .toFloat()
    .div(255.0)
    .expandDims();

  const prediction = model.predict(tensor);
  const data = await prediction.data();

  let maxIndex = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i] > data[maxIndex]) {
      maxIndex = i;
    }
  }

  return {
    label: labels[maxIndex],
    confidence: data[maxIndex]
  };

}