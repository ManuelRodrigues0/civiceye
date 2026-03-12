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

  // 📩 Send image for human review
const sendForHumanReview = async () => {

  if (!file) {
    setToast({ message: "Upload image first", type: "error" });
    return;
  }

  try {

    const afterImageUrl = await uploadToCloudinary(file);

    await updateDoc(doc(db, "reports", id), {
      reviewImage: afterImageUrl,
      status: "pending_human_review",
      reviewRequestedAt: Date.now()
    });

    setToast({
      message: "📩 Sent for human review",
      type: "success"
    });

  } catch (err) {

    console.error(err);

    setToast({
      message: "Failed to submit review",
      type: "error"
    });

  }

};

  async function generateGarbageEmbeddings(file) {

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

// FULL SCENE (reference)
embeddings.push(await getClipEmbedding(file));


// BOTTOM GROUND / WATER AREA
const ground = await createCrop(
  0,
  img.height * 0.6,
  img.width,
  img.height * 0.4
);
embeddings.push(
  await getClipEmbedding(new File([ground], "ground.jpg"))
);


// WATER + EDGE BOUNDARY
const waterEdge = await createCrop(
  img.width * 0.1,
  img.height * 0.45,
  img.width * 0.8,
  img.height * 0.35
);
embeddings.push(
  await getClipEmbedding(new File([waterEdge], "waterEdge.jpg"))
);


// CHANNEL STRUCTURE (drain / pipe alignment)
const channel = await createCrop(
  img.width * 0.3,
  img.height * 0.25,
  img.width * 0.4,
  img.height * 0.6
);
embeddings.push(
  await getClipEmbedding(new File([channel], "channel.jpg"))
);


// LEFT STRUCTURE (walls / banks / buildings)
// SKYLINE / FAR STRUCTURE
const skyline = await createCrop(
  0,
  0,
  img.width,
  img.height * 0.2
);
embeddings.push(
  await getClipEmbedding(new File([skyline],"skyline.jpg"))
);


// LEFT BACKGROUND STRUCTURE
const leftBackground = await createCrop(
  0,
  img.height * 0.1,
  img.width * 0.35,
  img.height * 0.5
);
embeddings.push(
  await getClipEmbedding(new File([leftBackground],"leftBg.jpg"))
);


// RIGHT BACKGROUND STRUCTURE
const rightBackground = await createCrop(
  img.width * 0.65,
  img.height * 0.1,
  img.width * 0.35,
  img.height * 0.5
);
embeddings.push(
  await getClipEmbedding(new File([rightBackground],"rightBg.jpg"))
);


// HORIZON LINE
const horizon = await createCrop(
  0,
  img.height * 0.25,
  img.width,
  img.height * 0.15
);
embeddings.push(
  await getClipEmbedding(new File([horizon],"horizon.jpg"))
);
return embeddings;

  }
  async function generateConstructionEmbeddings(file) {

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

  // FULL IMAGE
  embeddings.push(await getClipEmbedding(file));

  // ROAD CENTER
  const center = await createCrop(
    img.width * 0.25,
    img.height * 0.25,
    img.width * 0.5,
    img.height * 0.5
  );

  embeddings.push(
    await getClipEmbedding(new File([center],"center.jpg"))
  );

  // LOWER ROAD AREA
  const bottom = await createCrop(
    0,
    img.height * 0.5,
    img.width,
    img.height * 0.5
  );

  embeddings.push(
    await getClipEmbedding(new File([bottom],"bottom.jpg"))
  );

  // LEFT ROAD
  const left = await createCrop(
    0,
    img.height * 0.3,
    img.width * 0.4,
    img.height * 0.5
  );

  embeddings.push(
    await getClipEmbedding(new File([left],"left.jpg"))
  );

  // RIGHT ROAD
  const right = await createCrop(
    img.width * 0.6,
    img.height * 0.3,
    img.width * 0.4,
    img.height * 0.5
  );

  embeddings.push(
    await getClipEmbedding(new File([right],"right.jpg"))
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
let afterEmbeddings;

if (report.embeddingType === "road") {
  afterEmbeddings = await generateConstructionEmbeddings(file);
} else {
  afterEmbeddings = await generateGarbageEmbeddings(file);
}

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

if (bestSimilarity < 0.85) {

  setToast({
    message: "❌ Different location detected — fake cleanup",
    type: "error"
  });

  setResult("needs_review");   // triggers human review UI

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
            beforeImage: afterImageUrl,
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
      <input type="file"
      accept="image/*"
      capture="environment"
      onChange={e => setFile(e.target.files[0])} />

      <button className="verify-btn" onClick={handleUpload} disabled={loading}>
        {loading ? "Checking..." : "Verify Cleanup"}
      </button>
      
      {toast && (
  <div className={`toast-card ${toast.type}`}>
    {toast.message}
  </div>
)}
      </div>
      {/* Human Review Section */}
{result === "needs_review" && (

  <div className="human-review-box">

    <h3>Manual Verification</h3>

    <p>
      AI detected a different location.
      If this cleanup is real, submit the photo for human review.
    </p>

    <button
      className="review-btn"
      onClick={sendForHumanReview}
    >
      Submit for Human Review
    </button>

  </div>

)}

      {result && <div className="result">AI Result: {result}</div>}
    </div>
  );
}