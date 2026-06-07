import { useEffect, useRef, useState } from "react";
import "./App.css";

const JERUSALEM = {
  lat: 31.7683,
  lng: 35.2137,
};

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function shortestAngleDiff(from, to) {
  let diff = to - from;

  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;

  return diff;
}

function getBearing(fromLat, fromLng, toLat, toLng) {
  const φ1 = (fromLat * Math.PI) / 180;
  const φ2 = (toLat * Math.PI) / 180;
  const Δλ = ((toLng - fromLng) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return normalizeAngle((Math.atan2(y, x) * 180) / Math.PI);
}

export default function App() {
  const [heading, setHeading] = useState(0);
  const [hasCompass, setHasCompass] = useState(false);
  const [jerusalemBearing, setJerusalemBearing] = useState(null);
  const [status, setStatus] = useState("לחץ על הכפתור כדי להפעיל את המצפן");
  const smoothHeadingRef = useRef(0);

  useEffect(() => {
    const handleOrientation = (event) => {
      let newHeading = null;

      if (typeof event.webkitCompassHeading === "number") {
        newHeading = event.webkitCompassHeading;
      } else if (typeof event.alpha === "number") {
        newHeading = 360 - event.alpha;
      }

      if (newHeading === null) return;

      newHeading = normalizeAngle(newHeading);

      const current = smoothHeadingRef.current;
      const diff = shortestAngleDiff(current, newHeading);
      const smoothed = normalizeAngle(current + diff * 0.12);

      smoothHeadingRef.current = smoothed;
      setHeading(smoothed);
      setHasCompass(true);
    };

    window.addEventListener("deviceorientation", handleOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, []);

  async function activateCompass() {
    try {
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== "granted") {
          setStatus("לא ניתן אישור לשימוש בחיישני המצפן");
          return;
        }
      }

      setStatus("מאתר מיקום...");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          const bearing = getBearing(
            latitude,
            longitude,
            JERUSALEM.lat,
            JERUSALEM.lng,
          );

          setJerusalemBearing(bearing);
          setStatus("המצפן פעיל — החץ הזהוב מצביע לירושלים");
        },
        () => {
          setStatus("לא הצלחתי לקבל מיקום. בדוק הרשאות GPS");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    } catch {
      setStatus("אירעה שגיאה בהפעלת המצפן");
    }
  }

  const northArrowRotation = normalizeAngle(-heading);
  const jerusalemArrowRotation =
    jerusalemBearing === null ? 0 : jerusalemBearing - heading;

  const jerusalemRelative =
    jerusalemBearing === null
      ? null
      : shortestAngleDiff(heading, jerusalemBearing);

  return (
    <main className="app">
      <section className="card">
        <div className="titleBlock">
          <h1>מצפן ירושלים</h1>
          <p>סובב את הטלפון כך שהחץ הכחול יצביע לאות N</p>
        </div>

        <div className="compassWrap">
          <div className="compass">
            <div className="marker north">N</div>
            <div className="marker east">E</div>
            <div className="marker south">S</div>
            <div className="marker west">W</div>

            <div className="ticks">
              {Array.from({ length: 36 }).map((_, i) => (
                <span
                  key={i}
                  className={i % 3 === 0 ? "tick big" : "tick"}
                  style={{ transform: `rotate(${i * 10}deg)` }}
                />
              ))}
            </div>

            <div
              className="arrow northArrow"
              style={{ transform: `rotate(${northArrowRotation}deg)` }}
            >
              <span />
            </div>

            {jerusalemBearing !== null && (
              <div
                className="arrow jerusalemArrow"
                style={{ transform: `rotate(${jerusalemArrowRotation}deg)` }}
              >
                <span />
              </div>
            )}

            <div className="centerDot">
              <div />
            </div>
          </div>
        </div>

        <button className="mainButton" onClick={activateCompass}>
          הפעל כיוון לירושלים
        </button>

        <div className="infoPanel">
          <div>
            <span>כיוון הטלפון</span>
            <strong>{Math.round(heading)}°</strong>
          </div>

          <div>
            <span>סטטוס</span>
            <strong>{status}</strong>
          </div>

          {jerusalemRelative !== null && (
            <div>
              <span>ירושלים יחסית אליך</span>
              <strong>
                {Math.abs(Math.round(jerusalemRelative))}°{" "}
                {jerusalemRelative > 0 ? "ימינה" : "שמאלה"}
              </strong>
            </div>
          )}

          {!hasCompass && (
            <p className="warning">
              כוון את הטלפון לצד צפון, החץ הכתום שיופיע הוא כיוון התפילה
              ירושלים{" "}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
