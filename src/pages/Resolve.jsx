import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { analyzeImage } from "../ai/cleanDetector";
import { getClipEmbedding, cosineSimilarity } from "../ai/clipService";
import "../styles/resolve.css";
// 🔒 Get current GPS location
const getLocation = () =>
  new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject)
  );

// 📏 Calculate distance between two GPS points
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const toRad = x => x * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Resolve() {
  const { id } = useParams();

  const [report, setReport] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
  if (toast) {
    setTimeout(() => setToast(null), 3000);
  }
}, [toast]);

  // load report
  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, "reports", id));
      setReport(snap.data());
    };
    load();
  }, [id]);

  // ☁️ CLOUDINARY UPLOAD FUNCTION
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "civiceye"); // your preset

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dpotccr5q/image/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();
    return data.secure_url;
  };

  async function generateSceneEmbeddings(file) {

  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  await img.decode();

  const createCrop = async (x,y,w,h) => {

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = w;
    canvas.height = h;

    ctx.drawImage(img,x,y,w,h,0,0,w,h);

    return new Promise(res => canvas.toBlob(res,"image/jpeg"));

  }

  const embeddings = [];

  embeddings.push(await getClipEmbedding(file));

  const center = await createCrop(
    img.width*0.2,
    img.height*0.2,
    img.width*0.6,
    img.height*0.6
  );
  embeddings.push(await getClipEmbedding(new File([center],"center.jpg")));

  const zoom = await createCrop(
    img.width*0.1,
    img.height*0.1,
    img.width*0.8,
    img.height*0.8
  );
  embeddings.push(await getClipEmbedding(new File([zoom],"zoom.jpg")));

  const top = await createCrop(
    0,
    0,
    img.width,
    img.height*0.5
  );
  embeddings.push(await getClipEmbedding(new File([top],"top.jpg")));

  const bottom = await createCrop(
    0,
    img.height*0.5,
    img.width,
    img.height*0.5
  );
  embeddings.push(await getClipEmbedding(new File([bottom],"bottom.jpg")));

  const left = await createCrop(
    0,
    0,
    img.width*0.5,
    img.height
  );
  embeddings.push(await getClipEmbedding(new File([left],"left.jpg")));

  const right = await createCrop(
    img.width*0.5,
    0,
    img.width*0.5,
    img.height
  );
  embeddings.push(await getClipEmbedding(new File([right],"right.jpg")));

  // HORIZON / BACKGROUND
const horizon = await createCrop(
  0,
  img.height * 0.25,
  img.width,
  img.height * 0.35
);
embeddings.push(await getClipEmbedding(new File([horizon],"horizon.jpg")));


// FAR BACKGROUND
const far = await createCrop(
  img.width * 0.15,
  img.height * 0.1,
  img.width * 0.7,
  img.height * 0.3
);
embeddings.push(await getClipEmbedding(new File([far],"far.jpg")));


// MIDDLE STRIP
const middle = await createCrop(
  0,
  img.height * 0.35,
  img.width,
  img.height * 0.25
);
embeddings.push(await getClipEmbedding(new File([middle],"middle.jpg")));


// NARROW CENTER
const narrow = await createCrop(
  img.width * 0.3,
  img.height * 0.2,
  img.width * 0.4,
  img.height * 0.5
);
embeddings.push(await getClipEmbedding(new File([narrow],"narrow.jpg")));


// TOP THIRD
const topThird = await createCrop(
  0,
  0,
  img.width,
  img.height * 0.33
);
embeddings.push(await getClipEmbedding(new File([topThird],"topThird.jpg")));

// ===== LIGHTING ROBUST EMBEDDINGS =====

// GRAYSCALE (removes color differences between day/sunset/night)
const canvasGray = document.createElement("canvas");
const ctxGray = canvasGray.getContext("2d");

canvasGray.width = img.width;
canvasGray.height = img.height;

ctxGray.drawImage(img,0,0);

const imgData = ctxGray.getImageData(0,0,canvasGray.width,canvasGray.height);
const data = imgData.data;

for (let i=0;i<data.length;i+=4){
  const gray = data[i]*0.3 + data[i+1]*0.59 + data[i+2]*0.11;
  data[i]=gray;
  data[i+1]=gray;
  data[i+2]=gray;
}

ctxGray.putImageData(imgData,0,0);

const grayBlob = await new Promise(res=>canvasGray.toBlob(res,"image/jpeg"));

embeddings.push(
  await getClipEmbedding(new File([grayBlob],"gray.jpg"))
);


// HIGH CONTRAST (helps with shadows and night images)
const contrastCanvas = document.createElement("canvas");
const contrastCtx = contrastCanvas.getContext("2d");

contrastCanvas.width = img.width;
contrastCanvas.height = img.height;

contrastCtx.filter = "contrast(180%)";
contrastCtx.drawImage(img,0,0);

const contrastBlob =
  await new Promise(res=>contrastCanvas.toBlob(res,"image/jpeg"));

embeddings.push(
  await getClipEmbedding(new File([contrastBlob],"contrast.jpg"))
);


// BRIGHTNESS NORMALIZED (helps when night image is darker)
const brightCanvas = document.createElement("canvas");
const brightCtx = brightCanvas.getContext("2d");

brightCanvas.width = img.width;
brightCanvas.height = img.height;

brightCtx.filter = "brightness(130%)";
brightCtx.drawImage(img,0,0);

const brightBlob =
  await new Promise(res=>brightCanvas.toBlob(res,"image/jpeg"));

embeddings.push(
  await getClipEmbedding(new File([brightBlob],"bright.jpg"))
);


// EDGE STYLE (very strong for structures like fences, poles, buildings)
const edgeCanvas = document.createElement("canvas");
const edgeCtx = edgeCanvas.getContext("2d");

edgeCanvas.width = img.width;
edgeCanvas.height = img.height;

edgeCtx.filter = "grayscale(100%) contrast(200%)";
edgeCtx.drawImage(img,0,0);

const edgeBlob =
  await new Promise(res=>edgeCanvas.toBlob(res,"image/jpeg"));

embeddings.push(
  await getClipEmbedding(new File([edgeBlob],"edge.jpg"))
);


// HORIZONTAL FLIP (handles camera direction differences)
const flipCanvas = document.createElement("canvas");
const flipCtx = flipCanvas.getContext("2d");

flipCanvas.width = img.width;
flipCanvas.height = img.height;

flipCtx.translate(img.width,0);
flipCtx.scale(-1,1);
flipCtx.drawImage(img,0,0);

const flipBlob =
  await new Promise(res=>flipCanvas.toBlob(res,"image/jpeg"));

embeddings.push(
  await getClipEmbedding(new File([flipBlob],"flip.jpg"))
);

  return embeddings;
}
 
  // MAIN VERIFY FUNCTION
  const handleUpload = async () => {
    if (!file || !report) return setToast({message:"Upload image first",type:"error"});

    setLoading(true);

    try {

    // 🔒 GPS VERIFICATION FIRST
    const pos = await getLocation();
    const currentLat = pos.coords.latitude;
    const currentLng = pos.coords.longitude;

    const distance = getDistance(
      report.lat,
      report.lng,
      currentLat,
      currentLng
    );

    console.log("Distance from original:", distance);

    if (distance > 30) {
      setToast({ message:"❌ You are too far from original location", type:"error"});
      setLoading(false);
      return;
    }
      // 🧠 AI CHECK ON LOCAL FILE (NOT URL)
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);

      img.onload = async () => {

        const ai = await analyzeImage(img);
        console.log("AI RESULT:", ai);

        // 🧠 create embedding of AFTER photo
const afterEmbeddings = await generateSceneEmbeddings(file);

const embeddings = report.sceneEmbeddings 
  ? report.sceneEmbeddings.map(e => JSON.parse(e))
  : [report.sceneEmbedding];

// compare with all saved embeddings (multi-angle safe)
// compare with original embedding
let bestSimilarity = 0;

for (const beforeEmb of embeddings) {

  for (const afterEmb of afterEmbeddings) {

    const sim = cosineSimilarity(beforeEmb, afterEmb);

    if (sim > bestSimilarity) {
      bestSimilarity = sim;
    }

  }

}
console.log("Best similarity:", bestSimilarity);

if (bestSimilarity < 0.70) {
  setToast({message:"❌ Different location detected — fake cleanup" ,type:"error"});
  setLoading(false);
  return;
}

        // 🧠 Compare before vs after probabilities

const cleanIncrease = ai.clean - (report.beforeClean || 0);
const dirtyDecrease = (report.beforeDirty || 0) - ai.dirty;

let finalStatus = "open";

// Fully cleaned
if (ai.clean >= 0.9) {
  finalStatus = "resolved";
}

// Moderate improvement
else if (ai.moderate > ai.dirty) {
  finalStatus = "improved";
}

// Still dirty
else {
  setToast({message:"❌ Area still dirty",type:"error"});
  setLoading(false);
  return;
}

        // ☁️ Upload AFTER AI passes (CLOUDINARY NOW)
        const afterImageUrl = await uploadToCloudinary(file);

        // update firestore
        await updateDoc(doc(db, "reports", id), {
          afterImage: afterImageUrl,
          afterLabel: ai.label,
          afterConfidence: ai.confidence,
          status: finalStatus,
        progressUpdatedAt: Date.now(),
        });

        setResult(finalStatus);
        setToast({message:"✅ Verification complete",type:"success"});
        setLoading(false);
      };

    } catch (err) {
      console.error(err);
      setToast({message:"AI failed to analyze image",type:"error"});
      setLoading(false);
    }
  };

  if (!report) return <h2>Loading...</h2>;

  return (
    <div className="resolve-container">
      <h2>Verify Cleanup</h2>

      <p className="status">Status: {report.status}</p>

      <h3>Before Photo</h3>
      <img src={report.beforeImage} />

      <hr />

      <h3>Upload After Photo</h3>
      <div className="upload-section">
      <input type="file" onChange={e => setFile(e.target.files[0])} />

      <button className="verify-btn" onClick={handleUpload} disabled={loading}>
        {loading ? "Checking..." : "Verify Cleanup"}
      </button>
      {toast && (
  <div className={`toast-card ${toast.type}`}>
    {toast.message}
  </div>
)}
      </div>

      {result && <div className="result">AI Result: {result}</div>}
    </div>
  );
}