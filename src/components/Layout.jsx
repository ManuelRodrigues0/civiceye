import { Link, Outlet } from "react-router-dom";
import "../styles/layout.css";

export default function Layout() {
  return (
    <div className="app">

      {/* TOP BAR */}
      <header className="topbar">
        <div className="logo">CivicEye</div>

        <nav className="navlinks">
          <Link to="/">Home</Link>
          <Link to="/report">Report</Link>
          <Link to="/map">Map</Link>
        </nav>
      </header>

      {/* PAGE CONTENT */}
      <main className="content">
        <Outlet />
      </main>

      {/* MOBILE BOTTOM NAV */}
      <div className="bottomnav">
        <Link to="/">🏠</Link>
        <Link to="/report">📸</Link>
        <Link to="/map">🗺</Link>
      </div>

    </div>
  );
}