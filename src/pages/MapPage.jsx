import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "../styles/map.css";

// marker icons
const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const yellowIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// choose icon using saved category
function getIcon(category) {
  if (category === "road") return yellowIcon;
  return redIcon;
}

function LocateUser({ setUserLocation }) {
  const map = useMap();

  const locate = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setUserLocation([lat, lng]);
        map.flyTo([lat, lng], 18, { duration: 1.5 });
      },
      () => alert("Allow location permission")
    );
  };

  return <button className="locate-btn" onClick={locate}>📍</button>;
}

export default function MapPage() {
  const [satellite, setSatellite] = useState(false);
  const [reports, setReports] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reports"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(list);
    });

    return () => unsub();
  }, []);

  return (
    <div className="content">
      <h2>City Problem Map</h2>

      <MapContainer
        center={[19.0760, 72.8777]}
        zoom={12}
        maxZoom={22}
        style={{ height: "70vh", borderRadius: "14px" }}
      >
        {satellite ? (
          <TileLayer
            attribution="Tiles © Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={20}
          />
        ) : (
          <TileLayer
            attribution="© OpenStreetMap contributors © CARTO"
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={22}
          />
        )}
        <div className="map-toggle">
        <button onClick={() => setSatellite(!satellite)}>
          {satellite ? "🗺 Map" : "🛰 Satellite"}
        </button>
      </div>

        <LocateUser setUserLocation={setUserLocation} />

        {userLocation && (
          <CircleMarker
            center={userLocation}
            radius={10}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#3b82f6",
              fillOpacity: 0.5,
            }}
          />
        )}

        {reports.map((r) =>
          r.lat && r.lng ? (
            <Marker key={r.id} position={[r.lat, r.lng]} icon={getIcon(r.category)}>
              <Popup>
                <b>{r.type}</b>
                <br />
                {r.description}
                <br />
                {r.imageUrl && (
                  <img
                    src={r.imageUrl}
                    alt=""
                    style={{ width: "150px", marginTop: "6px" }}
                  />
                )}
              </Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>

      
    </div>
  );
}