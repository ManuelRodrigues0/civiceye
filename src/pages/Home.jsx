import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom"; // ✅ added
import "../styles/home.css";

export default function Home() {
  const [reports, setReports] = useState([]);

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

  return (
    <div className="content">
      <h2>Recent Reports</h2>
  <div className="reports-grid">
      {reports.length === 0 && <p>No reports yet</p>}

      {reports.map((r) => {
        // 🔥 handle both number timestamp & firestore timestamp
        let time = "";
        if (r.createdAt) {
          time = r.createdAt.toDate
            ? r.createdAt.toDate().toLocaleString()
            : new Date(r.createdAt).toLocaleString();
        }
        return (
          <div className="card" key={r.id}>
            {r.beforeImage && <img src={r.beforeImage} alt="report" />}

            <div className="type">{r.type}</div>
            <div className="desc">{r.description}</div>

            {time && <small>🕒 {time}</small>}

            {/* ✅ STATUS */}
            {r.status && (
              <div style={{ marginTop: 6 }}>
                <b>Status:</b> {r.status}
              </div>
            )}

            {/* ✅ RESOLVE BUTTON */}
            {r.status !== "resolved" && (
              <Link to={`/resolve/${r.id}`}>
                <button style={{ marginTop: 10 }}>
                  Verify / Resolve
                </button>
              </Link>
            )}
          </div>
        );
      })}
    </div>
    </div>
  );
}