import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom"; // ✅ added
import "../styles/home.css";
import { getAQI } from "../utils/getAQI";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [reports, setReports] = useState([]);
  const [aqiData, setAqiData] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    // latest reports first
    const q = query(
      collection(db, "reports"),
      orderBy("createdAt", "desc")
    );
   

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReports(list);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {

  if (reports.length === 0) return;

  const loadAQI = async () => {

    const newAqi = {};

    for (const report of reports) {

      if (report.lat && report.lng) {

        const aqi = await getAQI(report.lat, report.lng);

        newAqi[report.id] = aqi;

      }

    }

    setAqiData(newAqi);

  };

  loadAQI();

}, [reports]);

  return (
    <div className="content">
      <h2>Recent Reports</h2>
  <div className="reports-grid">
      {reports.length === 0 && <p>No reports yet</p>}

      {reports.map((r) => {

        const aqiValue = aqiData[r.id]?.aqi;
        // 🔥 handle both number timestamp & firestore timestamp
        let time = "";
        if (r.createdAt) {
          time = r.createdAt.toDate
            ? r.createdAt.toDate().toLocaleString()
            : new Date(r.createdAt).toLocaleString();
        }
        return (
          <div className="card" key={r.id}>
           <img
  src={r.beforeImage || r.afterImage || ""}
  alt="report"
  loading="lazy"
/>

            <div className="type">{r.type}</div>
            <div className="desc">{r.description}</div>

            {time && <small>🕒 {time}</small>}

            {/* ✅ STATUS */}
            {r.status && (
              <div style={{ marginTop: 6 }}>
                <b>Status:</b> {r.status}
              </div>
            )}

<p
  className="aqi"
  style={{
    color:
      !aqiValue
        ? "#6b7280"
        : aqiValue <= 50
        ? "green"
        : aqiValue <= 100
        ? "orange"
        : "red",
  }}
>
AQI: {aqiValue ? aqiValue : "Loading..."}
</p>

            {/* ✅ RESOLVE BUTTON */}
            {r.status !== "resolved" && (
              <Link to={`/resolve/${r.id}`}>
                <button style={{ marginTop: 10 }}>
                  Verify / Resolve
                </button>
              </Link>
            )}
            <button
  onClick={() =>
    navigate("/map", {
      state: {
        lat: r.lat,
        lng: r.lng
      }
    })
  }
>
  View on Map
</button>
          </div>
        );
      })}
    </div>
    </div>
  );
}