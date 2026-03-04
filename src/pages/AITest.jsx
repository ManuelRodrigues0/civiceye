import { useState } from "react";
import { analyzeImage } from "../ai/cleanDetector";

export default function AITest() {
  const [result, setResult] = useState("");
  const [preview, setPreview] = useState(null);

  const handleImage = async (file) => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);

    img.onload = async () => {
      const dirty = await analyzeImage(img);
      setResult(dirty ? "DIRTY ❌" : "CLEAN ✅");
    };

    setPreview(img.src);
  };

  return (
    <div className="content">
      <h2>AI Garbage Detection Test</h2>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleImage(e.target.files[0])}
      />

      {preview && (
        <div style={{ marginTop: 20 }}>
          <img src={preview} alt="" style={{ width: 250 }} />
          <h3>{result}</h3>
        </div>
      )}
    </div>
  );
}