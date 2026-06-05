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
  const [status, setStatus] = useState("לחץ כדי לכוון להר הבית");
  const [showInfo, setShowInfo] = useState(false);

  const [heading, setHeading] = useState(null);
  const [bearing, setBearing] = useState(null);

  const isNorthAligned = heading !== null && (heading <= 5 || heading >= 355);

  async function startCompass() {
    try {
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        const permission = await DeviceOrientationEvent.requestPermission();

        if (permission !== "granted") {
          setStatus("צריך לאשר גישה לחיישן המצפן");
          return;
        }
      }

      window.addEventListener("deviceorientation", (event) => {
        const compassHeading = event.webkitCompassHeading ?? 360 - event.alpha;

        if (compassHeading !== null && !Number.isNaN(compassHeading)) {
          setHeading(compassHeading);
        }
      });
    } catch {
      setStatus("לא ניתן להפעיל את חיישן המצפן במכשיר הזה");
    }
  }

  function pointToJerusalem() {
    startCompass();

    if (!navigator.geolocation) {
      setStatus("הדפדפן לא תומך במיקום");
      return;
    }

    setStatus("מאתר מיקום...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        const newBearing = calculateBearing(
          latitude,
          longitude,
          TEMPLE_MOUNT.lat,
          TEMPLE_MOUNT.lng,
        );

        setBearing(newBearing);
        setStatus(
          "סובב את הטלפון עד שהחץ הכחול יהפוך לירוק. החץ האדום מצביע להר הבית.",
        );
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
      </div>

      <div className={`side-panel ${showInfo ? "open" : ""}`}>
        <h2>הוראות שימוש</h2>

        <p>🧭 לחץ על הכפתור כדי להפעיל GPS וחיישן מצפן.</p>
        <p>📱 סובב את הטלפון עד שהחץ הכחול יהפוך לירוק.</p>
        <p>🏛️ החץ האדום יצביע לכיוון הר הבית בירושלים.</p>

        <button className="close-btn" onClick={() => setShowInfo(false)}>
          הבנתי
        </button>
      </div>

      <div className="compass">
        <div className="direction n">N</div>
        <div className="direction e">E</div>
        <div className="direction s">S</div>
        <div className="direction w">W</div>

        {heading !== null && (
          <div
            className={`needle north-needle ${isNorthAligned ? "aligned" : ""}`}
            style={{ transform: `rotate(${-heading}deg)` }}
          >
            <div className="compass-arrow">
              <div className="arrow-top"></div>
              <div className="arrow-bottom"></div>
            </div>
          </div>
        )}

        {bearing !== null && (
          <div
            className="needle jerusalem-needle"
            style={{ transform: `rotate(${bearing}deg)` }}
          >
            <div className="compass-arrow">
              <div className="arrow-top"></div>
              <div className="arrow-bottom"></div>
            </div>
          </div>
        )}

        <div className="center-dot"></div>
      </div>

      <button className="main-btn" onClick={pointToJerusalem}>
        🧭 כוון אותי להר הבית
      </button>
      <button className="info-btn" onClick={() => setShowInfo(!showInfo)}>
        {showInfo ? "✕" : "ℹ️"}
      </button>

      <p>{status}</p>
    </div>
  );
}
