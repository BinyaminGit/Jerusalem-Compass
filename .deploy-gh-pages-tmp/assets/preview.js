(function () {
  var JERUSALEM = { lat: 31.7683, lng: 35.2137, label: "ירושלים" };
  var ZMANIM = [
    { key: "alotHaShachar", label: "עלות השחר", detail: "תחילת האור" },
    { key: "sunrise", label: "הנץ החמה", detail: "זריחה" },
    { key: "sofZmanShma", label: "סוף זמן שמע", detail: "לפי הגר\"א" },
    { key: "chatzot", label: "חצות היום", detail: "אמצע היום" },
    { key: "minchaGedola", label: "מנחה גדולה", detail: "תחילת זמן מנחה" },
    { key: "sunset", label: "שקיעה", detail: "סוף היום" },
    { key: "tzeit85deg", label: "צאת הכוכבים", detail: "8.5 מעלות" }
  ];
  var FULL_ZMANIM = [
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
    { key: "tzeit72min", label: "רבנו תם - 72 דקות" }
  ];
  var state = { heading: 0, rawHeading: null, hasCompass: false, bearing: null, status: "לחץ על הכפתור כדי להפעיל את המצפן", activeView: "compass", zmanim: null, zmanimStatus: "טוען זמני היום לירושלים...", zmanimLocation: JERUSALEM, smoothHeading: 0, showAll: false, sensorSource: "ממתין לחיישן", sensorAccuracy: null, calibrationOffset: Number(localStorage.getItem("compassCalibrationOffset") || 0) || 0 };
  var today = new Date().toISOString().slice(0, 10);
  function normalizeAngle(angle) { return ((angle % 360) + 360) % 360; }
  function shortestAngleDiff(from, to) { var diff = to - from; while (diff > 180) diff -= 360; while (diff < -180) diff += 360; return diff; }
  function getBearing(fromLat, fromLng, toLat, toLng) { var a = (fromLat * Math.PI) / 180; var b = (toLat * Math.PI) / 180; var c = ((toLng - fromLng) * Math.PI) / 180; var y = Math.sin(c) * Math.cos(b); var x = Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(c); return normalizeAngle((Math.atan2(y, x) * 180) / Math.PI); }
  function getScreenAngle() { if (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === "number") return window.screen.orientation.angle; if (typeof window.orientation === "number") return window.orientation; return 0; }
  function saveCalibration() { localStorage.setItem("compassCalibrationOffset", String(state.calibrationOffset)); }
  function formatTime(value) { if (!value) return "-"; return new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
  function hebcalUrl(location, json) { var params = new URLSearchParams({ date: today, latitude: String(location.lat), longitude: String(location.lng), tzid: "Asia/Jerusalem" }); if (json) params.set("cfg", "json"); return "https://www.hebcal.com/zmanim?" + params.toString(); }
  function render() {
    var northRotation = normalizeAngle(-state.heading);
    var jerusalemRotation = state.bearing === null ? 0 : state.bearing - state.heading;
    var relative = state.bearing === null ? null : shortestAngleDiff(state.heading, state.bearing);
    var ticks = Array.from({ length: 72 }).map(function (_, i) { return '<span class="' + (i % 6 === 0 ? 'tick big' : 'tick') + '" style="transform: rotate(' + (i * 5) + 'deg)"></span>'; }).join("");
    var zmanCards = ZMANIM.map(function (item) { var value = state.zmanim && state.zmanim.times ? state.zmanim.times[item.key] : null; return '<div class="zmanCard"><span>' + item.label + '</span><strong>' + formatTime(value) + '</strong><small>' + item.detail + '</small></div>'; }).join("");
    var fullRows = FULL_ZMANIM.map(function (item) { var value = state.zmanim && state.zmanim.times ? state.zmanim.times[item.key] : null; return '<div class="fullZmanRow"><span>' + item.label + '</span><strong>' + formatTime(value) + '</strong></div>'; }).join("");
    document.getElementById("root").innerHTML = '<main class="app"><section class="shell"><header class="hero"><div><p class="eyebrow">מצפן תפילה וזמני היום</p><h1>מצפן ירושלים</h1><p>כוון את הטלפון לצפון, קבל את כיוון ירושלים, ופתח במהירות זמני יום יהודיים כמו הנץ, חצות, שקיעה וצאת הכוכבים.</p></div><div class="tabs" aria-label="ניווט באפליקציה"><button id="tabCompass" class="' + (state.activeView === 'compass' ? 'active' : '') + '">מצפן</button><button id="tabZmanim" class="' + (state.activeView === 'zmanim' ? 'active' : '') + '">זמני היום</button></div></header><div class="contentGrid"><section class="panel compassPanel ' + (state.activeView === 'compass' ? 'show' : '') + '"><div class="sectionTitle"><span>כיוון תפילה</span><strong>' + (state.bearing === null ? 'ממתין להפעלה' : 'פעיל') + '</strong></div><div class="compassWrap"><div class="compass" aria-label="מצפן ירושלים"><div class="compassGlass"></div><div class="marker north">N</div><div class="marker east">E</div><div class="marker south">S</div><div class="marker west">W</div><div class="ticks">' + ticks + '</div><div class="arrow northArrow" style="transform: rotate(' + northRotation + 'deg)"><span></span></div>' + (state.bearing === null ? '' : '<div class="arrow jerusalemArrow" style="transform: rotate(' + jerusalemRotation + 'deg)"><span></span><b>ירושלים</b></div>') + '<div class="centerDot"><div></div></div></div></div><button id="activateCompass" class="mainButton">הפעל כיוון לירושלים</button><div class="infoPanel"><div><span>כיוון הטלפון</span><strong>' + Math.round(state.heading) + '°</strong></div><div><span>סטטוס</span><strong>' + state.status + '</strong></div><div><span>מקור החיישן</span><strong>' + state.sensorSource + (state.sensorAccuracy !== null ? ' - דיוק +/-' + state.sensorAccuracy + '°' : '') + '</strong></div><div><span>כיול ידני</span><strong>' + Math.round(shortestAngleDiff(0, state.calibrationOffset)) + '°</strong></div>' + (relative === null ? '' : '<div><span>ירושלים יחסית אליך</span><strong>' + Math.abs(Math.round(relative)) + '° ' + (relative > 0 ? 'ימינה' : 'שמאלה') + '</strong></div>') + (!state.hasCompass ? '<p class="warning">במחשב רגיל לא תמיד יש חיישן מצפן. בטלפון, אשר הרשאות מיקום וחיישנים כדי לקבל כיוון מדויק.</p>' : '') + (state.sensorSource.indexOf('יחסי') >= 0 && state.hasCompass ? '<p class="warning">החיישן במכשיר הזה יחסי, ולכן ייתכן זיוף. כוון את ראש הטלפון לצפון ולחץ כוון כצפון.</p>' : '') + '</div><div class="calibrationPanel"><p>אם החץ הכחול לא יושב על צפון, כוון את ראש הטלפון לצפון ולחץ כיול.</p><div class="calibrationActions"><button id="calibrateNorth" type="button">כוון כצפון</button><button id="nudgeMinus" type="button">5°-</button><button id="nudgePlus" type="button">5°+</button><button id="resetCalibration" type="button">איפוס</button></div></div></section><section class="panel zmanimPanel ' + (state.activeView === 'zmanim' ? 'show' : '') + '"><div class="sectionTitle"><span>זמני היום</span><strong>' + state.zmanimLocation.label + '</strong></div><div class="zmanimIntro"><h2>זמנים מרכזיים להיום</h2><p>' + state.zmanimStatus + '</p></div><div class="zmanimList">' + zmanCards + '</div><div class="actionsRow"><button id="useLocation" class="secondaryButton">הצג לפי המיקום שלי</button><button id="showAll" class="linkButton">' + (state.showAll ? 'הסתר זמנים מלאים' : 'הצג זמנים מלאים כאן') + '</button></div>' + (state.showAll ? '<div class="fullZmanim">' + fullRows + '</div>' : '') + '<p class="sourceNote">הזמנים נטענים מ-Hebcal. אם פתיחת אתר חיצוני נחסמת, הרשימה המלאה זמינה כאן באפליקציה. <a href="' + hebcalUrl(state.zmanimLocation, false) + '" target="_blank" rel="noreferrer">מקור: Hebcal</a></p></section></div></section></main>';
    document.getElementById("tabCompass").onclick = function () { state.activeView = "compass"; render(); };
    document.getElementById("tabZmanim").onclick = function () { state.activeView = "zmanim"; render(); };
    document.getElementById("activateCompass").onclick = activateCompass;
    document.getElementById("useLocation").onclick = useCurrentLocationForZmanim;
    document.getElementById("showAll").onclick = function () { state.showAll = !state.showAll; render(); };
    document.getElementById("calibrateNorth").onclick = calibrateNorth;
    document.getElementById("nudgeMinus").onclick = function () { state.calibrationOffset = normalizeAngle(state.calibrationOffset - 5); saveCalibration(); render(); };
    document.getElementById("nudgePlus").onclick = function () { state.calibrationOffset = normalizeAngle(state.calibrationOffset + 5); saveCalibration(); render(); };
    document.getElementById("resetCalibration").onclick = function () { state.calibrationOffset = 0; saveCalibration(); state.status = "הכיול אופס"; render(); };
  }
  async function loadZmanim(location, message) { state.zmanimStatus = "טוען זמני היום..."; render(); try { var response = await fetch(hebcalUrl(location, true)); if (!response.ok) throw new Error("failed"); state.zmanim = await response.json(); state.zmanimLocation = location; state.zmanimStatus = message; } catch (e) { state.zmanimStatus = "לא הצלחנו לטעון זמני היום. אפשר לנסות שוב או לבדוק חיבור רשת."; } render(); }
  async function activateCompass() { try { if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") { var permission = await DeviceOrientationEvent.requestPermission(); if (permission !== "granted") { state.status = "לא ניתן אישור לשימוש בחיישני המצפן"; render(); return; } } state.status = "מאתר מיקום..."; render(); navigator.geolocation.getCurrentPosition(function (position) { state.bearing = getBearing(position.coords.latitude, position.coords.longitude, JERUSALEM.lat, JERUSALEM.lng); state.status = "המצפן פעיל - החץ הזהוב מצביע לירושלים"; render(); }, function () { state.status = "לא הצלחתי לקבל מיקום. בדוק הרשאות GPS"; render(); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }); } catch (e) { state.status = "אירעה שגיאה בהפעלת המצפן"; render(); } }
  function calibrateNorth() { if (state.rawHeading === null) { state.status = "צריך להזיז מעט את הטלפון כדי לקבל קריאת מצפן לפני כיול"; render(); return; } state.calibrationOffset = normalizeAngle(-state.rawHeading); state.smoothHeading = 0; state.heading = 0; state.status = "כיול נשמר - החזק את ראש הטלפון לכיוון צפון בעת הכיול"; saveCalibration(); render(); }
  function useCurrentLocationForZmanim() { state.zmanimStatus = "מאתר מיקום לזמני היום..."; render(); navigator.geolocation.getCurrentPosition(function (position) { loadZmanim({ lat: Number(position.coords.latitude.toFixed(5)), lng: Number(position.coords.longitude.toFixed(5)), label: "המיקום שלך" }, "זמני היום לפי המיקום שלך נטענו"); }, function () { state.zmanimStatus = "לא הצלחתי לקבל מיקום. מוצגים זמני ירושלים כברירת מחדל."; render(); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }); }
  window.addEventListener("deviceorientation", function (event) { var next = null; var source = "חיישן יחסי"; var accuracy = null; if (typeof event.webkitCompassHeading === "number") { next = event.webkitCompassHeading; source = "מצפן iPhone"; if (typeof event.webkitCompassAccuracy === "number") accuracy = Math.round(event.webkitCompassAccuracy); } else if (typeof event.alpha === "number") { next = 360 - event.alpha + getScreenAngle(); source = event.absolute ? "חיישן כיוון אבסולוטי" : "חיישן יחסי - דורש כיול"; } if (next === null) return; next = normalizeAngle(next); var calibrated = normalizeAngle(next + state.calibrationOffset); state.smoothHeading = normalizeAngle(state.smoothHeading + shortestAngleDiff(state.smoothHeading, calibrated) * 0.22); state.rawHeading = next; state.heading = state.smoothHeading; state.sensorSource = source; state.sensorAccuracy = accuracy; state.hasCompass = true; render(); }, true);
  render(); loadZmanim(JERUSALEM, "זמני היום לירושלים נטענו");
})();
