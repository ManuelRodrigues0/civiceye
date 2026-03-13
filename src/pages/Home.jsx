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
  const [userLocation, setUserLocation] = useState(null);
const [nearbyReports, setNearbyReports] = useState(0);
const [resolvedCount, setResolvedCount] = useState(0);

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

useEffect(() => {
  navigator.geolocation.getCurrentPosition((pos) => {
    setUserLocation({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    });
  });
}, []);

useEffect(() => {

  if (!userLocation || reports.length === 0) return;

  let nearby = 0;
  let resolved = 0;

  reports.forEach((r) => {

    if (r.status === "resolved") {
      resolved++;
    }

    if (r.lat && r.lng) {

      const dist =
        Math.sqrt(
          (r.lat - userLocation.lat) ** 2 +
          (r.lng - userLocation.lng) ** 2
        );

      if (dist < 0.02) {
        nearby++;
      }

    }

  });

  setNearbyReports(nearby);
  setResolvedCount(resolved);

}, [reports, userLocation]);

  return (
  <div className="content">

    <div className="dashboard">

      <div className="dash-card">
        <h3>Local AQI</h3>
        <p>
          {reports.length > 0
            ? aqiData[reports[0].id]?.aqi || "Loading..."
            : "--"}
        </p>
      </div>

      <div className="dash-card">
        <h3>Reports Near You</h3>
        <p>{nearbyReports}</p>
      </div>

      <div className="dash-card">
        <h3>Resolved Issues</h3>
        <p>{resolvedCount}</p>
      </div>

    </div>

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
  src={r.beforeImage || r.afterImage || "/placeholder.jpg"}
  alt="report"
  loading="lazy"
/>

            <div className="type">
  {r.category === "waste"
    ? `Waste issue at ${r.area}`
    : `Road issue at ${r.area}`}
</div>
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