import { useState, useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { analyzeImage } from "../ai/cleanDetector";
import { getClipEmbedding } from "../ai/clipService";
import "../styles/report.css";

function detectCategory(type, description) {
  const text = (type + " " + description).toLowerCase();

  // Waste / garbage
  if (
    text.includes("garbage") ||
    text.includes("trash") ||
    text.includes("waste") ||
    text.includes("sewage") ||
    text.includes("dirty") ||
    text.includes("plastic") ||
    text.includes("smell")
  ) {
    return "waste";
  }

  // Road / construction
  if (
    text.includes("pothole") ||
    text.includes("road") ||
    text.includes("construction") ||
    text.includes("digging") ||
    text.includes("footpath") ||
    text.includes("broken road")
  ) {
    return "road";
  }

  return "other";
}

const getLocation = () =>
  new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject)
  );

  import exifr from "exifr";

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

  // FULL SCENE (reference)
  const ground = await createCrop(
    0,
    img.height * 0.6,
    img.width,
    img.height * 0.4
  );

  // WATER + EDGE BOUNDARY
  const waterEdge = await createCrop(
    img.width * 0.1,
    img.height * 0.45,
    img.width * 0.8,
    img.height * 0.35
  );

  // CHANNEL STRUCTURE (drain / pipe alignment)
  const channel = await createCrop(
    img.width * 0.3,
    img.height * 0.25,
    img.width * 0.4,
    img.height * 0.6
  );

  // SKYLINE / FAR STRUCTURE
  const skyline = await createCrop(
    0,
    0,
    img.width,
    img.height * 0.2
  );

  // LEFT BACKGROUND STRUCTURE
  const leftBackground = await createCrop(
    0,
    img.height * 0.1,
    img.width * 0.35,
    img.height * 0.5
  );

  // RIGHT BACKGROUND STRUCTURE
  const rightBackground = await createCrop(
    img.width * 0.65,
    img.height * 0.1,
    img.width * 0.35,
    img.height * 0.5
  );

  // HORIZON LINE
  const horizon = await createCrop(
    0,
    img.height * 0.25,
    img.width,
    img.height * 0.15
  );

  // 🚀 Run embeddings in parallel
  const promises = [

    getClipEmbedding(file),

    getClipEmbedding(new File([ground], "ground.jpg")),

    getClipEmbedding(new File([waterEdge], "waterEdge.jpg")),

    getClipEmbedding(new File([channel], "channel.jpg")),

    getClipEmbedding(new File([skyline],"skyline.jpg")),

    getClipEmbedding(new File([leftBackground],"leftBg.jpg")),

    getClipEmbedding(new File([rightBackground],"rightBg.jpg")),

    getClipEmbedding(new File([horizon],"horizon.jpg"))

  ];

  const embeddings = await Promise.all(promises);

  return embeddings;

}

async function verifyImage(file, reportLat, reportLng) {
  try {
    const meta = await exifr.parse(file);

    if (!meta?.DateTimeOriginal) return false;

    const photoTime = new Date(meta.DateTimeOriginal).getTime();
    const now = Date.now();

    // must be taken within last 5 minutes
    if (Math.abs(now - photoTime) > 5 * 60 * 1000)
      return false;

    // check location distance (within 50 meters)
    if (meta.latitude && meta.longitude) {
      const dist = getDistance(
        reportLat,
        reportLng,
        meta.latitude,
        meta.longitude
      );
      if (dist > 50) return false;
    }

    return true;
  } catch {
    return false;
  }
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = x => x * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon/2)**2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function Report() {
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
  if (toast) {
    setTimeout(() => setToast(null), 3000);
  }
}, [toast]);

  // Upload image to Cloudinary
  const uploadImage = async (file) => {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "civiceye");
    data.append("cloud_name", "dpotccr5q");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dpotccr5q/image/upload",
      {
        method: "POST",
        body: data,
      }
    );

    const json = await res.json();
    return json.secure_url;
  };

  const submitReport = async () => {
    if (!image || !type || !description)
      return alert("Please fill all fields");

    try {
      setLoading(true);

      // 1️⃣ Upload image
      const imageUrl = await uploadImage(image);

      // 2️⃣ Get GPS location
      const pos = await getLocation();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // 3️⃣ Detect category
      const category = detectCategory(type, description);


      // create temporary image element for AI
// create local image object (SAFE FOR AI)
const localImg = document.createElement("img");
localImg.src = URL.createObjectURL(image);
await localImg.decode();

// run AI BEFORE upload
const aiResult = await analyzeImage(localImg);
console.log("AI RESULT:", aiResult);
// 🧠 generate place fingerprint
const sceneEmbeddings = await generateSceneEmbeddings(image);
// convert each embedding to string (Firestore safe)
const safeEmbeddings = sceneEmbeddings.map(e => JSON.stringify(e));
console.log("Scene embedding length:", sceneEmbeddings.length);
      // 4️⃣ Save to Firestore
      await addDoc(collection(db, "reports"), {
  type,
  description,
  category,

  // BEFORE PHOTO
  beforeImage: imageUrl,
  beforeLabel: aiResult.label,
  beforeConfidence: aiResult.confidence,

  beforeClean: aiResult.clean,
beforeModerate: aiResult.moderate,
beforeDirty: aiResult.dirty,

  // AFTER PHOTO (empty initially)
  afterImage: null,
  afterLabel: null,
  afterConfidence: null,
  
  status: aiResult.label === "dirty" ? "open" : "invalid",
  sceneEmbeddings: safeEmbeddings,
  lat,
  lng,
  createdAt: Date.now(),
});

     setToast("Report submitted 🚀");

      setType("");
      setDescription("");
      setImage(null);
    } catch (err) {
      console.error(err);
      alert("Location permission required OR upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      <h2 style={{ marginBottom: 16 }}>Report a Problem</h2>

      <input
        className="input"
        placeholder="Type (Garbage / Pothole / Light)"
        value={type}
        onChange={(e) => setType(e.target.value)}
      />

      <textarea
        className="textarea"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <input
        className="file"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => setImage(e.target.files[0])}
      />

      <button className="btn" onClick={submitReport} disabled={loading}>
        {loading ? "Uploading..." : "Submit Report"}
      </button>
      {toast && (
  <div className="toast-card">
    {toast}
  </div>
)}
    </div>
    
  );
}

export default Report;