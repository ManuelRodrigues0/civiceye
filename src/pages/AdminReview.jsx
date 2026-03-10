import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import "../styles/adminReview.css";

const ADMIN_PASSWORD = "chrisbhumi";

export default function AdminReview() {

  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [reviews, setReviews] = useState([]);

  // 🔹 ALWAYS run hooks first
  useEffect(() => {

    if (!authorized) return;

    const q = query(
      collection(db, "reports"),
      where("status", "==", "pending_human_review")
    );

    const unsub = onSnapshot(q, (snap) => {

      const list = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      setReviews(list);

    });

    return () => unsub();

  }, [authorized]);

  const approve = async (report) => {

    await updateDoc(doc(db, "reports", report.id), {
      afterImage: report.reviewImage,
      status: "resolved"
    });

  };

  const reject = async (report) => {

    await updateDoc(doc(db, "reports", report.id), {
      status: "rejected"
    });

  };

  // 🔹 LOGIN SCREEN

  if (!authorized) {
    return (
      <div className="admin-login">

        <h2>Admin Access</h2>

        <input
          className="admin-input"
          type="password"
          placeholder="Enter admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="admin-login-btn"
          onClick={() => {
            if (password === ADMIN_PASSWORD) {
              setAuthorized(true);
            } else {
              alert("Wrong password");
            }
          }}
        >
          Enter
        </button>

      </div>
    );
  }

  // 🔹 DASHBOARD

  return (

    <div className="admin-page">

      <h1 className="admin-title">Human Review Dashboard</h1>

      {reviews.length === 0 && (
        <p className="empty-msg">No pending reviews</p>
      )}

      {reviews.map((r) => (

        <div key={r.id} className="review-card">

          <div className="review-info">
            <h3>{r.type}</h3>
            <p>{r.description}</p>
          </div>

          <div className="review-images">

            <div>
              <h4>Before</h4>
              <img src={r.beforeImage} />
            </div>

            <div>
              <h4>After</h4>
              <img src={r.reviewImage} />
            </div>

          </div>

          <div className="review-actions">

            <button
              className="approve-btn"
              onClick={() => approve(r)}
            >
              Approve
            </button>

            <button
              className="reject-btn"
              onClick={() => reject(r)}
            >
              Reject
            </button>

          </div>

        </div>

      ))}

    </div>

  );

}