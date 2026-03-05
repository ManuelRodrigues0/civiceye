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

  const embeddings = [];

  // ORIGINAL
  embeddings.push(await getClipEmbedding(file));

  // CENTER CROP
  const center = await createCrop(
    img.width*0.2,
    img.height*0.2,
    img.width*0.6,
    img.height*0.6
  );
  embeddings.push(await getClipEmbedding(new File([center],"center.jpg")));

  // ZOOM CROP
  const zoom = await createCrop(
    img.width*0.1,
    img.height*0.1,
    img.width*0.8,
    img.height*0.8
  );
  embeddings.push(await getClipEmbedding(new File([zoom],"zoom.jpg")));

  // TOP AREA
  const top = await createCrop(
    0,
    0,
    img.width,
    img.height*0.5
  );
  embeddings.push(await getClipEmbedding(new File([top],"top.jpg")));

  // BOTTOM AREA
  const bottom = await createCrop(
    0,
    img.height*0.5,
    img.width,
    img.height*0.5
  );
  embeddings.push(await getClipEmbedding(new File([bottom],"bottom.jpg")));

  // LEFT SIDE
  const left = await createCrop(
    0,
    0,
    img.width*0.5,
    img.height
  );
  embeddings.push(await getClipEmbedding(new File([left],"left.jpg")));

  // RIGHT SIDE
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