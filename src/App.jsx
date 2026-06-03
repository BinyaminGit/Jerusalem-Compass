import { useState } from "react";
import "./App.css";

const TEMPLE_MOUNT = {
  lat: 31.778,
  lng: 35.235401,
};

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

function calculateBearing(fromLat, fromLng, toLat, toLng) {
  const φ1 = toRad(fromLat);
  const φ2 = toRad(toLat);
  const Δλ = toRad(toLng - fromLng);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export default function App() {
  const [angle, setAngle] = useState(0);
  const [status, setStatus] = useState("לחץ כדי לכוון להר הבית");
  const [showInfo, setShowInfo] = useState(false);

  function pointToJerusalem() {
    if (!navigator.geolocation) {
      setStatus("הדפדפן לא תומך במיקום");
      return;
    }

    setStatus("מאתר מיקום...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        const bearing = calculateBearing(
          latitude,
          longitude,
          TEMPLE_MOUNT.lat,
          TEMPLE_MOUNT.lng,
        );

        setAngle(bearing);
        setStatus(`הכיוון להר הבית: ${bearing.toFixed(1)}°`);
      },
      () => {
        setStatus("לא ניתן לקבל מיקום. צריך לאשר הרשאת GPS");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1>🧭 כוון להר הבית</h1>

        <button className="info-btn" onClick={() => setShowInfo(true)}>
          ℹ️
        </button>
      </div>
      <div className={`side-panel ${showInfo ? "open" : ""}`}>
        <h2>הוראות שימוש</h2>

        <p>🧭 כוון את המכשיר כך שהאות N תפנה לצפון.</p>
        <p>📍 לחץ על "כוון אותי להר הבית".</p>
        <p>🏛️ החץ האדום יצביע לכיוון הר הבית בירושלים.</p>

        <button className="close-btn" onClick={() => setShowInfo(false)}>
          סגור
        </button>
      </div>
      <div className="compass">
        <div className="direction n">N</div>
        <div className="direction e">E</div>
        <div className="direction s">S</div>
        <div className="direction w">W</div>

        <div className="needle" style={{ transform: `rotate(${angle}deg)` }}>
          <div className="needle-line"></div>
          <div className="needle-head"></div>
        </div>

        <div className="center-dot"></div>
      </div>

      <button className="main-btn" onClick={pointToJerusalem}>
        🧭 כוון אותי
      </button>

      <p>{status}</p>
    </div>
  );
}
