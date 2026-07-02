import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const KIPA_ZMANIM_URL = "https://www.kipa.co.il/%D7%96%D7%9E%D7%A0%D7%99-%D7%94%D7%99%D7%95%D7%9D/";

const JERUSALEM = {
  lat: 31.7683,
  lng: 35.2137,
  label: "ירושלים",
};

const ZMANIM_TO_SHOW = [
  { key: "alotHaShachar", label: "עלות השחר", detail: "תחילת האור" },
  { key: "sunrise", label: "הנץ החמה", detail: "זריחה" },
  { key: "chatzot", label: "חצות היום", detail: "אמצע היום" },
  { key: "sunset", label: "שקיעה", detail: "סוף היום" },
];

const CITY_LOCATIONS = [
  { label: "ירושלים", lat: 31.7683, lng: 35.2137 },
  { label: "תל אביב", lat: 32.0853, lng: 34.7818 },
  { label: "חיפה", lat: 32.794, lng: 34.9896 },
  { label: "באר שבע", lat: 31.2529, lng: 34.7915 },
];

const FULL_ZMANIM_TO_SHOW = [
  { key: "chatzotNight", label: "חצות הלילה" },
  { key: "alotHaShachar", label: "עלות השחר" },
  { key: "misheyakir", label: "משיכיר" },
  { key: "misheyakirMachmir", label: "משיכיר מחמיר" },
  { key: "sunrise", label: "הנץ החמה" },
  { key: "sofZmanShma", label: "סוף זמן שמע - גר\"א" },
  { key: "sofZmanShmaMGA", label: "סוף זמן שמע - מג\"א" },
  { key: "sofZmanTfilla", label: "סוף זמן תפילה - גר\"א" },
  { key: "sofZmanTfillaMGA", label: "סוף זמן תפילה - מג\"א" },
  { key: "chatzot", label: "חצות היום" },
  { key: "minchaGedola", label: "מנחה גדולה" },
  { key: "minchaKetana", label: "מנחה קטנה" },
  { key: "plagHaMincha", label: "פלג המנחה" },
  { key: "sunset", label: "שקיעה" },
  { key: "beinHaShmashos", label: "בין השמשות" },
  { key: "tzeit7083deg", label: "צאת הכוכבים - 7.083°" },
  { key: "tzeit85deg", label: "צאת הכוכבים - 8.5°" },
  { key: "tzeit42min", label: "צאת - 42 דקות" },
  { key: "tzeit50min", label: "צאת - 50 דקות" },
  { key: "tzeit72min", label: "רבנו תם - 72 דקות" },
];

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
  const fromLatRad = (fromLat * Math.PI) / 180;
  const toLatRad = (toLat * Math.PI) / 180;
  const lngDiffRad = ((toLng - fromLng) * Math.PI) / 180;

  const y = Math.sin(lngDiffRad) * Math.cos(toLatRad);
  const x =
    Math.cos(fromLatRad) * Math.sin(toLatRad) -
    Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(lngDiffRad);

  return normalizeAngle((Math.atan2(y, x) * 180) / Math.PI);
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getInitialCalibrationOffset() {
  const saved = Number(window.localStorage.getItem("compassCalibrationOffset") || 0);
  return Number.isFinite(saved) ? saved : 0;
}

function getScreenAngle() {
  if (window.screen?.orientation && typeof window.screen.orientation.angle === "number") {
    return window.screen.orientation.angle;
  }

  if (typeof window.orientation === "number") {
    return window.orientation;
  }

  return 0;
}

function formatTime(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildHebcalApiUrl(location, date) {
  const params = new URLSearchParams({
    cfg: "json",
    date,
    latitude: String(location.lat),
    longitude: String(location.lng),
    tzid: "Asia/Jerusalem",
  });

  return "https://www.hebcal.com/zmanim?" + params.toString();
}

function buildHebcalPageUrl(location, date) {
  const params = new URLSearchParams({
    date,
    latitude: String(location.lat),
    longitude: String(location.lng),
    tzid: "Asia/Jerusalem",
  });

  return "https://www.hebcal.com/zmanim?" + params.toString();
}

export default function App() {
  const [heading, setHeading] = useState(0);
  const [manualHeading, setManualHeading] = useState(0);
  const [compassMode, setCompassMode] = useState("auto");
  const [rawHeading, setRawHeading] = useState(null);
  const [hasCompass, setHasCompass] = useState(false);
  const [jerusalemBearing, setJerusalemBearing] = useState(null);
  const [status, setStatus] = useState("לחץ על הכפתור כדי להפעיל את המצפן");
  const [activeView, setActiveView] = useState("compass");
  const [zmanim, setZmanim] = useState(null);
  const [zmanimStatus, setZmanimStatus] = useState("טוען זמני היום לירושלים...");
  const [zmanimLocation, setZmanimLocation] = useState(JERUSALEM);
  const [showAllZmanim, setShowAllZmanim] = useState(false);
  const [selectedCity, setSelectedCity] = useState(JERUSALEM.label);
  const [sensorSource, setSensorSource] = useState("ממתין לחיישן");
  const [sensorAccuracy, setSensorAccuracy] = useState(null);
  const [calibrationOffset, setCalibrationOffset] = useState(getInitialCalibrationOffset);
  const smoothHeadingRef = useRef(0);
  const calibrationOffsetRef = useRef(calibrationOffset);

  const today = useMemo(getTodayDate, []);
  const hebcalPageUrl = useMemo(
    () => buildHebcalPageUrl(zmanimLocation, today),
    [today, zmanimLocation],
  );

  useEffect(() => {
    calibrationOffsetRef.current = calibrationOffset;
    window.localStorage.setItem("compassCalibrationOffset", String(calibrationOffset));
  }, [calibrationOffset]);

  useEffect(() => {
    const handleOrientation = (event) => {
      let newHeading = null;
      let nextSource = "חיישן יחסי";
      let nextAccuracy = null;

      if (typeof event.webkitCompassHeading === "number") {
        newHeading = event.webkitCompassHeading;
        nextSource = "מצפן iPhone";
        if (typeof event.webkitCompassAccuracy === "number") {
          nextAccuracy = Math.round(event.webkitCompassAccuracy);
        }
      } else if (typeof event.alpha === "number") {
        const screenAngle = getScreenAngle();
        newHeading = 360 - event.alpha + screenAngle;
        nextSource = event.absolute ? "חיישן כיוון אבסולוטי" : "חיישן יחסי - דורש כיול";
      }

      if (newHeading === null) return;

      newHeading = normalizeAngle(newHeading);
      const calibratedHeading = normalizeAngle(newHeading + calibrationOffsetRef.current);

      const current = smoothHeadingRef.current;
      const diff = shortestAngleDiff(current, calibratedHeading);
      const smoothed = normalizeAngle(current + diff * 0.22);

      smoothHeadingRef.current = smoothed;
      setRawHeading(newHeading);
      setHeading(smoothed);
      setSensorSource(nextSource);
      setSensorAccuracy(nextAccuracy);
      setHasCompass(true);
    };

    window.addEventListener("deviceorientation", handleOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, []);

  useEffect(() => {
    loadZmanim(JERUSALEM, "זמני היום לירושלים נטענו");
  }, []);

  async function loadZmanim(location, successMessage) {
    setZmanimStatus("טוען זמני היום...");

    try {
      const response = await fetch(buildHebcalApiUrl(location, today));

      if (!response.ok) {
        throw new Error("zmanim request failed");
      }

      const data = await response.json();
      setZmanim(data);
      setZmanimLocation(location);
      setZmanimStatus(successMessage);
    } catch {
      setZmanimStatus("לא הצלחנו לטעון זמני היום. אפשר לפתוח את Hebcal בכפתור למטה.");
    }
  }

  async function activateCompass() {
    try {
      if (
        compassMode === "auto" &&
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
          setStatus(compassMode === "manual" ? "כיוון ירושלים חושב - כוון את הצפון ידנית" : "המצפן פעיל - החץ הזהוב מצביע לירושלים");
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

  function calibrateNorth() {
    if (rawHeading === null) {
      setStatus("צריך להזיז מעט את הטלפון כדי לקבל קריאת מצפן לפני כיול");
      return;
    }

    const nextOffset = normalizeAngle(-rawHeading);
    setCalibrationOffset(nextOffset);
    smoothHeadingRef.current = 0;
    setHeading(0);
    setStatus("כיול נשמר - החזק את ראש הטלפון לכיוון צפון בעת הכיול");
  }

  function resetCalibration() {
    setCalibrationOffset(0);
    setStatus("הכיול אופס");
  }


  function selectCity(location) {
    setSelectedCity(location.label);
    setShowAllZmanim(false);
    loadZmanim(location, "זמני היום ל" + location.label + " נטענו");
  }

  function useCurrentLocationForZmanim() {
    setZmanimStatus("מאתר מיקום לזמני היום...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: Number(position.coords.latitude.toFixed(5)),
          lng: Number(position.coords.longitude.toFixed(5)),
          label: "המיקום שלך",
        };

        setSelectedCity("המיקום שלי");
        setShowAllZmanim(false);
        loadZmanim(location, "זמני היום לפי המיקום שלך נטענו");
      },
      () => {
        setZmanimStatus("לא הצלחתי לקבל מיקום. מוצגים זמני ירושלים כברירת מחדל.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  function switchCompassMode(mode) {
    setCompassMode(mode);
    if (mode === "manual") {
      setStatus("מצב ידני פעיל - סובב את המחוון עד שה-N פונה לצפון");
    } else {
      setStatus("מצב אוטומטי פעיל - לחץ להפעלת חיישני המצפן");
    }
  }

  function updateManualHeading(value) {
    setManualHeading(normalizeAngle(Number(value)));
  }

  function setManualHeadingFromPointer(event) {
    if (!isManualMode) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = event.clientX - centerX;
    const y = event.clientY - centerY;
    const angle = normalizeAngle((Math.atan2(x, -y) * 180) / Math.PI);

    setManualHeading(angle);
  }

  const effectiveHeading = compassMode === "manual" ? manualHeading : heading;
  const isManualMode = compassMode === "manual";

  const northArrowRotation = normalizeAngle(-effectiveHeading);
  const jerusalemArrowRotation =
    jerusalemBearing === null ? 0 : jerusalemBearing - effectiveHeading;

  const jerusalemRelative =
    jerusalemBearing === null
      ? null
      : shortestAngleDiff(effectiveHeading, jerusalemBearing);

  const isFacingJerusalem =
    jerusalemRelative !== null && Math.abs(jerusalemRelative) <= 5;

  return (
    <main className="app">
      <section className="shell">
        <header className="hero">
          <div>
            <p className="eyebrow">מצפן תפילה וזמני היום</p>
            <h1>מצפן ירושלים</h1>
            <p>
              כוון את הטלפון לצפון, קבל את כיוון ירושלים, ופתח במהירות זמני יום
              יהודיים כמו הנץ, חצות, שקיעה וצאת הכוכבים.
            </p>
          </div>

          <div className="tabs" aria-label="ניווט באפליקציה">
            <button
              className={activeView === "compass" ? "active" : ""}
              onClick={() => setActiveView("compass")}
            >
              מצפן
            </button>
            <button
              className={activeView === "zmanim" ? "active" : ""}
              onClick={() => setActiveView("zmanim")}
            >
              זמני היום
            </button>
          </div>
        </header>

        <div className="contentGrid">
          <section
            className={["panel compassPanel", activeView === "compass" ? "show" : ""].join(" ")}
          >
            <div className="sectionTitle">
              <span>כיוון תפילה</span>
              <strong>{jerusalemBearing === null ? "ממתין להפעלה" : "פעיל"}</strong>
            </div>

            <button className="mainButton topAction" onClick={activateCompass}>
              {isManualMode ? "חשב כיוון לירושלים" : "הפעל כיוון לירושלים"}
            </button>

            <div className="modeSwitch" aria-label="בחירת מצב מצפן">
              <button
                type="button"
                className={compassMode === "auto" ? "active" : ""}
                onClick={() => switchCompassMode("auto")}
              >
                אוטומטי
              </button>
              <button
                type="button"
                className={compassMode === "manual" ? "active" : ""}
                onClick={() => switchCompassMode("manual")}
              >
                ידני
              </button>
            </div>

            {isManualMode && (
              <div className="manualCompassPanel">
                <div>
                  <strong>כיוון צפון ידני</strong>
                  <span>{Math.round(manualHeading)}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="359"
                  value={manualHeading}
                  onChange={(event) => updateManualHeading(event.target.value)}
                  aria-label="כיוון צפון ידני"
                />
                <p>גרור את המצפן או הזז את המחוון עד שהאות N פונה לצפון אמיתי.</p>
              </div>
            )}

            <div className="compassWrap">
              <div
                className={isManualMode ? "compass manualEditable" : "compass"}
                aria-label="מצפן ירושלים"
                onPointerDown={setManualHeadingFromPointer}
                onPointerMove={(event) => {
                  if (event.buttons === 1) setManualHeadingFromPointer(event);
                }}
              >
                <div className="compassGlass" />
                <div className="marker north">N</div>
                <div className="marker east">E</div>
                <div className="marker south">S</div>
                <div className="marker west">W</div>

                <div className="ticks">
                  {Array.from({ length: 72 }).map((_, i) => (
                    <span
                      key={i}
                      className={i % 6 === 0 ? "tick big" : "tick"}
                      style={{ transform: "rotate(" + i * 5 + "deg)" }}
                    />
                  ))}
                </div>

                <div
                  className="arrow northArrow"
                  style={{ transform: "rotate(" + northArrowRotation + "deg)" }}
                >
                  <span />
                </div>

                {jerusalemBearing !== null && (
                  <div
                    className="arrow jerusalemArrow"
                    style={{ transform: "rotate(" + jerusalemArrowRotation + "deg)" }}
                  >
                    <span />
                    <b>ירושלים</b>
                  </div>
                )}

                <div className="centerDot">
                  <div />
                </div>
              </div>
            </div>

            {jerusalemRelative !== null && (
              <div className={isFacingJerusalem ? "alignment good" : "alignment"}>
                <strong>
                  {isFacingJerusalem ? "אתה מכוון לירושלים" : "עדיין צריך לכוון"}
                </strong>
                <span>
                  {isFacingJerusalem
                    ? "החץ הזהוב כמעט ישר קדימה"
                    : jerusalemRelative > 0
                      ? "סובב מעט ימינה"
                      : "סובב מעט שמאלה"}
                </span>
              </div>
            )}

            <div className="infoPanel">
              <div>
                <span>{isManualMode ? "כיוון ידני" : "כיוון הטלפון"}</span>
                <strong>{Math.round(effectiveHeading)}°</strong>
              </div>

              <div>
                <span>סטטוס</span>
                <strong>{status}</strong>
              </div>

              {!isManualMode && (
                <div>
                  <span>מקור החיישן</span>
                  <strong>
                    {sensorSource}
                    {sensorAccuracy !== null ? " - דיוק +/-" + sensorAccuracy + "°" : ""}
                  </strong>
                </div>
              )}

              {!isManualMode && (
                <div>
                  <span>כיול ידני</span>
                  <strong>{Math.round(shortestAngleDiff(0, calibrationOffset))}°</strong>
                </div>
              )}

              {jerusalemRelative !== null && (
                <div>
                  <span>ירושלים יחסית אליך</span>
                  <strong>
                    {Math.abs(Math.round(jerusalemRelative))}°{" "}
                    {jerusalemRelative > 0 ? "ימינה" : "שמאלה"}
                  </strong>
                </div>
              )}

              {!isManualMode && !hasCompass && (
                <p className="warning">
                  במחשב רגיל לא תמיד יש חיישן מצפן. בטלפון, אשר הרשאות מיקום
                  וחיישנים כדי לקבל כיוון מדויק.
                </p>
              )}

              {!isManualMode && sensorSource.includes("יחסי") && hasCompass && (
                <p className="warning">
                  החיישן במכשיר הזה יחסי, ולכן ייתכן זיוף. כוון את ראש הטלפון
                  לצפון ולחץ “כוון כצפון”.
                </p>
              )}
            </div>

            {!isManualMode && (
              <div className="calibrationPanel">
              <p>אם החץ הכחול לא יושב על צפון, כוון את ראש הטלפון לצפון ולחץ כיול.</p>
              <div className="calibrationActions simple">
                <button type="button" onClick={calibrateNorth}>כוון כצפון</button>
                <button type="button" onClick={resetCalibration}>איפוס כיול</button>
              </div>
            </div>
            )}
          </section>

          <section
            className={["panel zmanimPanel", activeView === "zmanim" ? "show" : ""].join(" ")}
          >
            <div className="sectionTitle">
              <span>זמני היום</span>
              <strong>{zmanimLocation.label}</strong>
            </div>

            <div className="zmanimIntro">
              <h2>זמנים עיקריים להיום</h2>
              <p>{zmanimStatus}</p>
            </div>

            <div className="cityPicker" aria-label="בחירת עיר לזמני היום">
              {CITY_LOCATIONS.map((city) => (
                <button
                  key={city.label}
                  className={selectedCity === city.label ? "active" : ""}
                  type="button"
                  onClick={() => selectCity(city)}
                >
                  {city.label}
                </button>
              ))}
            </div>

            <div className="zmanimList primaryTimes">
              {ZMANIM_TO_SHOW.map((item) => (
                <div className="zmanCard" key={item.key}>
                  <span>{item.label}</span>
                  <strong>{formatTime(zmanim?.times?.[item.key])}</strong>
                  <small>{item.detail}</small>
                </div>
              ))}
            </div>

            <div className="actionsRow zmanimActions singleAction">
              <button
                className="linkButton"
                onClick={() => setShowAllZmanim((current) => !current)}
              >
                {showAllZmanim ? "הסתר רשימה מלאה" : "רשימת הזמנים המלאה"}
              </button>
            </div>

            {showAllZmanim && (
              <div className="fullZmanim">
                {FULL_ZMANIM_TO_SHOW.map((item) => (
                  <div className="fullZmanRow" key={item.key}>
                    <span>{item.label}</span>
                    <strong>{formatTime(zmanim?.times?.[item.key])}</strong>
                  </div>
                ))}
              </div>
            )}

            <p className="sourceNote">
              זמני היום מוצגים באפליקציה, ולבדיקה מלאה ומוכרת אפשר לפתוח את אתר כיפה.
              <a href={KIPA_ZMANIM_URL} target="_blank" rel="noreferrer"> מקור: כיפה</a>
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
