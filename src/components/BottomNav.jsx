import { NavLink } from "react-router-dom";

function BottomNav() {
  return (
    <div className="bottom-nav">
      <NavLink to="/" className="tab">
        🏠
        <span>Home</span>
      </NavLink>

      <NavLink to="/report" className="tab">
        ➕
        <span>Report</span>
      </NavLink>

      <NavLink to="/map" className="tab">
        🗺️
        <span>Map</span>
      </NavLink>
      <Link to="/map">🗺 Map</Link>
    </div>
  );
}

export default BottomNav;