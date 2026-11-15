// Finca Ottero — live Home Assistant app.
// Runs in two modes:
//   live — served by Home Assistant (/local/finca-ottero/), signs in with Home Assistant's own login page.
//   demo — anywhere else (e.g. a design preview): sample data, nothing is sent anywhere.
(() => {
  "use strict";
  const C = window.FINCA_CONFIG;
  const Demo = window.FincaDemo;
  window.FincaAppLoaded = true;
  // Defaults for settings added after the first install, so an older config.js still gets them.
  C.climateAuto = C.climateAuto || { automation: "automation.finca_climate_air_con_on_spare_power", powerAvailable: "binary_sensor.finca_climate_power_available",
    mode: "sensor.finca_climate_mode", flags: { living: "switch.finca_auto_air_con_living_room", master: "switch.finca_auto_air_con_master_bedroom" } };
  const AC_POWER = { living: "sensor.venus_ac_loads_on_l1", master: "sensor.venus_ac_loads_on_l2" };
  // The bedroom unit cycles (≈400 W for a few minutes, then ≈30 W), so it counts as running if it peaked in the last 15 minutes.
  const AC_PEAK = { master: "sensor.solar_room_venus_finca_master_air_con_peak" };
  const ROOM_TEMP = { living: "sensor.hue_motion_sensor_3_temperature", master: "sensor.finca_master_bedroom_temperature" };  // bedroom = hallway − 2 °C
  C.alexaAC.forEach(u => { u.power = u.power || AC_POWER[u.id]; u.temp = u.temp || ROOM_TEMP[u.id]; if (/air conditioner$/.test(u.alexaName)) u.alexaName = u.alexaName.replace("air conditioner", "air con"); });

  // Logo: a geodesic dome against a retro sunset. Set here so a logo change arrives with app updates.
  const LOGO = `<svg viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <linearGradient id="fo-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2ee6d6"/><stop offset="1" stop-color="#ff5c8a"/></linearGradient>
    <linearGradient id="fo-sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb347"/><stop offset="0.6" stop-color="#ff7a5c"/><stop offset="1" stop-color="#ff5c8a"/></linearGradient>
    <clipPath id="fo-disc"><circle cx="32" cy="32" r="30"/></clipPath>
  </defs>
  <g clip-path="url(#fo-disc)">
    <rect width="64" height="64" fill="#0a0f24"/>
    <circle cx="32" cy="25" r="18" fill="url(#fo-sun)"/>
    <rect x="0" y="30" width="64" height="1.4" fill="#0a0f24"/><rect x="0" y="34" width="64" height="1.8" fill="#0a0f24"/><rect x="0" y="38.4" width="64" height="2.2" fill="#0a0f24"/>
    <path d="M8.0 46.0 L9.83 46.0 L9.88 37.79 Z" fill="rgb(34,150,141)"/>
    <path d="M9.83 46.0 L9.88 37.79 L13.25 37.79 Z" fill="rgb(35,130,123)"/>
    <path d="M9.83 46.0 L15.03 46.0 L13.25 37.79 Z" fill="rgb(44,144,137)"/>
    <path d="M15.03 46.0 L13.25 37.79 L19.47 37.79 Z" fill="rgb(47,122,118)"/>
    <path d="M15.03 46.0 L22.82 46.0 L19.47 37.79 Z" fill="rgb(63,131,130)"/>
    <path d="M22.82 46.0 L19.47 37.79 L27.6 37.79 Z" fill="rgb(66,109,111)"/>
    <path d="M22.82 46.0 L32.0 46.0 L27.6 37.79 Z" fill="rgb(87,115,122)"/>
    <path d="M32.0 46.0 L27.6 37.79 L36.4 37.79 Z" fill="rgb(88,94,103)"/>
    <path d="M32.0 46.0 L41.18 46.0 L36.4 37.79 Z" fill="rgb(113,98,112)"/>
    <path d="M41.18 46.0 L36.4 37.79 L44.53 37.79 Z" fill="rgb(111,80,95)"/>
    <path d="M41.18 46.0 L48.97 46.0 L44.53 37.79 Z" fill="rgb(137,82,103)"/>
    <path d="M48.97 46.0 L44.53 37.79 L50.75 37.79 Z" fill="rgb(129,67,88)"/>
    <path d="M48.97 46.0 L54.17 46.0 L50.75 37.79 Z" fill="rgb(156,70,96)"/>
    <path d="M54.17 46.0 L50.75 37.79 L54.12 37.79 Z" fill="rgb(142,59,84)"/>
    <path d="M54.17 46.0 L56.0 46.0 L54.12 37.79 Z" fill="rgb(166,63,93)"/>
    <path d="M9.88 37.79 L13.25 37.79 L13.61 30.57 Z" fill="rgb(43,146,138)"/>
    <path d="M13.25 37.79 L13.61 30.57 L16.08 30.57 Z" fill="rgb(61,175,169)"/>
    <path d="M13.25 37.79 L19.47 37.79 L16.08 30.57 Z" fill="rgb(55,138,134)"/>
    <path d="M19.47 37.79 L16.08 30.57 L22.81 30.57 Z" fill="rgb(79,163,162)"/>
    <path d="M19.47 37.79 L27.6 37.79 L22.81 30.57 Z" fill="rgb(75,124,127)"/>
    <path d="M27.6 37.79 L22.81 30.57 L32.0 30.57 Z" fill="rgb(108,144,151)"/>
    <path d="M27.6 37.79 L36.4 37.79 L32.0 30.57 Z" fill="rgb(101,108,118)"/>
    <path d="M36.4 37.79 L32.0 30.57 L41.19 30.57 Z" fill="rgb(141,122,139)"/>
    <path d="M36.4 37.79 L44.53 37.79 L41.19 30.57 Z" fill="rgb(126,91,108)"/>
    <path d="M44.53 37.79 L41.19 30.57 L47.92 30.57 Z" fill="rgb(169,103,129)"/>
    <path d="M44.53 37.79 L50.75 37.79 L47.92 30.57 Z" fill="rgb(146,77,101)"/>
    <path d="M50.75 37.79 L47.92 30.57 L50.39 30.57 Z" fill="rgb(188,91,122)"/>
    <path d="M50.75 37.79 L54.12 37.79 L50.39 30.57 Z" fill="rgb(158,70,97)"/>
    <path d="M13.61 30.57 L16.08 30.57 L20.59 25.22 Z" fill="rgb(75,183,179)"/>
    <path d="M16.08 30.57 L22.81 30.57 L20.59 25.22 Z" fill="rgb(75,151,151)"/>
    <path d="M22.81 30.57 L20.59 25.22 L24.95 25.22 Z" fill="rgb(102,173,175)"/>
    <path d="M22.81 30.57 L32.0 30.57 L24.95 25.22 Z" fill="rgb(98,136,143)"/>
    <path d="M32.0 30.57 L24.95 25.22 L32.0 25.22 Z" fill="rgb(129,154,165)"/>
    <path d="M32.0 30.57 L32.0 25.22 L39.05 25.22 Z" fill="rgb(129,124,138)"/>
    <path d="M32.0 30.57 L41.19 30.57 L39.05 25.22 Z" fill="rgb(155,130,149)"/>
    <path d="M41.19 30.57 L39.05 25.22 L43.41 25.22 Z" fill="rgb(153,108,129)"/>
    <path d="M41.19 30.57 L47.92 30.57 L43.41 25.22 Z" fill="rgb(182,112,140)"/>
    <path d="M47.92 30.57 L50.39 30.57 L43.41 25.22 Z" fill="rgb(168,91,117)"/>
    <path d="M20.59 25.22 L24.95 25.22 L27.01 22.52 Z" fill="rgb(112,177,181)"/>
    <path d="M24.95 25.22 L32.0 25.22 L27.01 22.52 Z" fill="rgb(112,145,154)"/>
    <path d="M32.0 25.22 L27.01 22.52 L32.0 22.52 Z" fill="rgb(140,162,175)"/>
    <path d="M32.0 25.22 L32.0 22.52 L36.99 22.52 Z" fill="rgb(135,134,149)"/>
    <path d="M32.0 25.22 L39.05 25.22 L36.99 22.52 Z" fill="rgb(162,144,163)"/>
    <path d="M39.05 25.22 L43.41 25.22 L36.99 22.52 Z" fill="rgb(156,117,138)"/>
    <path d="M27.01 22.52 L32.0 22.52 L32.0 22.0 Z" fill="rgb(142,165,178)"/>
    <path d="M32.0 22.52 L36.99 22.52 L32.0 22.0 Z" fill="rgb(138,137,152)"/>
    <g fill="none" stroke="#0a0f24" stroke-width="0.75" stroke-linejoin="round"><path d="M8.0 46.0 L9.83 46.0 L9.88 37.79 Z"/><path d="M9.83 46.0 L9.88 37.79 L13.25 37.79 Z"/><path d="M9.83 46.0 L15.03 46.0 L13.25 37.79 Z"/><path d="M15.03 46.0 L13.25 37.79 L19.47 37.79 Z"/><path d="M15.03 46.0 L22.82 46.0 L19.47 37.79 Z"/><path d="M22.82 46.0 L19.47 37.79 L27.6 37.79 Z"/><path d="M22.82 46.0 L32.0 46.0 L27.6 37.79 Z"/><path d="M32.0 46.0 L27.6 37.79 L36.4 37.79 Z"/><path d="M32.0 46.0 L41.18 46.0 L36.4 37.79 Z"/><path d="M41.18 46.0 L36.4 37.79 L44.53 37.79 Z"/><path d="M41.18 46.0 L48.97 46.0 L44.53 37.79 Z"/><path d="M48.97 46.0 L44.53 37.79 L50.75 37.79 Z"/><path d="M48.97 46.0 L54.17 46.0 L50.75 37.79 Z"/><path d="M54.17 46.0 L50.75 37.79 L54.12 37.79 Z"/><path d="M54.17 46.0 L56.0 46.0 L54.12 37.79 Z"/><path d="M9.88 37.79 L13.25 37.79 L13.61 30.57 Z"/><path d="M13.25 37.79 L13.61 30.57 L16.08 30.57 Z"/><path d="M13.25 37.79 L19.47 37.79 L16.08 30.57 Z"/><path d="M19.47 37.79 L16.08 30.57 L22.81 30.57 Z"/><path d="M19.47 37.79 L27.6 37.79 L22.81 30.57 Z"/><path d="M27.6 37.79 L22.81 30.57 L32.0 30.57 Z"/><path d="M27.6 37.79 L36.4 37.79 L32.0 30.57 Z"/><path d="M36.4 37.79 L32.0 30.57 L41.19 30.57 Z"/><path d="M36.4 37.79 L44.53 37.79 L41.19 30.57 Z"/><path d="M44.53 37.79 L41.19 30.57 L47.92 30.57 Z"/><path d="M44.53 37.79 L50.75 37.79 L47.92 30.57 Z"/><path d="M50.75 37.79 L47.92 30.57 L50.39 30.57 Z"/><path d="M50.75 37.79 L54.12 37.79 L50.39 30.57 Z"/><path d="M13.61 30.57 L16.08 30.57 L20.59 25.22 Z"/><path d="M16.08 30.57 L22.81 30.57 L20.59 25.22 Z"/><path d="M22.81 30.57 L20.59 25.22 L24.95 25.22 Z"/><path d="M22.81 30.57 L32.0 30.57 L24.95 25.22 Z"/><path d="M32.0 30.57 L24.95 25.22 L32.0 25.22 Z"/><path d="M32.0 30.57 L32.0 25.22 L39.05 25.22 Z"/><path d="M32.0 30.57 L41.19 30.57 L39.05 25.22 Z"/><path d="M41.19 30.57 L39.05 25.22 L43.41 25.22 Z"/><path d="M41.19 30.57 L47.92 30.57 L43.41 25.22 Z"/><path d="M47.92 30.57 L50.39 30.57 L43.41 25.22 Z"/><path d="M20.59 25.22 L24.95 25.22 L27.01 22.52 Z"/><path d="M24.95 25.22 L32.0 25.22 L27.01 22.52 Z"/><path d="M32.0 25.22 L27.01 22.52 L32.0 22.52 Z"/><path d="M32.0 25.22 L32.0 22.52 L36.99 22.52 Z"/><path d="M32.0 25.22 L39.05 25.22 L36.99 22.52 Z"/><path d="M39.05 25.22 L43.41 25.22 L36.99 22.52 Z"/><path d="M27.01 22.52 L32.0 22.52 L32.0 22.0 Z"/><path d="M32.0 22.52 L36.99 22.52 L32.0 22.0 Z"/></g>
    <path d="M8 46 A24 24 0 0 1 56 46" fill="none" stroke="#f3e9dc" stroke-opacity="0.35" stroke-width="0.6"/>
    <rect x="0" y="46" width="64" height="18" fill="#0a0f24"/>
    <path d="M5 46 H59" stroke="#2ee6d6" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M14 50.5 H50 M22 54.5 H42" stroke="#2ee6d6" stroke-opacity="0.4" stroke-width="0.9" stroke-linecap="round"/>
  </g>
  <circle cx="32" cy="32" r="30.2" fill="none" stroke="url(#fo-ring)" stroke-width="1.8"/>
</svg>`;
  { const old = document.querySelector(".brand svg"); if (old) old.outerHTML = LOGO; }

  // ---------- icons (one line style: 24px grid, 1.75 stroke, round caps) ----------
  const P = {
    home: '<path d="M3 11 12 3.5 21 11"/><path d="M5 9.5V20h14V9.5"/><circle cx="12" cy="14.5" r="2.6"/><circle cx="12" cy="14.5" r=".6" fill="currentColor"/><path d="M12 10.6v1.3M12 17.1v1.3M8.1 14.5h1.3M14.6 14.5h1.3"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/><path d="M10.4 10.5 12 12.5l1.6-2"/><path d="M3 9h1.5M19.5 9H21M5.2 3.8l1 1M18.8 3.8l-1 1"/>',
    gate: '<path d="M4 21V5M20 21V5M3 5h2M19 5h2M4 9h16M4 17h16M8 9v8M12 9v8M16 9v8"/>',
    shield: '<path d="M12 2.8 4.5 5.8v5.7c0 4.6 3.1 8.2 7.5 9.7 4.4-1.5 7.5-5.1 7.5-9.7V5.8z"/><path d="M12 7.5 15.5 13.5h-7z"/><circle cx="12" cy="11.6" r=".9" fill="currentColor"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
    poolhouse: '<path d="M4 10.5 12 4l8 6.5M6 9.2V17M18 9.2V17M10 17v-4h4v4"/><path d="M2 20.5c1.7 0 1.7-1.2 3.3-1.2s1.7 1.2 3.4 1.2 1.6-1.2 3.3-1.2 1.7 1.2 3.3 1.2 1.7-1.2 3.4-1.2 1.6 1.2 3.3 1.2"/>',
    jacuzzi: '<path d="M3 12.5h18v2.5a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 15z"/><path d="M7 19.5 6 21.5M17 19.5l1 2"/><circle cx="8" cy="8.5" r="1.6"/><circle cx="12.5" cy="5.5" r="1.1"/><circle cx="15.5" cy="9" r="1.8"/>',
    pump: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 3.5v4h-4"/><path d="M12 8.6c-1.3 1.6-2.1 2.7-2.1 3.7a2.1 2.1 0 0 0 4.2 0c0-1-.8-2.1-2.1-3.7z"/>',
    poollight: '<circle cx="12" cy="10" r="3.2"/><path d="M12 3v1.5M6.6 5.6l1.1 1.1M17.4 5.6l-1.1 1.1M4.5 10.5H6M18 10.5h1.5"/><path d="M2 18.5c1.7 0 1.7-1.2 3.3-1.2s1.7 1.2 3.4 1.2 1.6-1.2 3.3-1.2 1.7 1.2 3.3 1.2 1.7-1.2 3.4-1.2 1.6 1.2 3.3 1.2"/>',
    wifi: '<path d="M2.5 8.8a14 14 0 0 1 19 0M5.6 12.3a9.3 9.3 0 0 1 12.8 0M8.8 15.8a4.7 4.7 0 0 1 6.4 0"/><path d="M12 19.3h.01"/>',
    battery: '<rect x="2.5" y="7" width="17" height="10" rx="2"/><path d="M21.5 10.5v3"/><path d="M6 10v4M9.5 10v4M13 10v4"/>',
    grid: '<path d="M12 2.5 7.5 21.5M12 2.5l4.5 19M7.7 8h8.6M6.5 13.5h11M9 18.5l6-5M15 18.5l-6-5M4 8h16"/>',
    camera: '<path d="M3 8h3.2l1.8-2.7h8l1.8 2.7H21v11H3z"/><circle cx="12" cy="13.3" r="3.4"/>',
    sensor: '<circle cx="12" cy="12" r="2"/><path d="M8.4 8.4a5.1 5.1 0 0 0 0 7.2M15.6 8.4a5.1 5.1 0 0 1 0 7.2M5.5 5.5a9.2 9.2 0 0 0 0 13M18.5 5.5a9.2 9.2 0 0 1 0 13"/>',
    fire: '<path d="M12 2.5c1.2 3.2 4.7 4.8 4.7 9.8a4.7 4.7 0 0 1-9.4 0c0-2.2 1.1-3.5 2.2-4.5 0 2.1 1 3.2 2.1 3.2 0-3.3-1-5.4.4-8.5z"/>',
    drop: '<path d="M12 3c3 4 6.2 7 6.2 11a6.2 6.2 0 0 1-12.4 0C5.8 10 9 7 12 3z"/>',
    heater: '<path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 9v7.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    power: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v3.3M12 17.2v3.3M3.5 12h3.3M17.2 12h3.3"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2.2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
    alexa: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 15.5a5 5 0 1 1 7 0"/>',
    snow: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6"/><path d="M9.6 4.2 12 6.5l2.4-2.3M9.6 19.8 12 17.5l2.4 2.3"/><circle cx="12" cy="12" r="2.2"/>',
    music: '<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M22 11v2"/>',
    radio: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8l10-5"/><circle cx="15.5" cy="14" r="2.5"/><path d="M6.5 12.5h4M6.5 15.5h4"/>',
    plane: '<path d="M10.5 21l2-7-6 0-2 3-2-1 1.5-4L2.5 8l2-1 2 3h6l-2-7 2.5 0 4.5 7h4a1.5 1.5 0 0 1 0 3h-4l-4.5 7z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5 16 16"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    shuffle: '<path d="M3 7h3.5c2 0 3.3 1 4.5 2.7l2 3c1.2 1.8 2.5 2.8 4.5 2.8H21M18.5 13 21 15.5 18.5 18M3 16.5h3.5c1.4 0 2.4-.5 3.3-1.4M14.2 8.2c.9-.8 1.9-1.2 3.3-1.2H21M18.5 4.5 21 7l-2.5 2.5"/>',
    repeat: '<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>',
    repeat1: '<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/><path d="M11.5 10.5 13 9.5v5"/>',
    share: '<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/><circle cx="12" cy="17" r="1.2"/>',
    pin: '<path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/>',
    tv: '<rect x="2.5" y="5" width="19" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
    play: '<path d="M7 4.5v15l12.5-7.5z"/>',
    pause: '<path d="M8 4.5v15M16 4.5v15"/>',
    next: '<path d="M5 5v14l10-7zM18.5 5v14"/>',
    prev: '<path d="M19 5v14L9 12zM5.5 5v14"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/><path d="M3 9v4M21 9v4"/>',
    send: '<path d="M4 12 20 4l-4 16-4-7z"/><path d="m12 13 8-9"/>',
    more: '<path d="M12 3.5 19.4 7.8v8.4L12 20.5l-7.4-4.3V7.8z"/><circle cx="8.5" cy="12" r=".9" fill="currentColor"/><circle cx="12" cy="12" r=".9" fill="currentColor"/><circle cx="15.5" cy="12" r=".9" fill="currentColor"/>',
    plus: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9.5 2.5v3.5M14.5 2.5v3.5M9.5 18v3.5M14.5 18v3.5M2.5 9.5H6M2.5 14.5H6M18 9.5h3.5M18 14.5h3.5"/><path d="M12 9.5v5M9.5 12h5"/>',
    heart: '<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/>',
    party: '<path d="M4 20 9.5 6.5 17.5 14.5z"/><path d="M8 15.5l2.5 2.5M11 10.5l4.5 4.5"/><path d="M14 4.5c.8 1 .8 2-.2 2.8M18.5 9c1-.8 2-.8 2.8.2M17 3.5h.01M20.5 6.5h.01M20 12.5h.01"/>',
    fan: '<circle cx="12" cy="12" r="1.8"/><path d="M12 10.2C11 6 12.5 3 15 3.5s2.2 4-3 6.7M13.8 12c4.2-1 7.2.5 6.7 3s-4 2.2-6.7-3M12 13.8c1 4.2-.5 7.2-3 6.7s-2.2-4 3-6.7M10.2 12C6 13 3 11.5 3.5 9s4-2.2 6.7 3"/>'
  };
  const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

  // ---------- helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const pad = n => String(n).padStart(2, "0");
  const hm = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const domainOf = id => id.split(".")[0];
  const store = { mode: "demo", conn: null, hassUrl: "", states: {}, areas: {}, devices: {}, ents: {}, pipelines: [], preferredPipeline: null, online: false, history: null, historyAt: 0 };
  const mem = {
    get(k, d) { try { const v = localStorage.getItem("finca." + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("finca." + k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
  };

  const st = id => (id && store.states[id]) || null;
  const nmRaw = s => (s && s.attributes && s.attributes.friendly_name) || (s ? s.entity_id : "");
  // Tidy names (15 Nov): "Ganes Room2" → "Games Room 2", "Room2" → "Room 2", doubled spaces.
  const nm = s => nmRaw(s).replace(/\bganes\b/i, "Games").replace(/([a-z])(\d+)$/i, "$1 $2").replace(/\s{2,}/g, " ").trim();
  const natCmp = (a, b) => String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "base" });
  // House order (15 Nov, owner): rooms listed as you move through the finca; anything new goes after, A–Z.
  const ROOM_ORDER = ["living room", "kitchen", "downstairs lounge", "hallway", "front door", "bar", "terrace", "pool", "pool house",
    "master bedroom", "bedroom", "bedroom 2", "games room", "games room 2", "downstairs loo", "outside", "other lights"];
  const roomCmp = (a, b) => { const ia = ROOM_ORDER.indexOf(String(a).toLowerCase()), ib = ROOM_ORDER.indexOf(String(b).toLowerCase());
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || natCmp(a, b); };
  // Speakers in house order: Living room, Bar, Bar 2, Games Room, Games Room 2, Move, Bedroom, Bedroom 2, then TV.
  const SPK_ORDER = ["tv_room", "bar", "bar_2", "games_room", "ganes_room2", "move", "bedroom", "bedroom_2"];
  const spkRank = e => { const k = String(e).replace(/^media_player\./, "").replace(/_(tv_room|bar|bar_2|games_room|ganes_room2|bedroom|bedroom_2)$/, "")
      .replace(/_sonos_.*$/, "").replace(/^move_2$/, "move"); const i = SPK_ORDER.indexOf(k); return i < 0 ? 50 : i; };
  const ok = s => !!s && s.state !== "unavailable" && s.state !== "unknown";
  const num = id => { const s = st(id); if (!ok(s)) return null; const v = parseFloat(s.state); return Number.isFinite(v) ? v : null; };
  const isHidden = s => C.hide.some(r => r.test(s.entity_id) || r.test(nm(s)));
  const all = dom => Object.values(store.states).filter(s => domainOf(s.entity_id) === dom && !isHidden(s));
  const areaOf = id => {
    const e = store.ents[id]; if (!e) return "";
    const aid = e.area_id || (store.devices[e.device_id] || {}).area_id;
    return (store.areas[aid] || {}).name || "";
  };
  const platformOf = id => (store.ents[id] || {}).platform || "";
  function find(key) {
    const cfg = C.devices[key]; if (!cfg) return null;
    if (cfg.entity) return st(cfg.entity);
    for (const dom of cfg.domains) {
      const hit = Object.values(store.states).find(s => domainOf(s.entity_id) === dom && !isHidden(s)
        && (!cfg.deviceClass || s.attributes.device_class === cfg.deviceClass)
        && cfg.match.some(r => r.test(nm(s))));
      if (hit) return hit;
    }
    return null;
  }
  const ago = iso => {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return "just now"; if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60); return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
  };
  const kw = w => (Math.abs(w) / 1000).toFixed(2);

  function toast(msg) {
    const host = $("#toast-host");
    host.innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`;
    clearTimeout(toast.t); toast.t = setTimeout(() => { host.innerHTML = ""; }, 3600);
  }

  // ---------- update bubble (12 Nov): updates that ask first, shown while the app is open ----------
  const ASK_UPDATES = ["update.home_assistant_core_update", "update.home_assistant_operating_system_update", "update.ewelink_smart_home_update", "update.mosquitto_broker_update"];
  const laterUpdates = new Set();
  function updateBubble() {
    let host = $("#update-host");
    if (!host) { host = document.createElement("div"); host.id = "update-host"; document.body.appendChild(host); }
    if (store.mode === "demo") { host.innerHTML = ""; return; }
    const busy = ASK_UPDATES.map(st).find(s => s && s.attributes.in_progress);
    const u = ASK_UPDATES.map(st).find(s => s && s.state === "on" && !s.attributes.in_progress && !laterUpdates.has(s.entity_id + s.attributes.latest_version));
    const a = busy ? busy.attributes : u ? u.attributes : null;
    const html = !a ? "" : busy
      ? `<div class="upd" role="status"><strong>Updating ${esc(a.title || "")}…</strong><span>A backup was made first. You'll get a message on your iPhone when it's checked.</span></div>`
      : `<div class="upd" role="dialog" aria-label="Update available"><strong>Update available</strong>
          <span>${esc(a.title || "")} ${esc(a.latest_version || "")} (you have ${esc(a.installed_version || "")}). A backup is made first, then everything is checked.</span>
          <div class="upd-acts"><button class="btn btn-primary" data-upd-now="${esc(u.entity_id)}">Update now</button>
          <button class="btn btn-ghost" data-upd-later="${esc(u.entity_id + a.latest_version)}">Later</button>
          <button class="btn btn-ghost" data-upd-skip="${esc(u.entity_id)}">Ignore this version</button></div></div>`;
    if (host.innerHTML !== html) host.innerHTML = html;
  }

  // ---------- service calls ----------
  async function svc(domain, service, data = {}, target) {
    try {
      if (store.mode === "demo") return Demo.call(domain, service, data, target);
      return await window.HAWS.callService(store.conn, domain, service, data, target);
    } catch (e) {
      toast(`Home Assistant refused that: ${e.message || e.code || "unknown error"}`);
      throw e;
    }
  }
  const sw = (id, on, label, tint = "") => `<button class="switch" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-toggle="${esc(id)}" ${tint ? `style="--tint:var(--${tint})"` : ""}></button>`;

  // ---------- schedules (eWeLink, display only) ----------
  function nextEvent(windows, m) {
    const ev = [];
    windows.forEach(([a, b]) => { ev.push({ t: a, on: true }); ev.push({ t: b % 1440, on: false }); });
    ev.sort((x, y) => x.t - y.t);
    return ev.find(e => e.t > m) || ev[0];
  }
  const fmtT = t => (t === 0 ? "midnight" : hm(t));
  function timeline(windows) {
    const m = nowMin();
    const segs = windows.map(([a, b]) => `<span class="seg" style="left:${a / 14.4}%;width:${(b - a) / 14.4}%"></span>`).join("");
    return `<div class="timeline" style="--tint:var(--turq)" aria-hidden="true">${segs}<span class="now" style="left:calc(${m / 14.4}% - 1px)"></span></div>
      <div class="tl-scale"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>`;
  }
  function schedText(s, windows) {
    if (!ok(s)) return "Offline";
    const nx = nextEvent(windows, nowMin());
    return `${s.state === "on" ? "On" : "Off"} · eWeLink ${nx.on ? "on" : "off"} at ${fmtT(nx.t)}`;
  }

  // ---------- energy ----------
  function energy() {
    const E = C.energy;
    const ac = num(E.acLoads), ess = num(E.essential);
    const home = ac === null && ess === null ? null : (ac || 0) + (ess || 0);
    const inv = st(E.inverter);
    return { soc: num(E.soc), pv: num(E.pv), grid: num(E.grid), batt: num(E.battery), ac, ess, home, inverter: ok(inv) ? inv.state : null, pvToday: num(E.pvToday) };
  }

  // ---------- navigation ----------
  const NAV = [
    { id: "home", label: "Home", icon: "home" },
    { id: "lighting", label: "Lighting", icon: "bulb" },
    { id: "media", label: "Music", icon: "music" },
    { id: "security", label: "Security", icon: "shield" },
    { id: "climate", label: "Climate", icon: "snow", rail: true },
    { id: "gates", label: "Gates", icon: "gate", rail: true },
    { id: "energy", label: "Energy", icon: "sun", rail: true },
    { id: "pool", label: "Pool", icon: "poollight", rail: true },
    { id: "devices", label: "Devices", icon: "plus", rail: true },
    { id: "health", label: "Checks", icon: "battery", rail: true },
    { id: "otters", label: "Find My Otter", icon: "pin", rail: true },
    { id: "jarvis", label: "Jarvis", icon: "mic", rail: true }
  ];
  function renderNav(cur) {
    $("#nav").innerHTML = NAV.map(n => `<a href="#${n.id}" class="${n.rail ? "rail-only" : ""}" ${n.id === cur ? 'aria-current="page"' : ""}>${icon(n.icon)}<span>${n.label}</span></a>`).join("")
      + `<a href="#more" class="more-link" data-action="more" aria-expanded="false" ${NAV.some(n => n.rail && n.id === cur) ? 'aria-current="page"' : ""}>${icon("more")}<span>More</span></a>`;
  }

  // ---------- views ----------
  function greeting() {
    const h = new Date().getHours();
    return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }
  function tile({ id, title, ic, tint, state, href, ctl = "", on = false }) {
    return `<article class="card tile t-${tint} ${on ? "is-on" : ""}" data-tile="${id}">
      <a class="tile-link" href="${href}" aria-label="${esc(title)}"></a>
      <div class="tile-head"><span class="ico">${icon(ic)}</span><span class="ctl">${ctl}</span></div>
      <div><h3>${esc(title)}</h3><p class="state">${state}</p></div>
    </article>`;
  }
  function switchTile(key, ic, tint, href, onText = "On") {
    const s = find(key), title = C.devices[key].name;
    if (!s) return tile({ id: key, title, ic, tint, href, state: '<span class="unavail">Not found in Home Assistant</span>' });
    if (!ok(s)) return tile({ id: key, title, ic, tint, href, state: "Offline", ctl: '<span class="pill warn">Offline</span>' });
    const on = s.state === "on";
    return tile({ id: key, title, ic, tint, href, on, state: on ? `<strong>${onText}</strong>` : "Off", ctl: sw(s.entity_id, on, title, tint === "turq" ? "" : tint) });
  }
  function watched() {
    const ids = [...all("light"), ...all("camera"), ...all("climate"), ...all("media_player")].map(s => s.entity_id);
    Object.keys(C.devices).forEach(k => { const s = find(k); if (s) ids.push(s.entity_id); });
    return [...new Set(ids)].map(st).filter(Boolean);
  }

  // ---------- Most used (12 Nov): the buttons you press most, at the top of Home; learns per device ----------
  const USE_KEY = "usage";
  function usageKey(d, t) {
    if (d.toggle) return "toggle:" + d.toggle;
    if (d.area) { const card = t.closest("[data-room]"); return card ? "area:" + card.dataset.room : null; }
    if (d.acquick) return "ac:" + d.acquick + ":" + d.mode;
    if (d.action === "gate") return "gate";
    return null;
  }
  function recordUse(key) {
    if (!key) return;
    const u = mem.get(USE_KEY, {}), now = Date.now(), e = u[key] || { s: 0, t: now };
    e.s = e.s * Math.pow(0.5, (now - e.t) / (14 * 864e5)) + 1; e.t = now;  // score halves every 2 weeks unused
    u[key] = e; mem.set(USE_KEY, u);
  }
  function roomLights(room) { return realLights().filter(s => (areaOf(s.entity_id) || "") === room); }
  function quickButton(key) {
    const [kind, a, b] = key.split(":");
    if (kind === "toggle") {
      const s = st(a); if (!s || !ok(s)) return "";
      const on = s.state === "on", isParty = a === "switch.finca_party_mode";
      const label = isParty ? "Party" : /romantic/.test(a) ? "Romantic" : nm(s);
      return `<button class="qbtn ${on ? "is-on" : ""}" data-toggle="${esc(a)}" aria-pressed="${on}">${icon(isParty ? "party" : /romantic/i.test(a) ? "heart" : /fire/i.test(label) ? "fire" : /pump/i.test(label) ? "pump" : /jacuzzi/i.test(label) ? "jacuzzi" : a.startsWith("light.") ? "bulb" : "power")}<b>${esc(label)}</b><span>${on ? "On" : "Off"}</span></button>`;
    }
    if (kind === "area") {
      const ls = roomLights(a).filter(ok); if (!ls.length) return "";
      const on = ls.some(s => s.state === "on");
      return `<button class="qbtn ${on ? "is-on" : ""}" data-area="${esc(ls.map(s => s.entity_id).join(","))}" data-room="${esc(a)}" aria-checked="${on}">${icon("bulb")}<b>${esc(a)} lights</b><span>${on ? "On" : "Off"}</span></button>`;
    }
    if (kind === "ac") {
      const u = (C.alexaAC || []).find(x => x.id === a); if (!u) return "";
      return `<button class="qbtn" data-acquick="${esc(a)}" data-mode="${esc(b)}">${icon(b === "heat" ? "heater" : "snow")}<b>${esc(u.name)} air con</b><span>${b === "heat" ? "Heat" : "Cool"} to 23°</span></button>`;
    }
    if (kind === "gate") return find("gate") ? `<button class="qbtn" data-action="gate">${icon("gate")}<b>Main gate</b><span>Open</span></button>` : "";
    return "";
  }
  function quickCard() {
    const u = mem.get(USE_KEY, {}), now = Date.now();
    const score = k => u[k] ? u[k].s * Math.pow(0.5, (now - u[k].t) / (14 * 864e5)) : 0;
    const defaults = ["area:Living Room", "toggle:switch.finca_party_mode", "area:Kitchen", "ac:living:heat"];
    const keys = [...new Set([...Object.keys(u).filter(k => score(k) >= 0.5).sort((x, y) => score(y) - score(x)), ...defaults])];
    const btns = []; for (const k of keys) { const h = quickButton(k); if (h) btns.push(h); if (btns.length === 4) break; }
    return btns.length ? `<div class="quick" aria-label="Most used">${btns.join("")}</div>` : "";
  }


  // ---- 14 Nov extras: 5-day weather with wind, solar forecast + savings, holiday mode, good morning / goodnight ----
  const wx = { at: 0, days: null, busy: false };
  async function loadForecast() {
    const w = all("weather")[0]; if (!w || wx.busy || Date.now() - wx.at < 30 * 60000) return;
    wx.busy = true;
    try {
      if (store.mode === "demo") {
        const c = ["sunny", "partlycloudy", "sunny", "rainy", "cloudy", "sunny"];
        wx.days = c.map((x, i) => ({ datetime: new Date(Date.now() + i * 864e5).toISOString(), condition: x, temperature: 22 - i, templow: 13 + (i % 3), wind_speed: 12 + i * 4, wind_bearing: 90 + i * 40, precipitation_probability: x === "rainy" ? 70 : 5 }));
      } else {
        const r = await store.conn.sendMessagePromise({ type: "call_service", domain: "weather", service: "get_forecasts", service_data: { type: "daily" }, target: { entity_id: w.entity_id }, return_response: true });
        wx.days = (((r.response || {})[w.entity_id] || {}).forecast) || [];
      }
      wx.at = Date.now(); lastHtml = ""; render(false);
      const open = document.querySelector("#layer .sheet"); if (open && wx.sheet && !open.querySelector(".wx-days")) open.innerHTML = weatherCard(true);
    } catch { wx.at = Date.now() - 25 * 60000; } finally { wx.busy = false; }
  }
  // Weather icons (15 Nov): own HUD-style line icons instead of emojis (the wall tablet showed some emojis as blank squares).
  const WXP = {
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.3M12 19.2v2.3M2.5 12h2.3M19.2 12h2.3M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
    moon: '<path d="M19.5 14.5A7.5 7.5 0 1 1 9.5 4.5a6 6 0 0 0 10 10z"/><path d="M17 4.5v2M16 5.5h2"/>',
    cloud: '<path d="M7 18.5h10.5a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 7.4 9.2 4.7 4.7 0 0 0 7 18.5z"/>',
    pcloud: '<circle cx="8.5" cy="8.5" r="3.2"/><path d="M8.5 2.6v1.4M2.6 8.5h1.4M4.3 4.3l1 1M12.7 4.3l-1 1"/><path d="M9 19.5h9a3.5 3.5 0 0 0 .3-7 4.8 4.8 0 0 0-9.1-1.1A4 4 0 0 0 9 19.5z"/>',
    rain: '<path d="M7 15.5h10.5a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 7.4 6.2 4.7 4.7 0 0 0 7 15.5z"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>',
    storm: '<path d="M7 14.5h10.5a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 7.4 5.2 4.7 4.7 0 0 0 7 14.5z"/><path d="M12.5 14.5l-2 3.5h3l-2 3.5"/>',
    fog: '<path d="M7 12.5h10.5a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.5 1.2A3.6 3.6 0 0 0 7 12.5z"/><path d="M4 15.5h16M6 18.5h12M8 21.5h8"/>',
    wind: '<path d="M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>'
  };
  const WX_KIND = { sunny: "sun", "clear-night": "moon", partlycloudy: "pcloud", cloudy: "cloud", rainy: "rain", pouring: "rain", "lightning-rainy": "storm",
    lightning: "storm", fog: "fog", windy: "wind", "windy-variant": "wind", snowy: "snow", "snowy-rainy": "snow", hail: "snow", exceptional: "storm" };
  const wxIcon = c => { const k = WX_KIND[c] || "cloud"; return `<svg class="wxsvg wx-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${WXP[k]}</svg>`; };
  const WX_ICON = new Proxy({}, { get: (_, c) => wxIcon(String(c)) });
  const compass = b => b === undefined || b === null ? "" : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(((+b % 360) + 360) % 360 / 45) % 8];
  function weatherCard(inSheet = false) {
    loadForecast();
    const days = (wx.days || []).slice(0, 5); if (!days.length) return "";
    const w = all("weather")[0], a = (w && w.attributes) || {};
    return `<article class="${inSheet ? "" : "card "}wx" style="--tint:var(--turq)">
      <div class="card-head"><span class="ico">${icon("sun")}</span><div class="grow"><h3>Weather</h3>
        <div class="row-sub">${a.temperature !== undefined ? `Now ${Math.round(a.temperature)}°C` : ""}${a.wind_speed !== undefined ? ` · wind ${Math.round(a.wind_speed)} km/h ${compass(a.wind_bearing)}` : ""}${a.humidity !== undefined ? ` · humidity ${Math.round(a.humidity)}%` : ""}</div></div></div>
      <div class="row-sub wx-key">Highs and lows in °C · wind in km/h</div>
      <div class="wx-days">${days.map((d, i) => `<div class="wx-day">
        <div class="wx-d">${i === 0 ? "Today" : new Date(d.datetime).toLocaleDateString("en-GB", { weekday: "short" })}</div>
        <div class="wx-i" title="${esc(String(d.condition || "").replace(/-/g, " "))}">${WX_ICON[d.condition] || "·"}</div>
        <div class="wx-t"><b>${Math.round(d.temperature)}°</b>${d.templow !== undefined ? `<span>${Math.round(d.templow)}°</span>` : ""}</div>
        <div class="wx-w"><svg class="wxsvg wx-wind" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7"/></svg> ${d.wind_speed !== undefined ? Math.round(d.wind_speed) : "—"}<small>${compass(d.wind_bearing) || "&nbsp;"}</small></div>
        ${(d.precipitation_probability || 0) >= 20 ? `<div class="wx-r"><svg class="wxsvg wx-rain" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.5s6 6.6 6 10.5a6 6 0 0 1-12 0c0-3.9 6-10.5 6-10.5z"/></svg> ${Math.round(d.precipitation_probability)}%</div>` : (d.precipitation || 0) >= 0.3 ? `<div class="wx-r"><svg class="wxsvg wx-rain" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.5s6 6.6 6 10.5a6 6 0 0 1-12 0c0-3.9 6-10.5 6-10.5z"/></svg> ${(+d.precipitation).toFixed(1)} mm</div>` : ""}
      </div>`).join("")}</div>
      ${inSheet ? '<div class="acts"><button class="btn" data-action="close">Close</button></div>' : ""}
    </article>`;
  }
  function solarForecastCard() {
    const today = st("sensor.energy_production_today"), tom = st("sensor.energy_production_tomorrow"), peak = st("sensor.power_highest_peak_time_today");
    const rem = st("sensor.energy_production_today_remaining"), month = st("sensor.solar_room_fronius_symo_17_5_3_m_id_20_finca_solar_energy_this_month"), sav = st("sensor.finca_solar_savings_this_month");
    if (!today && !month && store.mode !== "demo") return "";
    const n = x => x && ok(x) && !isNaN(+x.state) ? +x.state : null;
    const pk = peak && ok(peak) ? new Date(peak.state) : null;
    const best = pk && !isNaN(pk) ? `${pad(Math.max(0, pk.getHours() - 2))}:00–${pad(Math.min(23, pk.getHours() + 2))}:00` : null;
    const big = (v, u) => v === null ? "—" : `${Math.round(v)}<small> ${u}</small>`;
    return `<div class="grid g-2">
      <article class="card" style="--tint:var(--sunset)"><div class="card-head"><span class="ico">${icon("sun")}</span><div class="grow"><h3>Solar forecast</h3><div class="row-sub">What the panels could make (Forecast.Solar)</div></div></div>
        <div class="fc-row"><div><div class="row-sub">Today</div><div class="fc-n">${big(n(today), "kWh")}</div>${n(rem) !== null ? `<div class="row-sub">${Math.round(n(rem))} kWh still to come</div>` : ""}</div>
          <div><div class="row-sub">Tomorrow</div><div class="fc-n">${big(n(tom), "kWh")}</div></div></div>
        ${best ? `<p class="row-sub" style="margin-top:10px">Best hours for the jacuzzi heater, washing machine or extra air con: <b style="color:var(--sand)">${best}</b></p>` : ""}
      </article>
      <article class="card" style="--tint:var(--turq)"><div class="card-head"><span class="ico">${icon("battery")}</span><div class="grow"><h3>Solar savings</h3><div class="row-sub">This month so far</div></div></div>
        <div class="fc-row"><div><div class="row-sub">Saved</div><div class="fc-n">${n(sav) === null ? "—" : `€${Math.round(n(sav))}`}</div></div>
          <div><div class="row-sub">Solar made</div><div class="fc-n">${big(n(month), "kWh")}</div></div></div>
        <p class="row-sub" style="margin-top:10px">Worked out at €0.164 per kWh: Octopus Energy “Relax” (€0.129) with electricity tax and 21% VAT.</p>
      </article></div>`;
  }
  function routineRow() {
    const h = st("switch.finca_holiday_mode"); const hol = h && h.state === "on";
    return `<div class="routine-row">
      <button class="btn" data-askgo="Good morning Jarvis">${icon("sun")}Morning</button>
      <button class="btn" data-askgo="Goodnight Jarvis">${icon("moon")}Goodnight</button>
      ${(() => { const mv = st("switch.finca_movie_mode"); if (!mv && store.mode !== "demo") return ""; const on = mv && mv.state === "on";
        return `<button class="btn ${on ? "btn-primary" : ""}" ${mv ? `data-toggle="${mv.entity_id}"` : ""} aria-pressed="${!!on}">${icon("film")}${on ? "Movie on" : "Movie"}</button>`; })()}
      ${h || store.mode === "demo" ? `<button class="btn ${hol ? "btn-primary" : ""}" ${h ? `data-toggle="${h.entity_id}"` : ""} aria-pressed="${hol}">${icon("plane")}${hol ? "Holiday on" : "Holiday"}</button>` : ""}
    </div>`;
  }
  // Jarvis start-up greeting (14 Nov): once per app session, ~2 s, tap to skip. Reads live values; nothing invented.
  function jarvisBoot() {
    try { if (sessionStorage.getItem("finca.booted")) return; sessionStorage.setItem("finca.booted", "1"); } catch { /* private mode: show anyway */ }
    const h = new Date().getHours(), part = h < 5 ? "evening" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
    const e = energy(), t = st("sensor.hue_motion_sensor_3_temperature"), a = all("alarm_control_panel")[0];
    const bits = [e.soc !== null ? `Battery ${Math.round(e.soc)}%` : "", t && ok(t) && !isNaN(+t.state) ? `${Math.round(+t.state)}°C inside` : "",
      a && ok(a) ? `Alarm ${a.state === "disarmed" ? "off" : "set"}` : ""].filter(Boolean);
    const lines = ["All systems online.", "Systems nominal. The house behaved itself.", "Online and at your service.", "Diagnostics complete. Nothing is on fire."];
    const el = document.createElement("div"); el.className = "jboot"; el.setAttribute("role", "status");
    el.innerHTML = `<div class="jboot-ring"><span></span><span></span><span></span><b>JARVIS</b></div>
      <p class="jboot-hi">Good ${part}, sir.</p><p class="jboot-sub">${lines[Math.floor(Math.random() * lines.length)]}</p>
      ${bits.length ? `<p class="jboot-st">${bits.map(esc).join(" · ")}</p>` : ""}`;
    const close = () => { el.classList.add("out"); setTimeout(() => el.remove(), 450); };
    el.addEventListener("click", close); document.body.appendChild(el); setTimeout(close, 2300);
  }
  // HUD ring gauges (15 Nov, Stark-style touch): solar, battery, home use. Live readings only; "—" when unknown.
  function ring(label, val, max, unit, tint, sub) {
    const pct = val === null || isNaN(val) ? 0 : Math.max(0, Math.min(1, val / max)), R = 34, C = 2 * Math.PI * R;
    return `<div class="gauge" style="--tint:var(--${tint})"><svg viewBox="0 0 88 88" aria-hidden="true">
        <circle cx="44" cy="44" r="41" class="g-ticks"/><circle cx="44" cy="44" r="${R}" class="g-track"/>
        <circle cx="44" cy="44" r="${R}" class="g-val" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 44 44)"/></svg>
      <div class="g-txt"><b>${val === null || isNaN(val) ? "—" : unit === "%" ? Math.round(val) : val.toFixed(1)}<small>${unit}</small></b><span>${label}</span></div>
      ${sub ? `<em>${sub}</em>` : ""}</div>`;
  }
  function hudGauges(e) {
    const kwOf = w => w === null ? null : w / 1000;
    return `<div class="hud-gauges">
      ${ring("Solar", kwOf(e.pv), 17, "kW", "sunset", "")}
      ${ring("Battery", e.soc, 100, "%", "turq", e.batt === null ? "" : e.batt > 30 ? "charging" : e.batt < -30 ? "discharging" : "idle")}
      ${ring("Home", kwOf(e.home), 8, "kW", "coral", "")}
    </div>`;
  }
  function viewHome() {
    const e = energy();
    const lights = realLights(), lightsOn = lights.filter(s => s.state === "on").length;
    const off = watched().filter(s => !ok(s));
    const weather = all("weather")[0];
    const sunS = st("sun.sun");
    const sunset = sunS && sunS.attributes.next_setting ? new Date(sunS.attributes.next_setting).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : null;
    const alarm = all("alarm_control_panel")[0];
    const cams = cameraList();
    // Only the real speakers (Sonos), not their copies in Music Assistant, Alexa or the Spotify link.
    const playing = all("media_player").filter(s => s.state === "playing" && (store.mode === "demo" || platformOf(s.entity_id) === "sonos"));
    const playName = s => s.entity_id === "media_player.tv_room_tv_room" ? (s.attributes.source === "TV" ? "Living room (TV sound)" : "Living room") : nm(s);
    const climates = all("climate").filter(ok);
    const date = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const wTemp = weather && ok(weather) && weather.attributes.temperature !== undefined ? `${Math.round(weather.attributes.temperature)}°` : "";
    return `<section class="view">
      <div class="card hero">
        <div class="hero-top">
          <div><p class="greet">${greeting()}</p><p class="hero-sub">${date} · Finca Ottero</p></div>
          ${wTemp || sunset ? `<button class="weather wx-btn" data-action="weather" aria-label="Open the 5-day weather forecast">
            <span class="wx-now">${weather ? `<span class="wx-emoji" aria-hidden="true">${WX_ICON[weather.state] || ""}</span>` : ""}${wTemp ? `<b>${wTemp}</b>` : ""}</span>
            <span class="wx-sub">${weather ? esc(String(weather.state).replace(/-/g, " ").replace("partlycloudy", "partly cloudy")) : ""}${weather && weather.attributes.wind_speed !== undefined ? ` · ${Math.round(weather.attributes.wind_speed)} km/h` : ""}${sunset ? ` · sunset ${sunset}` : ""}</span>
            <span class="wx-more">5-day forecast ›</span></button>` : ""}
        </div>
        ${hudGauges(e)}
        <div class="status-row">
          <span class="chip"><span class="dot ${store.online ? "" : "warn"}"></span>${icon("wifi")}${store.mode === "demo" ? "Demo data" : store.online ? "Home Assistant" : "Reconnecting…"}</span>
          ${e.grid === null ? "" : `<span class="chip">${icon("grid")}<span class="v">${kw(e.grid)} kW</span><span style="color:var(--muted)">${e.grid > 30 ? "from grid" : e.grid < -30 ? "to grid" : "grid idle"}</span></span>`}
          <span class="chip" title="${esc(off.map(nm).join(", ") || "Everything is reachable")}"><span class="dot ${off.length ? "warn" : ""}"></span>${off.length ? `<span class="v">${off.length}</span> offline` : "All devices online"}</span>
        </div>
      </div>

      ${routineRow()}
      ${quickCard()}

      <div class="tiles">
        ${tile({ id: "lighting", title: "Lighting", ic: "bulb", tint: "sunset", href: "#lighting", on: lightsOn > 0, state: lights.length ? `<strong>${lightsOn} of ${lights.length}</strong> lights on` : '<span class="unavail">No lights found</span>' })}
        ${tile({ id: "media", title: "Music", ic: "music", tint: "coral", href: "#media", on: playing.length > 0, state: playing.length ? `<strong>Playing</strong> · ${esc(playName(playing[0]))}${playing.length > 1 ? ` +${playing.length - 1}` : ""}` : `${all("media_player").filter(s => store.mode === "demo" || platformOf(s.entity_id) === "sonos").length} speakers` })}
        ${tile({ id: "security", title: "Security", ic: "shield", tint: "turq", href: "#security", state: alarm ? `Alarm <strong>${esc(alarmLabel(alarm))}</strong> · ${cams.length} cameras` : `${cams.length} cameras` })}
        ${tile({ id: "climate", title: "Climate", ic: "snow", tint: "turq", href: "#climate", on: climates.some(s => s.state !== "off"), state: climates.length ? `<strong>${climates.filter(s => s.state !== "off").length}</strong> running` : `${C.alexaAC.length} units via Alexa` })}
        ${(() => { const g = find("gate"); return tile({ id: "gate", title: "Main Gate", ic: "gate", tint: "coral", href: "#gates", state: g ? (ok(g) ? "Position not reported" : "Offline") : '<span class="unavail">Not found in Home Assistant</span>', ctl: g && ok(g) ? '<button class="btn btn-sm btn-primary" data-action="gate">Open</button>' : "" }); })()}
        ${tile({ id: "energy", title: "Solar & Power", ic: "sun", tint: "sunset", href: "#energy", on: (e.pv || 0) > 50, state: e.pv === null && e.soc === null ? '<span class="unavail">Waiting for Victron readings</span>' : `<strong>${e.pv === null ? "—" : kw(e.pv) + " kW"}</strong> solar · battery ${e.soc === null ? "—" : Math.round(e.soc) + "%"}` })}
        ${switchTile("poolHouse", "poolhouse", "sunset", "#pool")}
        ${switchTile("jacuzzi", "jacuzzi", "coral", "#pool", "Heating")}
        ${switchTile("pump", "pump", "turq", "#pool", "Running")}
        ${switchTile("poolLights", "poollight", "turq", "#pool")}
        ${switchTile("fire", "fire", "sunset", "#lighting")}
        ${(() => { const p = st("switch.finca_party_mode"); const on = p && p.state === "on";
          return p || store.mode === "demo" ? tile({ id: "party", title: "Party", ic: "party", tint: "coral", href: "#media", on, state: on ? "<strong>Party on</strong> · lights & music" : "Disco lights and music", ctl: p ? sw(p.entity_id, on, "Party mode", "coral") : "" })
            : tile({ id: "jarvis", title: "Jarvis", ic: "mic", tint: "turq", href: "#jarvis", state: "Ask about the house" }); })()}
        ${(() => { const r = st("switch.finca_romantic_mode"); if (!r && store.mode !== "demo") return ""; const on = r && r.state === "on";
          return tile({ id: "romance", title: "Romantic", ic: "heart", tint: "coral", href: "#media", on, state: on ? "<strong>Mood set</strong> · soft lights & Marvin Gaye" : "Soft lights and Marvin Gaye", ctl: r ? sw(r.entity_id, on, "Romantic mode", "coral") : "" }); })()}
      </div>
    </section>`;
  }
  const alarmLabel = s => (ok(s) ? s.state.replace(/_/g, " ") : "offline");

  // Lighting: lights grouped by Home Assistant area; Hue room entities act as each area's master control.
  const isGroup = s => s.attributes.is_hue_group === true || Array.isArray(s.attributes.entity_id);
  const realLights = () => all("light").filter(s => !isGroup(s));
  const dimmable = s => (s.attributes.supported_color_modes || []).some(m => m !== "onoff");
  const hasColour = s => (s.attributes.supported_color_modes || []).some(m => ["hs", "xy", "rgb", "rgbw", "rgbww"].includes(m));
  const hasWhiteTemp = s => (s.attributes.supported_color_modes || []).includes("color_temp");
  function lightAreas() {
    const buckets = new Map();
    const add = (name, s) => { if (!buckets.has(name)) buckets.set(name, { name, group: null, lights: [] }); return buckets.get(name); };
    all("light").forEach(s => {
      const area = areaOf(s.entity_id) || (isGroup(s) ? nm(s) : "") || "Other lights";
      const b = add(area, s);
      if (isGroup(s) && !b.group) b.group = s; else if (!isGroup(s)) b.lights.push(s);
    });
    const out = [...buckets.values()].filter(b => b.lights.length || b.group).sort((a, b) => roomCmp(a.name, b.name));
    out.forEach(b => b.lights.sort((x, y) => natCmp(nm(x), nm(y))));   // Bar 1, Bar 2 … Bar 5, then Side 1, Side 2
    return out;
  }
  function areaCard(b) {
    const members = b.lights.length ? b.lights : (b.group ? [b.group] : []);
    const onCount = members.filter(s => s.state === "on").length;
    const anyOn = onCount > 0 || (b.group && b.group.state === "on");
    const master = b.group || members.find(s => s.state === "on" && dimmable(s)) || members.find(dimmable);
    const bri = master && master.attributes.brightness ? Math.round(master.attributes.brightness / 2.55) : 0;
    const ids = (b.group ? [b.group] : members).map(s => s.entity_id).join(",");
    return `<article class="card group ${anyOn ? "is-on" : ""}">
      <div class="card-head">
        <span class="ico" style="--tint:var(--sunset)">${icon("bulb")}</span>
        <div class="grow"><h3>${esc(b.name)}</h3><div class="row-sub">${members.length} light${members.length === 1 ? "" : "s"} · ${onCount} on</div></div>
        ${[b.group, ...members].some(x => x && (hasColour(x) || hasWhiteTemp(x))) ? `<button class="round-btn colour-btn" data-colour="${esc(b.name)}" aria-label="${esc(b.name)} colour"><span class="swatch" style="background:${swatchOf(b.group || members.find(x => x.state === "on") || members[0])}"></span></button>` : ""}
        <button class="switch" role="switch" aria-checked="${anyOn}" aria-label="${esc(b.name)} lights" data-area="${esc(ids)}" data-room="${esc(b.name)}" style="--tint:var(--sunset)"></button>
      </div>
      ${master && dimmable(master) ? `<div class="bri">
        <input type="range" id="bri-${esc(b.name.replace(/\W/g, ""))}" min="1" max="100" value="${bri || 50}" style="--val:${bri || 50}%" data-bri="${esc(ids)}" aria-label="${esc(b.name)} brightness" ${anyOn ? "" : "disabled"}>
        <span class="v">${anyOn ? bri + "%" : "Off"}</span></div>` : ""}
      ${b.lights.length > 1 || b.group ? `<div class="bulbs">${b.lights.map(s => `<button class="bulb ${s.state === "on" ? "on" : ""} ${ok(s) ? "" : "na"}" data-toggle="${s.entity_id}" ${ok(s) ? "" : "disabled"} aria-pressed="${s.state === "on"}"><i></i>${esc(nm(s).replace(new RegExp("^" + b.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*", "i"), "") || nm(s))}</button>`).join("")}</div>` : ""}
    </article>`;
  }
  function swatchOf(s) {
    if (!s || s.state !== "on") return "conic-gradient(#ff5c5c, #ffd25c, #5cff8a, #5ce1ff, #8a5cff, #ff5cc8, #ff5c5c)";
    const c = s.attributes.rgb_color;
    return c ? `rgb(${c.join(",")})` : "#ffd9a0";
  }
  function colourSheet(areaName) {
    const b = lightAreas().find(x => x.name === areaName); if (!b) return;
    const lights = b.lights.filter(x => ok(x) && (hasColour(x) || hasWhiteTemp(x)));
    const all = (b.group ? [b.group] : lights);
    const anyColour = [...all, ...lights].some(hasColour), anyTemp = [...all, ...lights].some(hasWhiteTemp);
    const ref = b.group || lights[0];
    const kMin = Math.max(2000, ...[...all, ...lights].map(x => x.attributes.min_color_temp_kelvin || 2000));
    const kMax = Math.min(6500, ...[...all, ...lights].map(x => x.attributes.max_color_temp_kelvin || 6500));
    const kNow = (ref && ref.attributes.color_temp_kelvin) || Math.round((kMin + kMax) / 2);
    sheet(`<h2>${esc(areaName)} colour</h2>
      <label class="row-sub" for="ctarget">Apply to</label>
      <select class="sel" id="ctarget"><option value="${esc(all.map(x => x.entity_id).join(","))}">Whole room</option>
        ${lights.map(x => `<option value="${x.entity_id}">${esc(nm(x))}</option>`).join("")}</select>
      ${anyColour ? '<div class="wheel" id="wheel" role="slider" aria-label="Colour wheel" tabindex="0"><span class="wheel-dot" id="wheel-dot"></span></div>' : ""}
      ${anyTemp ? `<label class="row-sub" for="ctemp">White: warm to cool</label><input type="range" id="ctemp" class="temp-range" min="${kMin}" max="${kMax}" step="50" value="${kNow}">` : ""}
      <div class="acts" style="grid-template-columns:1fr"><button class="btn" data-action="close">Done</button></div>`);
    const wheel = $("#wheel");
    if (wheel) {
      const hs = ref && ref.attributes.hs_color;
      const place = (h, sat) => { const r = wheel.clientWidth / 2, a = h * Math.PI / 180; const d = $("#wheel-dot"); d.style.left = `${r + Math.sin(a) * sat * r}px`; d.style.top = `${r - Math.cos(a) * sat * r}px`; d.style.background = `hsl(${h} ${sat * 100}% ${100 - sat * 50}%)`; };
      if (hs) place(hs[0], hs[1] / 100); else place(0, 0);
      const pick = (ev, send) => {
        const box = wheel.getBoundingClientRect(), r = box.width / 2;
        const dx = ev.clientX - box.left - r, dy = ev.clientY - box.top - r;
        const h = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360, sat = Math.min(1, Math.hypot(dx, dy) / r);
        place(h, sat);
        if (send) svc("light", "turn_on", { hs_color: [Math.round(h), Math.round(sat * 100)] }, { entity_id: $("#ctarget").value.split(",") });
      };
      let down = false;
      wheel.addEventListener("pointerdown", ev => { down = true; wheel.setPointerCapture(ev.pointerId); pick(ev, false); });
      wheel.addEventListener("pointermove", ev => { if (down) pick(ev, false); });
      wheel.addEventListener("pointerup", ev => { if (down) { down = false; pick(ev, true); } });
    }
    const t = $("#ctemp");
    if (t) t.addEventListener("change", () => svc("light", "turn_on", { color_temp_kelvin: +t.value }, { entity_id: $("#ctarget").value.split(",") }));
  }

  function viewLighting() {
    const areas = lightAreas();
    // Sonoff light switches (15 Nov): only the real switches — the remembered-state bedroom/ensuite switches (not the raw pulse
    // relays) and the fire. Sonoff settings (Network Indicator, Inching Enable) and other config switches are hidden.
    const extra = Object.values(store.states).filter(s => domainOf(s.entity_id) === "switch" && !isHidden(s)
      && !/^switch\.(1000f13fd7_power|1000f1247e_power|finca_)/.test(s.entity_id) && !/_network_led$|_inching|_inchingenable/.test(s.entity_id)
      && !((store.ents[s.entity_id] || {}).entity_category)
      && (s.entity_id === "switch.ensuite_lights" || C.lightingSwitches.some(r => r.test(nm(s)))));
    const swName = s => s.entity_id === "switch.ensuite_lights" ? "Ensuite lights" : nm(s).replace(/\s+/g, " ").replace(/^(.+?) \1$/i, "$1").trim();
    const swArea = s => s.entity_id === "switch.ensuite_lights" ? "Master bedroom" : (areaOf(s.entity_id) || "");
    // Hue motion sensors only (Ring ones live on Security). Hue also makes a "room" copy of each sensor (Living room Motion,
    // Bar Motion…): those duplicates are left out.
    const hueRoom = s => { const e = store.ents[s.entity_id], d = e && store.devices[e.device_id]; return (d && d.model === "Room") || /^binary_sensor\.(\w+)_\1_motion$/.test(s.entity_id); };
    const sensors = all("binary_sensor").filter(s => ["motion", "occupancy"].includes(s.attributes.device_class)
      && (store.mode === "demo" ? /hue|motion/i.test(nm(s)) : platformOf(s.entity_id) === "hue") && !hueRoom(s));
    const sensorName = s => nm(s).replace(/\s+motion$/i, "").replace(/^living room temperature\s*$/i, "Living room sensor").trim();
    const lightsOn = realLights().filter(s => s.state === "on").length;
    return `<section class="view">
      <div class="page-head">
        <div><h1>Lighting</h1><p>${areas.length} rooms · ${lightsOn} lights on</p></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${(() => { const pl = st("switch.finca_party_lights"); if (!pl) return ""; const on = pl.state === "on";
            return `<button class="btn ${on ? "" : "btn-primary"}" data-toggle="${pl.entity_id}">${icon("party")}${on ? "Stop party lights" : "Party lights"}</button>`; })()}
          <button class="btn" data-action="all-off" ${lightsOn ? "" : "disabled"}>${icon("moon")}All lights off</button>
        </div>
      </div>
      ${(st("switch.finca_party_lights") || {}).state === "on" ? `<p class="note">${icon("music")}<span>Party lights are on. Pick your own music on the <a href="#media">Music</a> page.</span></p>` : ""}
      ${areas.length ? `<div class="grid g-2">${areas.map(areaCard).join("")}</div>` : '<p class="empty">No lights found in Home Assistant yet. Add the Philips Hue integration in Settings → Devices &amp; services.</p>'}
      ${extra.length ? `<h2 class="section">Wall switches (Sonoff)</h2><div class="card">
        ${extra.map(s => `<div class="row"><span class="ico" style="--tint:var(--sunset)">${icon(/fire/i.test(nm(s)) ? "fire" : "bulb")}</span>
          <div class="row-body"><div class="row-title">${esc(swName(s))}</div><div class="row-sub">${ok(s) ? (s.state === "on" ? "On" : "Off") : "Offline"}${swArea(s) ? " · " + esc(swArea(s)) : ""}</div></div>
          ${ok(s) ? sw(s.entity_id, s.state === "on", swName(s), "sunset") : '<span class="pill warn">Offline</span>'}</div>`).join("")}
      </div>` : ""}
      ${sensors.length ? `<h2 class="section">Hue motion sensors</h2><div class="grid g-2">
        ${sensors.map(s => `<div class="card"><div class="row" style="padding:0"><span class="ico">${icon("sensor")}</span>
          <div class="row-body"><div class="row-title">${esc(sensorName(s))}</div><div class="row-sub">${ok(s) ? (s.state === "on" ? "Motion now" : "Last motion " + ago(s.last_changed)) : "Offline"}${areaOf(s.entity_id) ? " · " + esc(areaOf(s.entity_id)) : ""}</div></div></div></div>`).join("")}
      </div>` : ""}
    </section>`;
  }

  // Climate: native Home Assistant thermostats, plus the two Alexa-controlled units (commands only).
  function climateCard(s) {
    const a = s.attributes;
    if (!ok(s)) return `<article class="card"><div class="card-head"><span class="ico">${icon("snow")}</span><div class="grow"><h3>${esc(nm(s))}</h3><div class="row-sub">Offline</div></div><span class="pill warn">Offline</span></div></article>`;
    const step = a.target_temp_step || 0.5;
    const target = a.temperature;
    return `<article class="card">
      <div class="card-head">
        <span class="ico">${icon(s.state === "heat" ? "heater" : "snow")}</span>
        <div class="grow"><h3>${esc(nm(s))}</h3><div class="row-sub">${esc((a.hvac_action || s.state).replace(/_/g, " "))}${a.current_temperature !== undefined ? ` · room ${a.current_temperature}°C` : ""}</div></div>
        ${sw(s.entity_id, s.state !== "off", nm(s))}
      </div>
      ${target !== undefined && target !== null ? `<div class="stepper">
        <button data-temp="${s.entity_id}" data-delta="${-step}" aria-label="Lower">−</button>
        <span class="temp">${target}<small>°C</small></span>
        <button data-temp="${s.entity_id}" data-delta="${step}" aria-label="Raise">+</button></div>` : ""}
      ${(a.hvac_modes || []).length ? `<div class="seg-row">${a.hvac_modes.map(m => `<button class="seg-btn" aria-pressed="${s.state === m}" data-hvac="${s.entity_id}" data-mode="${m}">${esc(m.replace(/_/g, " "))}</button>`).join("")}</div>` : ""}
      ${(a.fan_modes || []).length ? `<div class="seg-row">${icon("fan").replace("<svg", '<svg style="width:20px;height:20px;align-self:center;color:var(--muted)"')}${a.fan_modes.map(m => `<button class="seg-btn" aria-pressed="${a.fan_mode === m}" data-fan="${s.entity_id}" data-mode="${m}">${esc(m)}</button>`).join("")}</div>` : ""}
    </article>`;
  }
  function acPower(u) { return u.power ? num(u.power) : null; }
  function alexaCard(u) {
    const t = mem.get("ac." + u.id + ".t", 22), last = mem.get("ac." + u.id + ".last", null);
    const w = acPower(u), pk = AC_PEAK[u.id] ? num(AC_PEAK[u.id]) : null;
    const running = (w !== null && w >= 300) || (pk !== null && pk >= 300);
    const auto = st((C.climateAuto || {}).flags ? C.climateAuto.flags[u.id] : "");
    return `<article class="card ${running ? "is-on" : ""}" style="--tint:var(--sunset)">
      <div class="card-head">
        <span class="ico" style="${running ? "--tint:var(--sunset)" : ""}">${icon(running ? "heater" : "snow")}</span>
        <div class="grow"><h3>${esc(u.name)}</h3><div class="row-sub">${w === null ? "Air con via Alexa" : running ? (w >= 300 ? `Running · ${kw(w)} kW` : `Running · holding temperature`) : `Off or idle · ${Math.round(w)} W`}${auto && auto.state === "on" ? " · started automatically" : ""}</div></div>
        ${u.temp && num(u.temp) !== null ? `<span class="temp" style="font-size:28px" title="${u.id === "master" ? "Estimated from the hallway − 2 °C" : "Room temperature"}">${u.id === "master" ? "≈" : ""}${num(u.temp).toFixed(1)}<small>°C</small></span>` : ""}
        <span class="pill ${running ? "hot" : ""}">${running ? "Running" : "Off"}</span>
      </div>
      <div class="seg-row" style="margin-top:0">
        <button class="seg-btn" data-acquick="${u.id}" data-mode="heat" style="color:var(--sunset)">${icon("heater").replace("<svg", '<svg style="width:18px;height:18px;vertical-align:-3px"')} Heat 23°</button>
        <button class="seg-btn" data-acquick="${u.id}" data-mode="cool" style="color:var(--turq)">${icon("snow").replace("<svg", '<svg style="width:18px;height:18px;vertical-align:-3px"')} Cool 23°</button>
      </div>
      <div class="seg-row" style="margin-top:0"><button class="seg-btn" data-ac="${u.id}" data-cmd="on">${icon("power").replace("<svg", '<svg style="width:18px;height:18px;vertical-align:-3px"')} On</button><button class="seg-btn" data-ac="${u.id}" data-cmd="off">Off</button></div>
      <div class="stepper">
        <button data-acstep="${u.id}" data-delta="-1" aria-label="Lower">−</button>
        <span class="temp">${t}<small>°C</small></span>
        <button data-acstep="${u.id}" data-delta="1" aria-label="Raise">+</button>
        <button class="btn btn-sm" style="width:auto;height:auto" data-ac="${u.id}" data-cmd="temp" data-val="${t}">Set</button>
      </div>
      <div class="seg-row">${["cool", "heat", "auto"].map(m => `<button class="seg-btn" data-ac="${u.id}" data-cmd="mode" data-val="${m}">${m}</button>`).join("")}</div>
      <div class="seg-row">${["low", "medium", "high", "auto"].map(m => `<button class="seg-btn" data-ac="${u.id}" data-cmd="fan" data-val="${m}">Fan ${m}</button>`).join("")}</div>
      <details class="how"><summary>${last ? "Last command and how it works" : "How it works"}</summary><p class="note">${icon("alexa")}<span>${last ? `Last sent ${ago(last.at)}: “${esc(last.phrase)}”. ` : ""}Commands go through Alexa; Home Assistant confirms each one from the unit's power use and retries through another speaker if needed.</span></p></details>
    </article>`;
  }
  function autoCard() {
    const A = C.climateAuto || {}; const a = st(A.automation); if (!a && store.mode !== "demo") return "";
    const on = a ? a.state === "on" : false, avail = st(A.powerAvailable), mode = st(A.mode);
    return `<article class="card ${on ? "is-on" : ""}" style="--tint:var(--turq)">
      <div class="card-head" style="margin-bottom:6px">
        <span class="ico">${icon("sun")}</span>
        <div class="grow"><h3>Air con on spare power</h3><div class="row-sub">${on ? "On" : "Off"} · spare power ${avail && avail.state === "on" ? "available now" : "not available now"}${C.alexaAC.filter(u => u.temp && num(u.temp) !== null).map(u => ` · ${esc(u.name.toLowerCase())} ${num(u.temp).toFixed(1)} °C`).join("")}</div></div>
        ${a ? sw(a.entity_id, on, "Air con on spare power") : ""}
      </div>
      <details class="how"><summary>How it works</summary><p class="note">${icon("info")}<span>With spare power (battery over 50 % or solar 2.5 kW), a room at 21 °C or below is heated to 23 °C and a room at 25 °C or above is cooled to 23 °C; the unit switches off at 23 °C or when spare power runs out. Living room uses its own thermometer; the master bedroom is estimated as hallway − 2 °C, with a 90-minute limit per session. Automatic sessions run in set times: the living room from 17:00 (last start 22:00, always off by 22:25); the master bedroom 07:00–09:30 and 17:30–22:30 (last start 30 minutes before each end). Outside those times the air con is only switched on and off by you (app or Jarvis). Units you start yourself are never switched off by it, and a unit you switch off yourself is left off for 90 minutes.</span></p></details>
    </article>`;
  }
  function viewClimate() {
    const climates = all("climate");
    const acReady = !!st("script.finca_ac_command") || store.mode === "demo";
    return `<section class="view">
      <div class="page-head"><div><h1>Climate</h1><p>Air conditioning · temperatures in °C</p></div></div>
      ${climates.length ? `<div class="grid g-2">${climates.map(climateCard).join("")}</div>` : ""}
      <h2 class="section">Air con units</h2>
      ${acReady ? `<div class="grid g-2">${C.alexaAC.map(alexaCard).join("")}</div>`
        : '<p class="empty">The living room and master bedroom units need the Alexa Media Player integration and the Finca package installed in Home Assistant. See the setup guide.</p>'}
      <h2 class="section">Automatic</h2>
      ${autoCard()}
      <p class="note">${icon("lock")}<span>The guest bedroom unit is deliberately left out so guests can control it themselves.</span></p>
    </section>`;
  }

  const camName = s => nm(s).replace(/\s+live view$/i, "");
  // Ring-MQTT (13 Nov) adds camera.<name>_snapshot next to Ring's camera.<name>_live_view: one card per camera,
  // picture from the snapshot (refreshed on every motion/ding), live stream and clips from the live view.
  const snapFor = s => st(s.entity_id.replace(/_live_view$/, "_snapshot"));
  const cameraList = () => all("camera").filter(c => !(/_snapshot$/.test(c.entity_id) && st(c.entity_id.replace(/_snapshot$/, "_live_view"))));
  function camCard(s) {
    const snap = /_live_view$/.test(s.entity_id) ? snapFor(s) : null;
    const img = snap && ok(snap) && snap.attributes.entity_picture ? snap : s;
    const pic = img.attributes.entity_picture;
    const updated = img.last_changed;
    return `<article class="card">
      <div class="cam-view">${pic && ok(img) ? `<img data-cam="${img.entity_id}" alt="Latest image from ${esc(nm(s))}">` : `<div class="ph">${icon("camera")}<span>${ok(s) ? "No snapshot yet" : "Camera offline"}</span></div>`}
        <span class="pill tag">${ok(s) ? "Snapshot" : "Offline"}</span></div>
      <div class="cam-meta"><div><b>${esc(camName(s))}</b><div class="row-sub">${updated ? "Updated " + ago(updated) : ""}</div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
          ${s.attributes.video_url ? `<button class="btn btn-sm btn-ghost" data-clip="${s.entity_id}">Last recording</button>` : ""}
          ${ok(s) ? `<button class="btn btn-sm" data-live="${s.entity_id}">Live view</button>` : ""}</div></div>
    </article>`;
  }
  function intruderCard() {
    const a = st("automation.finca_security_intruder_warning"), sc = st("script.finca_intruder_warning");
    if (!a && store.mode !== "demo") return "";
    const on = a ? a.state === "on" : true, alarms = all("alarm_control_panel");
    return `<article class="card ${on ? "is-on" : ""}" style="--tint:var(--coral)">
      <div class="card-head">
        <span class="ico" style="--tint:var(--coral)">${icon("siren")}</span>
        <div class="grow"><h3>Intruder warning</h3><div class="row-sub">${on ? "On" : "Off"} · ${alarms.length ? `watching ${alarms.length} alarm${alarms.length > 1 ? "s" : ""}` : "waiting for the Ring Alarm to be connected"}${sc && sc.state === "on" ? " · playing now" : ""}</div></div>
        ${a ? sw(a.entity_id, on, "Intruder warning") : ""}
      </div>
      <details class="how"><summary>How it works</summary><p class="note" style="margin-bottom:12px">${icon("music")}<span>If the alarm goes off, every Sonos speaker says at full volume, over and over until the alarm is turned off: <b>“¡Atención! Intruso detectado. La policía ha sido avisada.”</b> White lights go off and every colour light turns bright red. Afterwards the speakers and lights go back to how they were. Safety limit 15 minutes; say “Jarvis, stop the alarm warning” to stop it sooner.</span></p></details>
      ${(st("switch.finca_intruder_warning_active") || {}).state === "on" ? '<button class="btn btn-sm btn-primary" data-action="intruder-stop">Stop the warning</button>' : '<button class="btn btn-sm" data-action="intruder-test">Test quietly</button>'}
    </article>`;
  }
  function viewSecurity() {
    // owner, 13 Nov: cameras first; recent activity as a compact horizontal strip; door/window/motion sensors
    // (Ring Alarm via Ring-MQTT) shown when they exist.
    const alarms = all("alarm_control_panel"), cams = cameraList();
    const SENSOR_CLASSES = ["motion", "occupancy", "door", "window", "opening", "garage_door"];
    const sensors = Object.values(store.states).filter(s => !isHidden(s) && domainOf(s.entity_id) === "binary_sensor" && SENSOR_CLASSES.includes(s.attributes.device_class)
      && !/hue_motion|_light_sensor|_motion_sensor_enabled/.test(s.entity_id) && platformOf(s.entity_id) !== "hue");
    const activity = Object.values(store.states)
      .filter(s => !isHidden(s) && ok(s) && (domainOf(s.entity_id) === "event" || sensors.includes(s)))
      .filter(s => domainOf(s.entity_id) !== "event" || /ring|doorbell|ding|motion/i.test(platformOf(s.entity_id) + nm(s)))
      .filter(s => s.last_changed && !/^(unknown|unavailable)$/.test(s.state))
      .sort((a, b) => new Date(b.last_changed) - new Date(a.last_changed)).slice(0, 12);
    const evLabel = s => domainOf(s.entity_id) === "event" ? nm(s).replace(/\s+(ding|motion)$/i, m => " · " + m.trim().toLowerCase())
      : `${nm(s)} · ${["door", "window", "opening", "garage_door"].includes(s.attributes.device_class) ? (s.state === "on" ? "opened" : "closed") : (s.state === "on" ? "motion" : "clear")}`;
    const doors = sensors.filter(s => ["door", "window", "opening", "garage_door"].includes(s.attributes.device_class));
    const motions = sensors.filter(s => ["motion", "occupancy"].includes(s.attributes.device_class) && !/_ding$/.test(s.entity_id));   // doorbell presses show in Recent activity, not as motion sensors
    const sensorRow = s => { const open = s.state === "on", isDoor = doors.includes(s);
      return `<div class="row"><div class="row-body"><div class="row-title">${esc(nm(s))}</div><div class="row-sub">${ok(s) ? (isDoor ? (open ? "Open" : "Closed") : (open ? "Motion now" : "Clear")) + " · " + ago(s.last_changed) : "Offline"}${areaOf(s.entity_id) ? " · " + esc(areaOf(s.entity_id)) : ""}</div></div>
        <span class="pill ${open ? "warn" : "ok"}">${ok(s) ? (isDoor ? (open ? "Open" : "Closed") : (open ? "Motion" : "Clear")) : "Offline"}</span></div>`; };
    return `<section class="view">
      <div class="page-head"><div><h1>Security</h1><p>Ring cameras, doorbells and alarm</p></div></div>
      ${cams.length ? `<div class="grid g-2">${cams.map(camCard).join("")}</div>` : '<p class="empty">No cameras found yet.</p>'}
      ${activity.length ? `<h2 class="section">Recent activity</h2><div class="act-strip">${activity.map(s => `<span class="act-chip ${Date.now() - new Date(s.last_changed) < 15 * 60000 ? "fresh" : ""}"><b>${esc(evLabel(s))}</b><small>${ago(s.last_changed)}</small></span>`).join("")}</div>` : ""}
      ${alarms.length || doors.length || motions.length ? `<h2 class="section">Alarm and sensors</h2><div class="grid g-2">
        ${alarms.map(a => `<article class="card"><div class="card-head">
            <span class="ico" style="width:58px;height:58px">${icon("shield")}</span>
            <div class="grow"><h3>${esc(nm(a))}</h3><div class="row-sub">Status only · changed ${ago(a.last_changed)}</div></div>
            <span class="pill ${a.state === "disarmed" ? "ok" : "warn"}">${esc(alarmLabel(a))}</span></div>
          <p class="note">${icon("lock")}<span>Arm and disarm with the Ring app or keypad. This app never changes the alarm.</span></p></article>`).join("")}
        ${doors.length ? `<article class="card"><div class="card-head"><span class="ico">${icon("lock")}</span><div class="grow"><h3>Doors and windows</h3><div class="row-sub">${doors.filter(s => s.state === "on").length} open</div></div></div>${doors.map(sensorRow).join("")}</article>` : ""}
        ${motions.length ? `<article class="card"><div class="card-head"><span class="ico">${icon("sensor")}</span><div class="grow"><h3>Motion sensors</h3></div></div>${motions.map(sensorRow).join("")}</article>` : ""}
      </div>` : ""}
      ${intruderCard()}
      <details class="how"><summary>How it works</summary><p class="note">${icon("info")}<span>Snapshots show each camera's latest event; Live view streams now; Last recording plays the newest Ring Protect clip. The bedroom Echo Show camera can't be shown here; Amazon offers no way to share it.</span></p></details>
    </section>`;
  }

  function viewGates() {
    const g = find("gate"), cam = find("gateCamera");
    return `<section class="view">
      <div class="page-head"><div><h1>Gates</h1><p>Main gate</p></div></div>
      <div class="grid g-2">
        <article class="card">
          <div class="card-head"><span class="ico" style="--tint:var(--coral);width:58px;height:58px">${icon("gate")}</span>
            <div class="grow"><h3>Main Gate</h3><div class="row-sub">${g ? (ok(g) ? "Sends one open pulse" : "Offline") : "Not found in Home Assistant"}</div></div></div>
          <button class="btn btn-primary" style="width:100%;min-height:58px;font-size:17px" data-action="gate" ${g && ok(g) ? "" : "disabled"}>${icon("gate")}Open main gate</button>
          <p class="note" style="margin-top:14px">${icon("info")}<span>The gate switch resets itself straight away, so the app can't tell you whether the gate is open or closed. Check the camera.</span></p>
        </article>
        ${cam ? camCard(cam) : ""}
      </div>
    </section>`;
  }

  function flowSvg(e) {
    const has = v => v !== null;
    const node = (x, y, ic, col) => `<circle cx="${x}" cy="${y}" r="27" fill="#121a3c" stroke="${col}" stroke-width="2"/>
      <svg x="${x - 13}" y="${y - 13}" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${P[ic]}</svg>`;
    const wire = (d, col, active, rev) => `<path class="wire" d="${d}"/>${active ? `<path class="pulse" d="${d}" stroke="${col}" style="${rev ? "animation-direction:reverse" : ""}"/>` : ""}`;
    const v = (x, u = " kW") => (x === null ? "—" : kw(x) + u);
    return `<svg viewBox="0 0 360 250" role="img" aria-label="Energy flow">
      ${wire("M180 67 V128", "#ff9a3c", has(e.pv) && e.pv > 30, false)}
      ${wire("M180 128 V185", "#2ee6d6", has(e.batt) && Math.abs(e.batt) > 30, has(e.batt) && e.batt < 0)}
      ${wire("M180 128 H281", "#f3e9dc", has(e.home) && e.home > 30, false)}
      ${wire("M180 128 H79", "#98a1c8", has(e.grid) && Math.abs(e.grid) > 30, has(e.grid) && e.grid > 0)}
      <circle cx="180" cy="128" r="5" fill="#f3e9dc"/>
      ${node(180, 40, "sun", "#ff9a3c")}${node(52, 128, "grid", "#98a1c8")}${node(308, 128, "home", "#f3e9dc")}${node(180, 212, "battery", "#2ee6d6")}
      <text class="cap" x="216" y="34">Solar</text><text class="lbl" x="216" y="54">${v(e.pv)}</text>
      <text class="cap" x="52" y="176" text-anchor="middle">Grid</text><text class="lbl" x="52" y="196" text-anchor="middle">${v(e.grid)}</text>
      <text class="cap" x="52" y="214" text-anchor="middle" style="font-size:11px">${!has(e.grid) ? "no reading" : e.grid > 30 ? "importing" : e.grid < -30 ? "exporting" : "idle"}</text>
      <text class="cap" x="308" y="70" text-anchor="middle">Home</text><text class="lbl" x="308" y="90" text-anchor="middle">${v(e.home)}</text>
      <text class="cap" x="216" y="206">Battery</text><text class="lbl" x="216" y="226">${e.soc === null ? "—" : Math.round(e.soc) + "%"}${has(e.batt) ? ` · ${e.batt >= 0 ? "+" : "−"}${kw(e.batt)} kW` : ""}</text>
    </svg>`;
  }
  function chartSvg(series) {
    if (!series) return '<p class="empty">Loading today’s readings…</p>';
    if (!series.pv.some(v => v !== null) && !series.use.some(v => v !== null)) return '<p class="empty">No history recorded today yet.</p>';
    const N = series.pv.length, W = 600, H = 240, L = 40, R = 14, T = 26, B = 30;
    const peak = Math.max(1000, ...series.pv.filter(v => v !== null), ...series.use.filter(v => v !== null));
    const max = Math.ceil(peak / 1000);
    const x = i => L + (i / (N - 1)) * (W - L - R), y = v => T + (1 - v / 1000 / max) * (H - T - B);
    // A reading with no neighbours is drawn as a dot (zero-length segment with a round cap).
    const line = a => a.map((v, i) => (v === null ? "" : `${i && a[i - 1] !== null ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}${(i === 0 || a[i - 1] === null) && (i === a.length - 1 || a[i + 1] === null) ? " h0.01" : ""}`)).join(" ");
    const firstPv = series.pv.findIndex(v => v !== null), lastPv = series.pv.length - 1 - [...series.pv].reverse().findIndex(v => v !== null);
    const area = firstPv >= 0 ? `${line(series.pv.slice(0, lastPv + 1).map((v, i) => (i < firstPv ? null : v ?? 0)))} L${x(lastPv)} ${y(0)} L${x(firstPv)} ${y(0)} Z` : "";
    const ticks = Array.from({ length: max + 1 }, (_, v) => `<line class="gridline" x1="${L}" x2="${W - R}" y1="${y(v * 1000)}" y2="${y(v * 1000)}"/><text class="axis" x="${L - 8}" y="${y(v * 1000) + 4}" text-anchor="end">${v}</text>`).join("");
    const xs = [0, 6, 12, 18, 24].map(h => `<text class="axis" x="${x(h * (N - 1) / 24)}" y="${H - 8}" text-anchor="middle">${pad(h)}</text>`).join("");
    const nowI = (nowMin() / 1440) * (N - 1);
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Today's solar production and home use">
      <defs><linearGradient id="lg-pv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a3c" stop-opacity="0.55"/><stop offset="1" stop-color="#ff5c8a" stop-opacity="0.05"/></linearGradient></defs>
      ${ticks}${xs}<text class="axis" x="${L}" y="12" style="font-size:11px">kW</text>
      ${area ? `<path d="${area}" fill="url(#lg-pv)"/>` : ""}
      <path d="${line(series.pv)}" fill="none" stroke="#ff9a3c" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${line(series.use)}" fill="none" stroke="#2ee6d6" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <line x1="${x(nowI)}" x2="${x(nowI)}" y1="${T}" y2="${y(0)}" stroke="#f3e9dc" stroke-opacity="0.5" stroke-dasharray="3 4"/>
    </svg>`;
  }
  async function loadHistory() {
    if (Date.now() - store.historyAt < 5 * 60000) return;
    store.historyAt = Date.now();
    const E = C.energy, BINS = 96;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    if (store.mode === "demo") { store.history = Demo.history(BINS); return; }
    try {
      const res = await store.conn.sendMessagePromise({ type: "history/history_during_period", start_time: start.toISOString(), entity_ids: [E.pv, E.acLoads, E.essential], minimal_response: true, no_attributes: true, significant_changes_only: false });
      const binned = id => {
        // minimal_response: the first entry is a full state object, later ones are { s, lu }.
        const pts = (res[id] || []).map(p => ({ t: p.lu ? p.lu * 1000 : Date.parse(p.last_updated || p.last_changed), v: parseFloat(p.s ?? p.state) }));
        const out = [];
        for (let i = 0; i < BINS; i++) {
          const t = start.getTime() + i * 15 * 60000;
          if (t > Date.now()) { out.push(null); continue; }
          let v = null; for (const p of pts) { if (p.t <= t + 15 * 60000) v = Number.isFinite(p.v) ? p.v : null; else break; }
          out.push(v);
        }
        return out;
      };
      const ac = binned(E.acLoads), ess = binned(E.essential);
      store.history = { pv: binned(E.pv), use: ac.map((v, i) => (v === null && ess[i] === null ? null : (v || 0) + (ess[i] || 0))) };
    } catch { store.history = { pv: [], use: [] }; }
    render(false);
  }
  function viewEnergy() {
    const e = energy();
    loadHistory();
    const stat = (k, col, val, unit, sub, extra = "") => `<div class="card stat"><div class="k" ${col ? `style="color:var(--${col})"` : ""}>${k}</div><div class="n">${val === null ? "—" : val}${val === null ? "" : `<small>${unit}</small>`}</div><div class="s">${sub}</div>${extra}</div>`;
    const missing = Object.entries(C.energy).filter(([, id]) => !ok(st(id))).map(([k]) => k);
    return `<section class="view">
      <div class="page-head"><div><h1>Solar &amp; Power</h1><p>Victron Color Control GX${e.inverter ? ` · inverter ${esc(e.inverter)}` : ""}</p></div>${store.mode === "demo" ? '<span class="pill warn">Demo data</span>' : ""}</div>
      <div class="grid g-2">
        <article class="card flow">${flowSvg(e)}</article>
        <div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          ${stat("Solar", "sunset", e.pv === null ? null : kw(e.pv), "kW", e.pvToday === null ? "PV inverter" : `${e.pvToday.toFixed(1)} kWh today`)}
          ${stat("Battery", "turq", e.soc === null ? null : Math.round(e.soc), "%", e.batt === null ? "No reading" : e.batt > 30 ? `Charging +${kw(e.batt)} kW` : e.batt < -30 ? `Discharging ${kw(e.batt)} kW` : "Idle", e.soc === null ? "" : `<div class="bar"><b style="width:${Math.max(0, Math.min(100, e.soc))}%"></b></div>`)}
          ${stat("Home use", "", e.home === null ? null : kw(e.home), "kW", `AC ${e.ac === null ? "—" : kw(e.ac)} · Essential ${e.ess === null ? "—" : kw(e.ess)}`)}
          ${stat("Grid", "", e.grid === null ? null : kw(e.grid), "kW", e.grid === null ? "No reading" : e.grid > 30 ? "Importing" : e.grid < -30 ? "Exporting" : "Idle")}
        </div>
      </div>
      ${solarForecastCard()}
      ${(() => { const items = [["automation.finca_announce_battery_low", "Battery at 10 %"], ["automation.finca_announce_grid_failure", "Grid goes down / comes back"]].map(([id, label]) => [st(id), label]).filter(([x]) => x);
        return items.length ? `<article class="card"><div class="card-head"><span class="ico" style="--tint:var(--sunset)">${icon("alexa")}</span><div class="grow"><h3>Spoken power alerts</h3><div class="row-sub">On every Alexa and Sonos speaker, 11:00–21:00</div></div></div>
          ${items.map(([x, label]) => `<div class="row"><div class="row-body"><div class="row-title">${label}</div><div class="row-sub">${x.attributes.last_triggered ? "Last " + ago(x.attributes.last_triggered) : "Not triggered yet"}</div></div>${sw(x.entity_id, x.state === "on", label, "sunset")}</div>`).join("")}</article>` : ""; })()}
      <article class="card chart">
        <div class="card-head" style="flex-wrap:wrap"><div class="grow"><h3>Today</h3><div class="row-sub">Solar production and home use, kW</div></div>
          <div class="legend"><span><i style="background:var(--sunset)"></i>Solar</span><span><i style="background:var(--turq)"></i>Home use</span></div></div>
        ${chartSvg(store.history)}
      </article>
      ${missing.length && store.mode !== "demo" ? `<p class="note">${icon("info")}<span>No reading yet for: ${missing.join(", ")}. These show “—” rather than a guess.</span></p>` : ""}
    </section>`;
  }

  function viewPool() {
    const j = find("jacuzzi"), ph = find("poolHouse"), pump = find("pump"), pl = find("poolLights"), moist = find("moisture");
    const missing = name => `<article class="card"><div class="card-head"><span class="ico">${icon("info")}</span><div class="grow"><h3>${name}</h3><div class="row-sub">Not found in Home Assistant</div></div></div></article>`;
    const schedCard = (s, title, ic, windows, labels) => !s ? missing(title) : `<article class="card">
      <div class="card-head"><span class="ico">${icon(ic)}</span>
        <div class="grow"><h3>${title}</h3><div class="row-sub">${schedText(s, windows)}</div></div>
        ${ok(s) ? sw(s.entity_id, s.state === "on", title) : '<span class="pill warn">Offline</span>'}</div>
      ${timeline(windows)}
      <div class="sched">${labels.map(l => `<span>${l}</span>`).join("")}</div>
      <p class="note" style="margin-top:12px">${icon("info")}<span>Schedule kept in eWeLink, unchanged. A manual switch lasts until the next scheduled time.</span></p>
    </article>`;
    return `<section class="view">
      <div class="page-head"><div><h1>Pool &amp; Jacuzzi</h1><p>Pool house, pump, pool lights and jacuzzi heater</p></div></div>
      <div class="grid g-2">
        ${!j ? missing("Jacuzzi Heater") : `<article class="card">
          <div class="card-head"><span class="ico" style="--tint:var(--coral)">${icon("heater")}</span>
            <div class="grow"><h3>Jacuzzi Heater</h3><div class="row-sub">${!ok(j) ? "Offline in eWeLink" : j.state === "on" ? `Heating · on since ${new Date(j.last_changed).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "Heater off"}</div></div>
            ${!ok(j) ? '<span class="pill warn">Offline</span>' : j.state === "on" ? '<span class="pill hot">Heating</span>' : '<span class="pill">Off</span>'}</div>
          <button class="btn ${ok(j) && j.state !== "on" ? "btn-primary" : ""}" style="width:100%;min-height:58px;font-size:17px" data-toggle="${j.entity_id}" ${ok(j) ? "" : "disabled"}>${icon("power")}${j.state === "on" ? "Switch heater off" : "Switch heater on"}</button>
          <p class="note" style="margin-top:12px">${icon("info")}<span>${ok(j) ? "No schedule. The heater stays on until you switch it off." : "The heater switch isn't reachable, so nothing can control it until it's back online."}</span></p>
        </article>`}
        ${!ph ? missing("Pool House") : `<article class="card">
          <div class="card-head"><span class="ico" style="--tint:var(--sunset)">${icon("poolhouse")}</span>
            <div class="grow"><h3>Pool House</h3><div class="row-sub">${ok(ph) ? (ph.state === "on" ? "Light on" : "Light off") : "Offline"}</div></div>
            ${ok(ph) ? sw(ph.entity_id, ph.state === "on", "Pool House light", "sunset") : '<span class="pill warn">Offline</span>'}</div>
          ${domainOf(ph.entity_id) === "light" && dimmable(ph) ? `<div class="bri"><input type="range" id="bri-poolhouse" min="1" max="100" value="${Math.round((ph.attributes.brightness || 128) / 2.55)}" style="--val:${Math.round((ph.attributes.brightness || 128) / 2.55)}%" data-bri="${ph.entity_id}" aria-label="Pool House brightness" ${ph.state === "on" ? "" : "disabled"}><span class="v">${ph.state === "on" ? Math.round((ph.attributes.brightness || 0) / 2.55) + "%" : "Off"}</span></div>` : ""}
        </article>`}
        ${schedCard(pump, "Pool Pump", "pump", C.schedules.pump, ["On 10:30", "Off 15:30", "On 16:30", "Off 18:45"])}
        ${schedCard(pl, "Pool Lights", "poollight", C.schedules.poolLights, ["On 19:00", "Off 00:00"])}
        ${moist ? `<article class="card"><div class="card-head"><span class="ico">${icon("drop")}</span><div class="grow"><h3>${esc(nm(moist))}</h3><div class="row-sub">${ok(moist) ? `${moist.state}% humidity` : "Offline"}</div></div></div></article>` : ""}
      </div>
    </section>`;
  }

  // Music search (14 Nov): type an artist/song/playlist, pick a speaker, play from Spotify via Music Assistant.
  // Sonos favourites (radio stations, playlists saved in the Sonos app) and how each Music Assistant speaker maps to its Sonos twin.
  const SONOS_OF = { "media_player.tv_room": "media_player.tv_room_tv_room", "media_player.move_2": "media_player.move", "media_player.bar": "media_player.bar_bar",
    "media_player.bar_2": "media_player.bar_2_bar_2", "media_player.games_room": "media_player.games_room_games_room", "media_player.ganes_room2": "media_player.ganes_room2_ganes_room2",
    "media_player.bedroom_sonos_connect_media_renderer": "media_player.bedroom_bedroom", "media_player.bedroom_2_sonos_play_5_media_renderer": "media_player.bedroom_2_bedroom_2" };
  function sonosFavs() {
    const src = (st("media_player.bar_bar") || st("media_player.tv_room_tv_room") || { attributes: {} }).attributes.source_list || [];
    return src.filter(x => !/^(line-in|tv|audio component)/i.test(x));
  }
  // Search results (14 Nov): one search per Enter/Search tap (not per letter: keeps Spotify's rate limit happy),
  // a compact list with covers; tap one to select it, then Play.
  const ms = { q: "", res: null, sel: null, busy: false, entry: null, err: "", play: "" };
  const setPlay = (v, ms_ = 0) => { ms.play = v; lastHtml = ""; render(false); if (ms_) setTimeout(() => { if (ms.play === v) { ms.play = ""; lastHtml = ""; render(false); } }, ms_); };
  // Your Spotify (14 Nov): Liked Songs + saved playlists from Music Assistant's library copy (local, no Spotify requests).
  const lib = { at: 0, items: null, busy: false };
  const GENERATED = /\(from library\)|^infinite mix|^all favorited|^recently (added|played)/i;
  async function loadLibrary() {
    if (lib.busy || Date.now() - lib.at < 15 * 60000) return;
    lib.busy = true;
    try {
      if (store.mode === "demo") lib.items = ["Liked Songs", "Chilled soul", "IBIZA Summer Mix", "Cali Reggae", "80s Mix"].map((n, i) => ({ name: n, uri: "demo://pl" + i, image: "" }));
      else {
        if (!ms.entry) { const e = await store.conn.sendMessagePromise({ type: "config_entries/get", domain: "music_assistant" }); ms.entry = (e.find(x => x.state === "loaded") || e[0] || {}).entry_id; }
        const r = await store.conn.sendMessagePromise({ type: "call_service", domain: "music_assistant", service: "get_library",
          service_data: { config_entry_id: ms.entry, media_type: "playlist", limit: 200 }, return_response: true });
        lib.items = ((r.response || {}).items || []).filter(x => !GENERATED.test(x.name));
      }
      lib.items.sort((a, b) => (/^liked songs/i.test(b.name) - /^liked songs/i.test(a.name)));
      lib.at = Date.now(); lastHtml = ""; render(false);
    } catch { lib.at = Date.now() - 13 * 60000; } finally { lib.busy = false; }
  }
  function libraryRow() {
    loadLibrary();
    if (!lib.items || !lib.items.length) return "";
    ms.libRows = lib.items.map(x => ({ ...x, kind: "Playlist" }));
    return `<div class="lib-head"><span>Your Spotify</span><small>${lib.items.length} playlists · tap one, then Play</small></div>
      <div class="lib-row" role="listbox" aria-label="Your playlists">${ms.libRows.map((x, i) => { const liked = /^liked songs/i.test(x.name);
        return `<button type="button" class="lib-card ${liked ? "liked" : ""}" role="option" data-libi="${i}" aria-selected="${!!ms.sel && ms.sel.uri === x.uri}">
          <span class="lib-art">${liked ? icon("heart") : `<img src="${esc(x.image || FALLBACK_ART)}" alt="" loading="lazy">`}<span class="ms-ck" aria-hidden="true">${icon("check")}</span></span>
          <span class="lib-name">${esc(liked ? "Liked Songs" : x.name.trim())}</span></button>`; }).join("")}</div>`;
  }
  function msResults() {
    if (ms.err) return `<p class="row-sub ms-msg">${esc(ms.err)}</p>`;
    if (!ms.res) return "";
    const r = ms.res, rows = [
      ...(r.artists || []).slice(0, 1).map(x => ({ ...x, kind: "Artist" })),
      ...(r.albums || []).slice(0, 3).map(x => ({ ...x, kind: "Album" })),
      ...(r.playlists || []).slice(0, 2).map(x => ({ ...x, kind: "Playlist" })),
      ...(r.tracks || []).slice(0, 4).map(x => ({ ...x, kind: "Song" }))];
    ms.rows = rows;
    if (!rows.length) return `<p class="row-sub ms-msg">Nothing found for “${esc(ms.q)}”.</p>`;
    const by = x => (x.artists || []).map(a => a.name).filter(Boolean).slice(0, 2).join(", ") || x.owner || "";
    return `<div class="ms-res" role="listbox" aria-label="Search results">${rows.map((x, i) => `<button type="button" class="ms-row" role="option" data-msi="${i}" aria-selected="${!!ms.sel && ms.sel.uri === x.uri}">
        <img src="${esc(x.image || FALLBACK_ART)}" alt="" loading="lazy" class="${x.image ? "" : "fallback"} ${x.kind === "Artist" ? "round" : ""}">
        <span class="ms-t"><b>${esc(x.name)}</b><small>${x.kind}${by(x) && x.kind !== "Artist" ? " · " + esc(by(x)) : ""}</small></span>
        <span class="ms-ck" aria-hidden="true">${icon("check")}</span></button>`).join("")}</div>`;
  }
  async function msSearch(q) {
    ms.q = q; ms.sel = null; ms.err = ""; ms.res = null;
    if (!q) { lastHtml = ""; render(false); return; }
    ms.busy = true; lastHtml = ""; render(false);
    try {
      if (store.mode === "demo") {
        await new Promise(r => setTimeout(r, 500));
        ms.res = { artists: [{ name: q, uri: "demo://artist", image: "" }], albums: [{ name: `${q}: Greatest Hits`, uri: "demo://album1", artists: [{ name: q }] }, { name: "Live", uri: "demo://album2", artists: [{ name: q }] }],
          tracks: [{ name: "Best song", uri: "demo://t1", artists: [{ name: q }] }, { name: "Another one", uri: "demo://t2", artists: [{ name: q }] }] };
      } else {
        if (!ms.entry) { const e = await store.conn.sendMessagePromise({ type: "config_entries/get", domain: "music_assistant" }); ms.entry = (e.find(x => x.state === "loaded") || e[0] || {}).entry_id; }
        const r = await store.conn.sendMessagePromise({ type: "call_service", domain: "music_assistant", service: "search",
          service_data: { config_entry_id: ms.entry, name: q, limit: 5 }, return_response: true });
        ms.res = r.response || {};
      }
    } catch (e) { ms.err = "Search didn't work just now (Spotify may be busy). Try again in a minute, or press Play to try anyway."; }
    ms.busy = false; lastHtml = ""; render(false);
  }
  function musicSearch() {
    const ma = all("media_player").filter(s => platformOf(s.entity_id) === "music_assistant" && ok(s) && !/sendspin|pwa|safari/i.test(nm(s)));
    if (!ma.length && store.mode !== "demo") return "";
    // Pick one or several speakers (14 Nov): tap to add or remove; several are grouped so they play in sync.
    const picked = String(mem.get("music.speakers", mem.get("music.speaker", "media_player.tv_room"))).split(",").filter(Boolean);
    const names = { "media_player.tv_room": "Living room" };
    // The Arc carries the whole TV surround (2 Era 300 + Sub are bonded to it), so it leads the list as "Living room".
    ma.sort((a, b) => (b.entity_id === "media_player.tv_room") - (a.entity_id === "media_player.tv_room"));
    { const seen = new Set(), label = s => s.entity_id === "media_player.tv_room" ? "Living room" : nm(s).replace(/ - Sonos.*$/, "").replace(/^65PUS.*$/i, "TV");
      const keep = []; ma.forEach(s => { const k = label(s).toLowerCase(); if (!seen.has(k)) { seen.add(k); keep.push(s); } }); ma.splice(0, ma.length, ...keep);
      ma.sort((a, b) => spkRank(a.entity_id) - spkRank(b.entity_id) || natCmp(nm(a), nm(b))); }
    return `<article class="card" style="--tint:var(--coral);margin-bottom:16px">
      <form id="music-search" class="jarvis-input" style="margin:0;gap:10px;flex-wrap:wrap">
        <div class="ms-bar"><input id="music-q" type="search" placeholder="Search Spotify: artist, song or playlist…" aria-label="Search Spotify" autocomplete="off" enterkeyhint="search" value="${esc(ms.q)}">
          <button class="btn" type="submit" aria-label="Search">${ms.busy ? '<span class="spin" aria-hidden="true"></span>' : icon("search")}</button></div>
        ${msResults()}
        ${libraryRow()}
        <div class="seg-row" id="music-where" role="group" aria-label="Speakers (pick one or more)" style="flex:1 1 100%;flex-wrap:wrap">
          ${ma.map(s => `<button type="button" class="seg-btn" data-spk="${s.entity_id}" aria-pressed="${picked.includes(s.entity_id)}">${s.entity_id === "media_player.tv_room" ? icon("tv").replace("<svg", '<svg style="width:16px;height:16px;vertical-align:-3px;margin-right:4px"') : ""}${esc(names[s.entity_id] || nm(s).replace(/ - Sonos.*$/, "").replace(/^65PUS.*$/i, "TV"))}</button>`).join("")}
          <button type="button" class="seg-btn" data-spk-all="1">All speakers</button>
        </div>
        <div class="ms-play"><button class="btn btn-primary play-btn ${ms.play || ""}" type="button" data-msplay="1" aria-live="polite" ${ms.play === "busy" ? "disabled" : ""}>${
            ms.play === "busy" ? '<span class="spin" aria-hidden="true"></span>Starting…' : ms.play === "ok" ? `${icon("check")}Playing` : ms.play === "fail" ? "Didn't play" : `${icon("music")}Play`}</button>
          <span class="row-sub">${ms.sel ? `Selected: <b style="color:var(--sand)">${esc(/^liked songs/i.test(ms.sel.name) ? "Liked Songs (shuffled)" : ms.sel.name.trim())}</b>` : ms.q ? `Plays “${esc(ms.q)}”` : "Search, pick a result, choose speakers, play"}</span></div>
      </form>
      ${(() => { const fav = sonosFavs(); if (!fav.length) return "";
        const isRadio = f => /radio|bbc|1xtra|wfmu|\bfm\b|talk|capital|heart|smooth|apple music 1/i.test(f);
        const opt = f => `<option value="${esc(f)}">${esc(f)}</option>`;
        return `<div class="fav-pick"><select class="sel" id="fav-sel" aria-label="Radio and Sonos favourites">
          <option value="">Radio &amp; Sonos favourites…</option>
          <optgroup label="Radio">${fav.filter(isRadio).map(opt).join("")}</optgroup>
          <optgroup label="Playlists and songs">${fav.filter(f => !isRadio(f)).map(opt).join("")}</optgroup>
        </select><button type="button" class="btn" data-favgo="1">${icon("radio")}Play</button></div>`; })()}
    </article>`;
  }
  // Now playing (14 Nov): big cover art, title, a progress bar you can drag to skip along, back / play-pause / next.
  // No cover art, or it fails to load: show the Finca logo instead of a blank square.
  const FALLBACK_ART = "icon-dome-512.png";
  document.addEventListener("error", ev => {
    const i = ev.target;
    if (i.tagName === "IMG" && i.closest(".np-art, .np, .ms-res, .lib-row") && !i.dataset.fb) { i.dataset.fb = "1"; i.classList.add("fallback"); i.src = FALLBACK_ART; }
  }, true);
  const artUrl = p => !p ? "" : /^https?:/.test(p) ? p : store.hassUrl + p;
  const fmtDur = x => { x = Math.max(0, Math.floor(x || 0)); return `${Math.floor(x / 60)}:${pad(x % 60)}`; };
  function npPos(a, playing) {
    let pos = a.media_position || 0;
    if (playing && a.media_position_updated_at) pos += (Date.now() - Date.parse(a.media_position_updated_at)) / 1000;
    return Math.min(pos, a.media_duration || pos);
  }
  function nowPlaying() {
    // Sonos players first (they carry the position), Music Assistant copies as a fallback; one per group (the leader).
    const cands = all("media_player").filter(s => (store.mode === "demo" || ["sonos", "music_assistant"].includes(platformOf(s.entity_id))) && ok(s)
      && ["playing", "paused"].includes(s.state) && s.attributes.media_title
      && !((s.attributes.group_members || [])[0] && s.attributes.group_members[0] !== s.entity_id));
    const rank = s => (s.state === "playing" ? 0 : 2) + (platformOf(s.entity_id) === "sonos" ? 0 : 1);
    const s = cands.sort((a, b) => rank(a) - rank(b) || Date.parse(b.last_changed) - Date.parse(a.last_changed))[0];
    if (!s) return "";
    const a = s.attributes, playing = s.state === "playing", dur = a.media_duration || 0;
    const pos = Math.floor((a.media_position || 0) / 5) * 5, pct = dur ? (pos / dur) * 100 : 0;   // ticker fills in the live second
    const where = (a.group_members || []).length > 1 ? `${nm(s)} + ${a.group_members.length - 1} more` : nm(s);
    const vol = Math.round((a.volume_level || 0) * 100);
    return `<article class="card nowplay" style="--tint:var(--coral);margin-bottom:16px">
      <div class="np-art"><img src="${a.entity_picture ? esc(artUrl(a.entity_picture)) : FALLBACK_ART}" alt="" ${a.entity_picture ? "" : 'class="fallback"'}></div>
      <div class="np-body">
        <div class="row-sub">${playing ? "Now playing" : "Paused"} · ${esc(where.replace(/ - Sonos.*$/, ""))}</div>
        <h2 class="np-title">${esc(a.media_title)}</h2>
        <div class="row-sub np-artist">${esc([a.media_artist, a.media_album_name].filter(Boolean).join(" · ") || a.media_channel || "")}</div>
        ${dur ? `<div class="np-prog"><span id="np-cur">${fmtDur(pos)}</span>
          <input type="range" id="np-seek" min="0" max="${Math.round(dur)}" step="1" value="${Math.round(pos)}" style="--val:${pct}%" data-seek="${s.entity_id}" data-dur="${dur}" aria-label="Song position">
          <span>${fmtDur(dur)}</span></div>` : ""}
        <div class="media-ctl np-ctl">
          <button class="round-btn np-mode" data-shuffle="${s.entity_id}" aria-pressed="${!!a.shuffle}" aria-label="Shuffle">${icon("shuffle")}</button>
          <button class="round-btn" data-media="${s.entity_id}" data-cmd="media_previous_track" aria-label="Previous track">${icon("prev")}</button>
          <button class="round-btn np-main" data-media="${s.entity_id}" data-cmd="media_play_pause" aria-label="Play or pause">${icon(playing ? "pause" : "play")}</button>
          <button class="round-btn" data-media="${s.entity_id}" data-cmd="media_next_track" aria-label="Next track">${icon("next")}</button>
          <button class="round-btn np-mode" data-repeat="${s.entity_id}" data-now="${esc(a.repeat || "off")}" aria-pressed="${(a.repeat || "off") !== "off"}" aria-label="Repeat: ${esc(a.repeat || "off")}">${icon(a.repeat === "one" ? "repeat1" : "repeat")}</button>
          ${a.volume_level !== undefined ? `<input type="range" min="0" max="100" value="${vol}" style="--val:${vol}%" data-vol="${s.entity_id}" aria-label="Volume">` : ""}
        </div>
      </div>
    </article>`;
  }
  function viewMedia() {
    // Tidy (14 Nov): one tile per speaker — the Sonos ones (Music Assistant, Alexa, the wall tablet's voice and browser
    // players are copies of the same speakers) — plus one TV tile: the first of the TV's several entries that is online.
    const all_mp = all("media_player");
    const speakers_ = all_mp.filter(s => platformOf(s.entity_id) === "sonos");
    const tvs = all_mp.filter(s => /65pus|philips|tv$/i.test(nm(s)) && platformOf(s.entity_id) !== "sonos" && platformOf(s.entity_id) !== "music_assistant");
    const tv = tvs.find(ok) || tvs[0];
    const players = [...speakers_.sort((a, b) => spkRank(a.entity_id) - spkRank(b.entity_id) || natCmp(nm(a), nm(b))), ...(tv ? [tv] : [])];
    const prettyName = s => s === tv ? "TV" : isLR(s) ? "Living room" : nm(s);
    const isLR = s => s.entity_id === "media_player.tv_room_tv_room";
    const card = s => {
      const a = s.attributes, vol = Math.round((a.volume_level || 0) * 100);
      return `<article class="card">
        <div class="card-head"><span class="ico" style="--tint:var(--coral)">${icon("music")}</span>
          <div class="grow"><h3>${esc(prettyName(s))}</h3><div class="row-sub">${isLR(s) ? "TV surround · Arc, 2 Era 300, Sub" : `${esc(areaOf(s.entity_id) || "")}${areaOf(s.entity_id) ? " · " : ""}`}${isLR(s) ? " · " : ""}${esc(ok(s) ? s.state : "offline")}</div></div></div>
        ${a.media_title ? `<div class="np"><img src="${a.entity_picture ? esc(artUrl(a.entity_picture)) : FALLBACK_ART}" alt="" ${a.entity_picture ? "" : 'class="fallback"'}><div class="t"><div><b>${esc(a.media_title)}</b></div><div class="row-sub">${esc(a.media_artist || a.media_album_name || "")}</div></div></div>` : ""}
        ${ok(s) ? `<div class="media-ctl">
          <button class="round-btn" data-media="${s.entity_id}" data-cmd="media_play_pause" aria-label="Play or pause">${icon(s.state === "playing" ? "pause" : "play")}</button>
          <button class="round-btn" data-media="${s.entity_id}" data-cmd="media_next_track" aria-label="Next track">${icon("next")}</button>
          ${a.volume_level !== undefined ? `<input type="range" id="vol-${s.entity_id.replace(/\W/g, "")}" min="0" max="100" value="${vol}" style="--val:${vol}%" data-vol="${s.entity_id}" aria-label="${esc(nm(s))} volume">` : ""}
        </div>` : ""}
      </article>`;
    };
    return `<section class="view">
      <div class="page-head"><div><h1>Music</h1><p>Sonos and speakers</p></div></div>
      <div class="head-btns">
        ${(() => { const p = st("switch.finca_party_mode"); if (!p) return ""; const on = p.state === "on";
          return `<button class="btn ${on ? "" : "btn-primary"}" data-toggle="${p.entity_id}">${icon("party")}${on ? "End the party" : "Party mode"}</button>`; })()}
        ${(() => { const r = st("switch.finca_romantic_mode"); if (!r) return ""; const on = r.state === "on";
          return `<button class="btn ${on ? "" : "btn-primary"}" data-toggle="${r.entity_id}">${icon("heart")}${on ? "End romantic mode" : "Romantic mode"}</button>`; })()}
        ${(() => { const mv = st("switch.finca_movie_mode"); if (!mv) return ""; const on = mv.state === "on";
          return `<button class="btn ${on ? "" : "btn-primary"}" data-toggle="${mv.entity_id}">${icon("film")}${on ? "End movie mode" : "Movie mode"}</button>`; })()}</div>
      ${nowPlaying()}
      ${musicSearch()}
      ${players.length ? `<div class="grid g-2">${players.map(card).join("")}</div>` : '<p class="empty">No speakers found.</p>'}
    </section>`;
  }

  // ---------- devices: scan for new ones, name them and put them in a room ----------
  const dev = { flows: null, loadedAt: 0, busy: false, msg: "" };
  async function scanDevices(force) {
    if (dev.busy || (!force && Date.now() - dev.loadedAt < 60000)) return;
    dev.busy = true; render(false);
    try {
      if (store.mode === "demo") { dev.flows = Demo.flows ? Demo.flows() : []; }
      else {
        const [flows, devices, areas] = await Promise.all([
          store.conn.sendMessagePromise({ type: "config_entries/flow/progress" }).catch(() => []),
          store.conn.sendMessagePromise({ type: "config/device_registry/list" }).catch(() => null),
          store.conn.sendMessagePromise({ type: "config/area_registry/list" }).catch(() => null)]);
        dev.flows = (flows || []).filter(f => (f.context || {}).source && !["user", "reauth", "reconfigure"].includes(f.context.source));
        if (devices) { store.devices = {}; devices.forEach(d => { store.devices[d.id] = d; }); }
        if (areas) { store.areas = {}; areas.forEach(a => { store.areas[a.area_id] = a; }); }
      }
      dev.msg = `Scanned at ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
    } catch (e) { dev.msg = `Scan failed: ${e.message || e.code || e}`; }
    dev.loadedAt = Date.now(); dev.busy = false; lastHtml = ""; render(false);
  }
  const brandOf = d => [d.manufacturer, d.model].filter(Boolean).join(" ");
  function viewDevices() {
    scanDevices(false);
    const cutoff = Date.now() / 1000 - 14 * 86400;
    const recent = Object.values(store.devices).filter(d => (d.created_at || 0) > cutoff && !d.disabled_by && d.entry_type !== "service")
      .sort((a, b) => (b.created_at || 0) - (a.created_at || 0)).slice(0, 30);
    const areas = Object.values(store.areas).sort((a, b) => roomCmp(a.name, b.name));
    const flows = dev.flows || [];
    const addUrl = (store.hassUrl || "") + "/config/integrations/dashboard";
    return `<section class="view">
      <div class="page-head"><div><h1>Devices</h1><p>${esc(dev.busy ? "Scanning…" : dev.msg || "Find and set up new devices")}</p></div>
        <button class="btn btn-primary" data-action="scan" ${dev.busy ? "disabled" : ""}>${icon("sensor")}Scan for devices</button></div>
      <h2 class="section">Waiting to be added</h2>
      ${dev.flows === null ? '<p class="empty">Scanning…</p>' : flows.length ? `<div class="grid g-2">${flows.map(f => `<article class="card"><div class="card-head">
          <span class="ico">${icon("plus")}</span>
          <div class="grow"><h3>${esc((f.context.title_placeholders || {}).name || f.handler)}</h3><div class="row-sub">Found by ${esc(f.handler.replace(/_/g, " "))} · ${esc(f.context.source)}</div></div>
          <a class="btn btn-sm btn-primary" href="${esc(addUrl)}" target="_blank" rel="noopener">Add</a></div></article>`).join("")}</div>
          <p class="note">${icon("info")}<span>“Add” opens Home Assistant, where the new device is waiting under Discovered. Confirm it there; it then appears here under Recently added.</span></p>`
        : '<p class="empty">Nothing waiting. New devices from the Hue and eWeLink apps are added automatically.</p>'}
      <h2 class="section">Recently added · last 14 days</h2>
      ${recent.length ? `<div class="grid g-2">${recent.map(d => `<article class="card">
          <div class="card-head"><span class="ico">${icon(/hue|signify|philips/i.test(d.manufacturer || "") ? "bulb" : /sonos/i.test(d.manufacturer || "") ? "music" : "sensor")}</span>
            <div class="grow"><h3>${esc(d.name_by_user || d.name || "New device")}</h3><div class="row-sub">${esc(brandOf(d))} · added ${ago(new Date(d.created_at * 1000).toISOString())}</div></div></div>
          <div class="seg-row" style="margin-top:0;align-items:center">
            <label class="row-sub" for="room-${d.id}">Room</label>
            <select class="sel" id="room-${d.id}" data-room-for="${d.id}"><option value="">No room</option>${areas.map(a => `<option value="${esc(a.area_id)}" ${a.area_id === d.area_id ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select>
          </div>
          <form class="jarvis-input" style="margin-top:10px" data-rename="${d.id}"><input type="text" id="name-${d.id}" value="${esc(d.name_by_user || d.name || "")}" aria-label="Name for ${esc(d.name || "device")}"><button class="btn btn-sm" type="submit">Rename</button></form>
        </article>`).join("")}</div>` : '<p class="empty">No devices added in the last 14 days.</p>'}
      <h2 class="section">Adding something new</h2>
      <div class="card">
        <div class="row"><span class="ico" style="--tint:var(--sunset)">${icon("bulb")}</span><div class="row-body"><div class="row-title">Hue lights and sensors</div><div class="row-sub">Pair in the Philips Hue app (Settings → Lights or Accessories → Add). They appear here within a minute; then choose the room.</div></div></div>
        <div class="row"><span class="ico">${icon("power")}</span><div class="row-body"><div class="row-title">Sonoff switches</div><div class="row-sub">Add in the eWeLink app. They come through to Home Assistant automatically.</div></div></div>
        <div class="row"><span class="ico">${icon("plus")}</span><div class="row-body"><div class="row-title">Anything else</div><div class="row-sub">Tap Scan. Most devices on the Wi-Fi are discovered by themselves; otherwise <a href="${esc(addUrl)}" target="_blank" rel="noopener" style="color:var(--turq)">open Home Assistant's integrations</a>.</div></div></div>
      </div>
    </section>`;
  }

  // ---------- render ----------
  // ---------- Find My Otter (15 Nov, draft/test: open #otters; not in the menu yet) ----------
  // Where Steve and Hollie are, from the Home Assistant app on each iPhone (no subscription). Map: OpenStreetMap data, CARTO dark tiles.
  const fm = { map: null, layer: null, loading: false };
  function loadLeaflet(cb) {
    if (window.L) return cb();
    if (fm.loading) return; fm.loading = true;
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(css);
    const js = document.createElement("script"); js.src = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"; js.onload = () => { fm.loading = false; cb(); }; document.head.appendChild(js);
  }
  const kmBetween = (a, b, c, d) => { const R = 6371, r = x => x * Math.PI / 180, dl = r(c - a), dg = r(d - b);
    const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  function otters() {
    const home = st("zone.home"), H = home && home.attributes;
    return all("person").filter(p => p.attributes.latitude !== undefined).map(p => {
      const a = p.attributes, first = ({ Steven: "Steve" })[nm(p).split(" ")[0]] || nm(p).split(" ")[0];
      const bat = all("sensor").find(s => s.attributes.device_class === "battery" && new RegExp(first.slice(0, 4), "i").test(s.entity_id + nm(s)) && /iphone|phone/i.test(s.entity_id + nm(s)));
      const km = H ? kmBetween(H.latitude, H.longitude, a.latitude, a.longitude) : null;
      return { id: p.entity_id, name: first, home: p.state === "home", lat: a.latitude, lon: a.longitude, km, since: p.last_changed, bat: bat && ok(bat) ? Math.round(+bat.state) : null };
    });
  }
  function viewOtters() {
    const list = otters(), away = list.filter(o => !o.home);
    setTimeout(drawOtterMap, 0);
    return `<section class="view">
      <div class="page-head"><div><h1>Find My Otter</h1><p>${list.length ? (list.length < 2 ? (away.length ? `${list[0].name} is out` : `${list[0].name} is at home`) + " · Hollie's phone not added yet" : away.length === list.length ? "Both away from home" : away.length ? `${away.map(o => o.name).join(" and ")} out` : "Both at home") : "No phones sharing location yet"}</p></div></div>
      <article class="card otter-map-card"><div id="otter-map" class="otter-map" role="img" aria-label="Map showing where Steve and Hollie are"></div></article>
      <div class="grid g-2">${list.map(o => `<article class="card"><div class="row" style="padding:0">
          <span class="ico otter-dot ${o.home ? "home" : ""}">${icon(o.home ? "home" : "pin")}</span>
          <div class="row-body"><div class="row-title">${esc(o.name)}</div>
            <div class="row-sub">${o.home ? "At home" : `Away · ${o.km === null ? "" : o.km < 1 ? `${Math.round(o.km * 1000)} m` : `${o.km.toFixed(1)} km`} from home`} · since ${ago(o.since)}${o.bat !== null ? ` · phone ${o.bat}%` : ""}</div></div>
          <button class="btn btn-sm" data-otter="${o.id}">Show</button></div></article>`).join("") || '<p class="empty">Once each phone has the Home Assistant app with location on, it appears here.</p>'}</div>
      <p class="note">${icon("info")}<span>Location comes from the Home Assistant app on each phone (Steve's iPhone: Location “Always”; Hollie's Android: location “Allow all the time” and battery optimisation off for the app). Private to this house; no subscription. Map © OpenStreetMap, © CARTO.</span></p>
    </section>`;
  }
  function drawOtterMap() {
    const el = $("#otter-map"); if (!el) return;
    loadLeaflet(() => {
      const el2 = $("#otter-map"); if (!el2) return;
      if (!fm.map || fm.map.getContainer() !== el2) {
        if (fm.map) fm.map.remove();
        fm.map = L.map(el2, { zoomControl: false, attributionControl: true });
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19, attribution: "© OpenStreetMap © CARTO" }).addTo(fm.map);
        fm.layer = L.layerGroup().addTo(fm.map);
      }
      fm.layer.clearLayers();
      const home = st("zone.home"), pts = [];
      if (home) { const H = home.attributes; L.circle([H.latitude, H.longitude], { radius: H.radius || 100, color: "#2ee6d6", weight: 1.5, fillOpacity: .12 }).addTo(fm.layer);
        L.marker([H.latitude, H.longitude], { icon: L.divIcon({ className: "otter-pin home-pin", html: "⌂", iconSize: [26, 26] }) }).addTo(fm.layer); pts.push([H.latitude, H.longitude]); }
      otters().forEach(o => { L.marker([o.lat, o.lon], { icon: L.divIcon({ className: "otter-pin" + (o.home ? " at-home" : ""), html: `<b>${esc(o.name[0])}</b>`, iconSize: [34, 34] }) })
        .bindTooltip(o.name, { direction: "top", offset: [0, -16] }).addTo(fm.layer); pts.push([o.lat, o.lon]); });
      if (pts.length > 1 && !fm.fitted) { fm.map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 }); fm.fitted = true; } else if (pts.length === 1) fm.map.setView(pts[0], 15);
      setTimeout(() => fm.map.invalidateSize(), 50);
    });
  }
  document.addEventListener("click", ev => { const b = ev.target.closest("[data-otter]"); if (!b || !fm.map) return; const o = otters().find(x => x.id === b.dataset.otter); if (o) fm.map.setView([o.lat, o.lon], 16); });
  const VIEWS = { otters: viewOtters, home: viewHome, lighting: viewLighting, climate: viewClimate, security: viewSecurity, gates: viewGates, energy: viewEnergy, pool: viewPool, media: viewMedia, devices: viewDevices, health: viewHealth };
  const current = () => { const h = location.hash.slice(1); return VIEWS[h] ? h : "home"; };
  let pending = false;
  let lastHtml = "", lastView = "";
  // Volume safety (15 Nov): a slider only sends a volume if a finger/mouse actually touched it, and one move can raise
  // the volume by at most 25 points (8% → 33%); drag again for more. Turning down is never limited.
  let lastTouchedVol = null;
  document.addEventListener("pointerdown", ev => { const r = ev.target.closest && ev.target.closest("input[data-vol]"); if (r) lastTouchedVol = { el: r, at: Date.now() }; }, { capture: true, passive: true });
  document.addEventListener("touchstart", ev => { const r = ev.target.closest && ev.target.closest("input[data-vol]"); if (r) lastTouchedVol = { el: r, at: Date.now() }; }, { capture: true, passive: true });
  function setVolumeSafely(t) {
    const s = st(t.dataset.vol); const now = Math.round(((s && s.attributes.volume_level) || 0) * 100);
    const touched = lastTouchedVol && lastTouchedVol.el === t && Date.now() - lastTouchedVol.at < 20000;
    if (!touched) { t.value = now; t.style.setProperty("--val", now + "%"); return; }
    let want = +t.value;
    if (want > now + 40) { want = now + 40; t.value = want; t.style.setProperty("--val", want + "%"); toast(`Turned up to ${want}% (in steps for safety). Drag again for louder.`); }
    svc("media_player", "volume_set", { volume_level: want / 100 }, { entity_id: t.dataset.vol });
  }
  // A slider being dragged (iPhone doesn't focus range inputs, so track the touch itself).
  let sliding = 0;
  const slideStart = ev => { if (ev.target && ev.target.type === "range") sliding = Date.now(); };
  const slideEnd = () => { if (sliding) { sliding = 0; if (pending) setTimeout(() => render(false), 350); } };
  ["pointerdown", "touchstart", "mousedown"].forEach(t => document.addEventListener(t, slideStart, { passive: true, capture: true }));
  ["pointerup", "pointercancel", "touchend", "touchcancel", "mouseup"].forEach(t => document.addEventListener(t, slideEnd, { passive: true, capture: true }));
  function render(scroll) {
    const a = document.activeElement;
    if (!scroll && ((a && a.type === "range") || (sliding && Date.now() - sliding < 15000))) { pending = true; return; }
    pending = false;
    const v = current();
    renderNav(location.hash === "#jarvis" ? "jarvis" : v);
    // Keep already-loaded camera pictures: rebuilding them on every redraw made them blink.
    const html = VIEWS[v]();
    // Nothing on this page changed (e.g. only a solar reading moved while on Security): leave it alone.
    if (!scroll && html === lastHtml && v === lastView) return;
    const samePage = !scroll && v === lastView && $("#main").firstElementChild;
    lastHtml = html; lastView = v;
    // Same page: update only what changed (15 Nov) — a full rebuild every few seconds made banners blink and restarted animations.
    if (samePage) {
      const tmp = document.createElement("main"); tmp.innerHTML = html;
      try {
        morphChildren($("#main"), tmp);
        document.querySelectorAll("#main img[data-cam]:not([src])").forEach(img => { const cam = st(img.dataset.cam); if (cam && cam.attributes.entity_picture) img.src = store.hassUrl + cam.attributes.entity_picture; });
        afterRender(false); return;
      } catch (e) { /* fall back to a full rebuild below */ }
    }
    const keep = {};
    document.querySelectorAll("#main img[data-cam]").forEach(img => { keep[img.dataset.cam] = img; });
    const mq = $("#music-q"), mqFocus = mq && document.activeElement === mq, mqVal = mq && mq.value;
    $("#main").innerHTML = html;
    if (mq) { const n = $("#music-q"); if (n) { n.value = mqVal; if (mqFocus) { n.focus(); try { n.setSelectionRange(mqVal.length, mqVal.length); } catch { /* fine */ } } } }
    document.querySelectorAll("#main img[data-cam]").forEach(img => {
      const old = keep[img.dataset.cam];
      if (old && (old.naturalWidth || !old.complete)) { img.replaceWith(old); return; }  // loaded or still loading: keep it
      const cam = st(img.dataset.cam); if (cam && cam.attributes.entity_picture) img.src = store.hassUrl + cam.attributes.entity_picture;
    });
    afterRender(scroll);
  }
  // Modes "in progress" (15 Nov): after tapping party / romantic / movie / party lights / holiday, every button and switch
  // for it spins until the mode has really finished starting (its script or automation has stopped running).
  const MODE_WATCH = {
    "switch.finca_party_mode": { name: "Party mode", run: ["script.finca_party_start", "script.finca_party_stop"] },
    "switch.finca_romantic_mode": { name: "Romantic mode", run: ["script.finca_romantic_start", "script.finca_romantic_stop", "automation.finca_romance_switch_and_voice"] },
    "switch.finca_movie_mode": { name: "Movie mode", run: ["automation.finca_movie_mode"] },
    "switch.finca_party_lights": { name: "Party lights", run: ["automation.finca_party_lights_switch_and_voice"] },
    "switch.finca_holiday_mode": { name: "Holiday mode", run: ["automation.finca_holiday_mode"] }
  };
  const modeBusy = {};
  function modeIsBusy(eid) {
    const b = modeBusy[eid]; if (!b) return false;
    const age = Date.now() - b.at;
    if (age < 1500) return true;
    if (age > 60000) { delete modeBusy[eid]; return false; }
    const s = st(eid); if (!s || s.state !== b.to) return true;
    const running = MODE_WATCH[eid].run.some(w => { const x = st(w); if (!x) return false;
      return w.startsWith("script.") ? x.state === "on" : (x.attributes.current || 0) > 0; });
    if (running) return true;
    delete modeBusy[eid];
    toast(`${MODE_WATCH[eid].name} ${b.to === "on" ? "is on" : "is off"}`);
    return false;
  }
  function markModes() {
    Object.keys(MODE_WATCH).forEach(eid => {
      const busy = !!modeBusy[eid] && modeIsBusy(eid);
      document.querySelectorAll(`[data-toggle="${eid}"]`).forEach(el => {
        el.classList.toggle("mode-busy", busy); if (busy) el.setAttribute("aria-busy", "true"); else el.removeAttribute("aria-busy");
        const t = el.closest(".tile"); if (t) t.classList.toggle("mode-busy-tile", busy);
      });
    });
  }
  setInterval(() => { if (Object.keys(modeBusy).length) markModes(); }, 700);
  function afterRender(scroll) {
    markModes();
    updateBubble();
    $("#conn").textContent = (store.mode === "demo" ? "Demo data" : store.online ? "Live" : "Reconnecting…") + (window.FINCA_VERSION ? ` · ${window.FINCA_VERSION.split(" ")[0]}` : "");
    $("#conn").title = window.FINCA_VERSION ? `App version ${window.FINCA_VERSION}` : "";
    $("#conn").className = "conn" + (store.mode === "demo" ? " demo" : "");
    if (scroll) window.scrollTo(0, 0);
  }
  // Minimal DOM morph: keeps existing elements (and their running animations, focus, loaded pictures), changes only
  // attributes and text that differ, adds/removes children at the end.
  function morphChildren(a, b) {
    const ac = Array.from(a.childNodes), bc = Array.from(b.childNodes);
    for (let i = 0; i < bc.length; i++) {
      if (i < ac.length) morphNode(ac[i], bc[i]); else a.appendChild(bc[i]);
    }
    for (let i = ac.length - 1; i >= bc.length; i--) ac[i].remove();
  }
  function morphNode(a, b) {
    if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) { a.replaceWith(b); return; }
    if (a.nodeType === 3 || a.nodeType === 8) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    if (a.nodeType !== 1) return;
    const cam = a.tagName === "IMG" && a.hasAttribute("data-cam");
    if (cam && a.getAttribute("data-cam") !== b.getAttribute("data-cam")) { a.replaceWith(b); return; }
    for (const at of Array.from(b.attributes)) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
    for (const at of Array.from(a.attributes)) if (!b.hasAttribute(at.name) && !(cam && at.name === "src") && !(a.tagName === "DETAILS" && at.name === "open")) a.removeAttribute(at.name);
    if (a.tagName === "INPUT") {
      const busy = document.activeElement === a || (a.type === "range" && sliding);
      if (!busy && a.value !== (b.getAttribute("value") ?? "")) a.value = b.getAttribute("value") ?? "";
      if (a.type === "checkbox") a.checked = b.hasAttribute("checked");
      return;
    }
    if (a.tagName === "SELECT") { if (document.activeElement !== a) { morphChildren(a, b); const sel = b.querySelector("option[selected]"); if (sel) a.value = sel.value; } return; }
    morphChildren(a, b);
  }
  // Readings change every second; redraw at most every 1.5 s.
  let renderTimer = 0, lastRender = 0;
  const scheduleRender = () => {
    if (renderTimer) return;
    const wait = Math.max(0, 1500 - (Date.now() - lastRender));
    renderTimer = setTimeout(() => { renderTimer = 0; lastRender = Date.now(); requestAnimationFrame(() => render(false)); }, wait);
  };

  // ---------- sheets ----------
  function sheet(html, wide = false) {
    $("#layer").innerHTML = `<div class="scrim" data-action="close"><div class="sheet ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}</div></div>`;
  }
  const closeLayer = () => { const v = $("#layer video"); if (v) v.pause(); stopLive(); $("#layer").innerHTML = ""; };
  function gateSheet() {
    sheet(`<span class="ico big-ico">${icon("gate")}</span><h2>Open the main gate?</h2>
      <p>This sends one open pulse to the gate, the same as your “Open Front Gate” Alexa routine.</p>
      ${store.mode === "demo" ? '<p style="color:var(--warn)">Demo: nothing will be sent.</p>' : ""}
      <div class="acts"><button class="btn" data-action="close" id="sheet-cancel">Cancel</button><button class="btn btn-primary" data-action="gate-go">Open gate</button></div>`);
    $("#sheet-cancel").focus();
  }
  async function openGate() {
    const g = find("gate"); if (!g) return;
    const d = domainOf(g.entity_id), target = { entity_id: g.entity_id };
    const call = { switch: ["switch", "turn_on"], button: ["button", "press"], script: ["script", "turn_on"], cover: ["cover", "open_cover"], lock: ["lock", "unlock"] }[d];
    await svc(call[0], call[1], {}, target);
    toast(store.mode === "demo" ? "Demo only. No signal was sent." : "Open signal sent to the main gate.");
  }
  function allOffSheet() {
    const lights = realLights().filter(s => s.state === "on");
    sheet(`<span class="ico big-ico" style="--tint:var(--sunset)">${icon("moon")}</span><h2>Turn off all lights?</h2>
      <p>Turns off the ${lights.length} Hue light${lights.length === 1 ? "" : "s"} that are on. The pool pump, pool lights, gate, jacuzzi and fireplace are not affected.</p>
      <div class="acts"><button class="btn" data-action="close" id="sheet-cancel">Cancel</button><button class="btn btn-primary" data-action="all-off-go">Turn off</button></div>`);
    $("#sheet-cancel").focus();
  }
  // Live view: WebRTC first (Ring and go2rtc cameras), HLS as a fallback for older cameras.
  let live = null;
  function stopLive() {
    if (!live) return;
    try { live.unsub && live.unsub(); } catch { /* already closed */ }
    try { live.pc && live.pc.close(); } catch { /* already closed */ }
    live = null;
  }
  async function liveView(id) {
    const s = st(id);
    sheet(`<h2>${esc(camName(s))}</h2><div class="cam-view" id="live-box"><div class="ph">${icon("camera")}<span>Connecting…</span></div></div>
      <div class="acts" style="grid-template-columns:1fr"><button class="btn" data-action="close">Close</button></div>`, true);
    if (store.mode === "demo") { $("#live-box .ph span").textContent = "Live view appears here when connected to Home Assistant."; return; }
    const say = msg => { const b = $("#live-box"); if (b) b.innerHTML = `<div class="ph">${icon("camera")}<span>${esc(msg)}</span></div>`; };
    let types = [];
    try { types = (await store.conn.sendMessagePromise({ type: "camera/capabilities", entity_id: id })).frontend_stream_types || []; } catch { /* older Home Assistant */ }
    if (types.includes("web_rtc") && window.RTCPeerConnection) {
      try { await webrtc(id); return; } catch (e) { if (!types.includes("hls")) { say(`Live view didn't start (${e.message || e.code || e}). The Ring app always has live view.`); return; } }
    }
    try {
      const r = await store.conn.sendMessagePromise({ type: "camera/stream", entity_id: id });
      $("#live-box").innerHTML = `<video src="${esc(store.hassUrl + r.url)}" autoplay playsinline muted controls></video>`;
    } catch (e) { say(`Live view didn't start (${e.message || e.code || e}). The Ring app always has live view.`); }
  }
  async function webrtc(id) {
    stopLive();
    let cfg = {};
    try { cfg = await store.conn.sendMessagePromise({ type: "camera/webrtc/get_client_config", entity_id: id }); } catch { /* defaults */ }
    const pc = new RTCPeerConnection(cfg.configuration || {});
    const me = live = { pc, session: null, pending: [], unsub: null };
    if (cfg.dataChannel) pc.createDataChannel(cfg.dataChannel);
    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });
    const stream = new MediaStream();
    pc.ontrack = ev => {
      stream.addTrack(ev.track);
      const box = $("#live-box"); if (!box || live !== me) return;
      let v = box.querySelector("video");
      if (!v) { box.innerHTML = '<video autoplay playsinline muted controls></video><span class="pill tag" style="color:var(--coral)">Live</span>'; v = box.querySelector("video"); }
      v.srcObject = stream; v.play().catch(() => {});
    };
    const sendCandidate = c => store.conn.sendMessagePromise({ type: "camera/webrtc/candidate", entity_id: id, session_id: me.session, candidate: { candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex } }).catch(() => {});
    pc.onicecandidate = ev => { if (!ev.candidate) return; if (me.session) sendCandidate(ev.candidate); else me.pending.push(ev.candidate); };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("no answer from the camera")), 20000);
      store.conn.subscribeMessage(async msg => {
        if (live !== me) return;
        if (msg.type === "session") { me.session = msg.session_id; me.pending.splice(0).forEach(sendCandidate); }
        else if (msg.type === "answer") { await pc.setRemoteDescription({ type: "answer", sdp: msg.answer }); clearTimeout(timer); resolve(); }
        else if (msg.type === "candidate") { try { await pc.addIceCandidate(msg.candidate); } catch { /* late candidate */ } }
        else if (msg.type === "error") { clearTimeout(timer); reject(new Error(msg.message || msg.code)); }
      }, { type: "camera/webrtc/offer", entity_id: id, offer: offer.sdp }).then(u => { me.unsub = u; }, e => { clearTimeout(timer); reject(e); });
    });
  }
  // Ring Protect: the latest recorded clip, played straight from Ring's storage.
  function clipView(id) {
    const s = st(id), url = s && s.attributes.video_url;
    if (!url) return;
    sheet(`<h2>${esc(camName(s))} · last recording</h2><div class="cam-view"><video src="${esc(url)}" autoplay playsinline controls></video></div>
      <div class="acts" style="grid-template-columns:1fr"><button class="btn" data-action="close">Close</button></div>`, true);
  }
  // ---------- Checks (14 Nov): batteries and offline devices — sensors, cameras, alarm, lights. Pool, jacuzzi, water
  // heater, TVs and Alexa extras are left out (they are often switched off on purpose).
  const HEALTH_SKIP = /pool|jacuzzi|dome|water heater|reverb|fire ?tv|firetv|65pus|next (alarm|reminder|timer)|do not disturb|scheduled soc|venus|rec-bms|multiplus|finca battery|wall tablet battery state/i;
  function healthData() {
    const states = Object.values(store.states);
    const devName = s => { const e = store.ents[s.entity_id]; const d = e && store.devices[e.device_id]; return (d && (d.name_by_user || d.name)) || nm(s); };
    const seen = new Set(), batteries = [];
    states.filter(s => s.attributes.device_class === "battery" && domainOf(s.entity_id) === "sensor" && !HEALTH_SKIP.test(nm(s) + " " + s.entity_id))
      .forEach(s => { const name = devName(s).trim(); if (seen.has(name)) return; seen.add(name);
        const v = parseFloat(s.state); batteries.push({ name, v: Number.isFinite(v) ? v : null, area: areaOf(s.entity_id) }); });
    batteries.sort((a, b) => (a.v === null ? -1 : a.v) - (b.v === null ? -1 : b.v));
    const offlineByDevice = new Map();
    states.filter(s => s.state === "unavailable" && ["sensor", "binary_sensor", "camera", "light", "switch", "alarm_control_panel", "siren", "lock"].includes(domainOf(s.entity_id)))
      .filter(s => !HEALTH_SKIP.test(nm(s) + " " + s.entity_id + " " + devName(s)) && !isHidden(s) && !["alexa_devices", "alexa_media", "mobile_app"].includes(platformOf(s.entity_id)))
      .forEach(s => { const name = devName(s).trim(); if (!offlineByDevice.has(name)) offlineByDevice.set(name, { name, area: areaOf(s.entity_id), since: s.last_changed }); });
    return { batteries, low: batteries.filter(b => b.v !== null && b.v <= 25), offline: [...offlineByDevice.values()].sort((a, b) => a.name.localeCompare(b.name)) };
  }
  // Home Assistant's own health (14 Nov): System Monitor readings; one tap switches the useful ones on.
  const SYS_WANTED = /memory_(use|usage)|processor_use|last_boot|disk_(use|usage).*(?<!free)$|load_?(1|5)/i;
  function sysHealthCard() {
    const reg = Object.values(store.ents).filter(e => e.platform === "systemmonitor" && SYS_WANTED.test(e.entity_id) && !/swap|ipv|network|packet|throughput/i.test(e.entity_id));
    if (!reg.length && store.mode !== "demo") return "";
    const off = reg.filter(e => e.disabled_by);
    const live = reg.filter(e => !e.disabled_by).map(e => st(e.entity_id)).filter(Boolean);
    const fmt = s => { const u = s.attributes.unit_of_measurement || ""; if (s.attributes.device_class === "timestamp") return ok(s) ? `${ago(s.state)}` : "—";
      return ok(s) ? `${Math.round(+s.state * 10) / 10}${u === "%" ? "%" : " " + u}` : "—"; };
    const warn = s => ok(s) && s.attributes.unit_of_measurement === "%" && +s.state >= 85;
    return `<article class="card"><div class="card-head"><span class="ico">${icon("gauge")}</span><div class="grow"><h3>Home Assistant health</h3><div class="row-sub">The computer it runs on (System Monitor)</div></div></div>
      ${live.map(s => `<div class="row"><div class="row-body"><div class="row-title">${esc(nm(s).replace(/^system monitor\\s*/i, ""))}</div></div><span class="pill ${warn(s) ? "warn" : "ok"}">${esc(fmt(s))}</span></div>`).join("")}
      ${off.length ? `<p class="note">${icon("info")}<span>${off.length} health reading${off.length === 1 ? " is" : "s are"} switched off.</span></p>
        <div class="acts" style="grid-template-columns:1fr;margin-top:10px"><button class="btn btn-primary" data-action="sys-enable">Switch on health readings</button></div>` : ""}
    </article>`;
  }
  async function enableSysHealth() {
    const off = Object.values(store.ents).filter(e => e.platform === "systemmonitor" && SYS_WANTED.test(e.entity_id) && !/swap|ipv|network|packet|throughput/i.test(e.entity_id) && e.disabled_by);
    let n = 0;
    for (const e of off) { try { const r = await store.conn.sendMessagePromise({ type: "config/entity_registry/update", entity_id: e.entity_id, disabled_by: null });
      store.ents[e.entity_id] = r.entity_entry || { ...e, disabled_by: null }; n++; } catch { /* skip */ } }
    toast(n ? `Switched on ${n} readings. They appear within a minute.` : "Couldn't switch them on"); lastHtml = ""; render(false);
  }
  // Automatic recovery (15 Nov): every Home Assistant app set to start on boot and to restart itself if it crashes.
  const APPS = [["core_mosquitto", "MQTT broker (Ring)"], ["03cabcc9_ring_mqtt", "Ring"], ["d5369777_music_assistant", "Music Assistant"],
    ["81bc2df9_ewelink_smart_home_for_homeassistant_slug", "eWeLink"], ["core_duckdns", "DuckDNS (home link)"], ["core_nginx_proxy", "NGINX (padlock link)"]];
  const rec = { at: 0, info: null, busy: false };
  async function loadRecovery(force) {
    if (store.mode === "demo" || rec.busy || (!force && Date.now() - rec.at < 120000)) return;
    rec.busy = true;
    try {
      const out = {};
      for (const [slug] of APPS) {
        try { const r = await store.conn.sendMessagePromise({ type: "supervisor/api", endpoint: `/addons/${slug}/info`, method: "get" }); out[slug] = r; } catch { out[slug] = null; }
      }
      rec.info = out; rec.at = Date.now(); lastHtml = ""; render(false);
    } finally { rec.busy = false; }
  }
  async function fixRecovery() {
    let n = 0;
    for (const [slug] of APPS) {
      try { await store.conn.sendMessagePromise({ type: "supervisor/api", endpoint: `/addons/${slug}/options`, method: "post", data: { boot: "auto", watchdog: true } }); n++; } catch { /* not installed or not allowed */ }
    }
    toast(n ? `Auto-start and self-restart switched on for ${n} apps` : "Couldn't change the app settings");
    loadRecovery(true);
  }
  function recoveryCard() {
    loadRecovery();
    if (!rec.info) return "";
    const rows = APPS.filter(([slug]) => rec.info[slug]).map(([slug, name]) => { const i = rec.info[slug]; const good = i.boot === "auto" && i.watchdog === true;
      return `<div class="row"><div class="row-body"><div class="row-title">${esc(name)}</div><div class="row-sub">${i.state === "started" ? "Running" : "Stopped"} · ${i.boot === "auto" ? "starts by itself" : "manual start"} · ${i.watchdog ? "restarts if it crashes" : "no self-restart"}</div></div><span class="pill ${good && i.state === "started" ? "ok" : "warn"}">${good ? "Auto" : "Check"}</span></div>`; });
    const allGood = APPS.every(([slug]) => !rec.info[slug] || (rec.info[slug].boot === "auto" && rec.info[slug].watchdog));
    return `<article class="card"><div class="card-head"><span class="ico">${icon("power")}</span><div class="grow"><h3>Automatic recovery</h3><div class="row-sub">After a power cut or a crash, these start again by themselves</div></div></div>
      ${rows.join("")}
      ${allGood ? "" : `<div class="acts" style="grid-template-columns:1fr;margin-top:10px"><button class="btn btn-primary" data-action="fix-recovery">Make all of them start and restart by themselves</button></div>`}
      <p class="note" style="margin-top:10px">${icon("info")}<span>A watchdog also checks music, speakers, lights, Ring, eWeLink, solar readings and Alexa every few minutes and restarts what has stopped; you only get a message if that doesn't work.</span></p>
    </article>`;
  }
  function viewHealth() {
    const h = healthData();
    const row = (title, sub, pill, warn) => `<div class="row"><div class="row-body"><div class="row-title">${esc(title)}</div><div class="row-sub">${sub}</div></div><span class="pill ${warn ? "warn" : "ok"}">${pill}</span></div>`;
    return `<section class="view">
      <div class="page-head"><div><h1>Checks</h1><p>${h.low.length} low batter${h.low.length === 1 ? "y" : "ies"} · ${h.offline.length} offline</p></div></div>
      <div class="grid g-2">
        <article class="card"><div class="card-head"><span class="ico">${icon("battery")}</span><div class="grow"><h3>Low batteries</h3><div class="row-sub">25 % or less</div></div></div>
          ${h.low.length ? h.low.map(b => row(b.name, esc(b.area || ""), `${Math.round(b.v)}%`, true)).join("") : '<p class="note">All batteries are fine.</p>'}</article>
        <article class="card"><div class="card-head"><span class="ico">${icon("wifi")}</span><div class="grow"><h3>Offline or unplugged</h3><div class="row-sub">Sensors, cameras, alarm and lights</div></div></div>
          ${h.offline.length ? h.offline.map(o => row(o.name, `${esc(o.area || "")}${o.area ? " · " : ""}since ${ago(o.since)}`, "Offline", true)).join("") : '<p class="note">Everything is online.</p>'}</article>
      </div>
      ${sysHealthCard()}
      ${recoveryCard()}
      ${(() => { const ctl = Object.values(store.ents).filter(e => e.platform === "victron_gx" && /^(switch|number|select|button)\./.test(e.entity_id));
        if (!ctl.length) return "";
        const locked = mem.get("victron.locked", false);
        return `<article class="card" style="margin-top:16px"><div class="card-head"><span class="ico">${icon("lock")}</span><div class="grow"><h3>Solar room: read-only for Jarvis</h3>
          <div class="row-sub">${ctl.length} Victron controls · Jarvis can read every reading but not change settings</div></div>
          <button class="btn btn-sm ${locked ? "" : "btn-primary"}" data-action="victron-lock">${locked ? "Lock again" : "Lock now"}</button></div></article>`; })()}
      <h2 class="section">All batteries</h2>
      <div class="card">${h.batteries.map(b => row(b.name, esc(b.area || ""), b.v === null ? "No reading" : `${Math.round(b.v)}%`, b.v === null || b.v <= 25)).join("")}</div>
      <p class="note">${icon("info")}<span>Pool, jacuzzi, water heater and TVs aren't listed: they're often switched off at the wall on purpose.</span></p>
    </section>`;
  }

  function moreSheet() {
    let p = $("#more-panel");
    if (p && p.classList.contains("open")) { closeMore(); return; }
    if (!p) { p = document.createElement("div"); p.id = "more-panel"; p.className = "more-panel"; document.body.appendChild(p); }
    const cur = current();
    p.innerHTML = `<div class="more-grid">${NAV.filter(n => n.rail).map(n => `<a href="#${n.id}" data-action="close-more" ${n.id === cur ? 'aria-current="page"' : ""}>${icon(n.icon)}<span>${n.label}</span></a>`).join("")}
        <a href="#more" data-action="share-app">${icon("share")}<span>Share app</span></a></div>`;
    requestAnimationFrame(() => p.classList.add("open")); document.body.classList.add("more-open");
    const ml = document.querySelector(".more-link"); if (ml) ml.setAttribute("aria-expanded", "true");
  }
  function closeMore() {
    const p = $("#more-panel"); if (p) p.classList.remove("open"); document.body.classList.remove("more-open");
    const ml = document.querySelector(".more-link"); if (ml) ml.setAttribute("aria-expanded", "false");
  }
  document.addEventListener("click", ev => {
    const p = $("#more-panel"); if (!p || !p.classList.contains("open")) return;
    if (ev.target.closest("#more-panel a")) { setTimeout(closeMore, 50); return; }
    if (!ev.target.closest("#more-panel") && !ev.target.closest(".more-link")) closeMore();
  }, true);
  window.addEventListener("hashchange", closeMore);
  const SHARE_URL = "https://fincaottero.duckdns.org/local/finca-ottero/index.html";
  async function shareApp() {
    try { if (navigator.share) { await navigator.share({ title: "Finca Ottero", text: "Finca Ottero home app (home Wi-Fi). Open it, sign in, then Add to Home Screen.", url: SHARE_URL }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(SHARE_URL); toast("Link copied. Paste it into a message."); } catch { toast(SHARE_URL); }
  }

  // ---------- Jarvis ----------
  const J = { log: [], convId: null, listening: null, audio: null };
  const silentWav = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
  function jarvisPipeline() {
    return store.pipelines.find(x => C.jarvis.pipelineName.test(x.name)) || store.pipelines.find(x => x.id === store.preferredPipeline) || null;
  }
  // Builds an assist_pipeline/run message; leaves out empty fields and only asks for speech when the pipeline has a voice.
  function pipelineMsg(start, reply, input) {
    const pl = jarvisPipeline();
    const msg = { type: "assist_pipeline/run", start_stage: start, end_stage: reply === "device" && pl && pl.tts_engine ? "tts" : "intent", input };
    if (pl) msg.pipeline = pl.id;
    if (J.convId) msg.conversation_id = J.convId;
    return msg;
  }
  function speakers() { return all("media_player").filter(s => platformOf(s.entity_id) === "sonos" || /sonos/i.test(nm(s))); }
  function openJarvis() {
    const reply = mem.get("jarvis.reply", "device");
    sheet(`<div class="jarvis">
      <div class="card-head" style="margin:0"><span class="ico">${icon("mic")}</span><div class="grow"><h3 style="font-family:var(--font-display);letter-spacing:.2em">JARVIS</h3><div class="row-sub">House manager</div></div>
        <button class="btn btn-sm btn-ghost" data-action="close" aria-label="Close Jarvis">Close</button></div>
      <div class="jarvis-log" id="jlog" aria-live="polite"></div>
      <div class="suggest">${C.jarvis.suggestions.map(q => `<button data-ask="${esc(q)}">${esc(q)}</button>`).join("")}</div>
      <form class="jarvis-input" id="jform"><input id="jtext" type="text" autocomplete="off" placeholder="Ask Jarvis…" aria-label="Message for Jarvis" enterkeyhint="send">
        <button type="button" class="mic" id="jmic" aria-label="Speak to Jarvis">${icon("mic")}</button></form>
      <div class="jarvis-opts"><label for="jreply">Reply through</label><select class="sel" id="jreply">
        <option value="device">This device</option>${speakers().map(s => `<option value="${s.entity_id}" ${reply === s.entity_id ? "selected" : ""}>${esc(nm(s))}</option>`).join("")}
        <option value="none" ${reply === "none" ? "selected" : ""}>Text only</option></select></div>
    </div>`, true);
    if (reply === "device") $("#jreply").value = "device";
    drawLog();
    if (!J.log.length) addMsg("j", `${greeting()}. How can I help?`);
  }
  function drawLog() {
    const el = $("#jlog"); if (!el) return;
    el.innerHTML = J.log.map(m => `<div class="msg ${m.who}">${m.who === "j" ? "<b>JARVIS</b>" : ""}${esc(m.text)}</div>`).join("");
    el.scrollTop = el.scrollHeight;
  }
  function addMsg(who, text) { J.log.push({ who, text }); drawLog(); }
  function primeAudio() { if (!J.audio) { J.audio = new Audio(); } J.audio.src = silentWav; J.audio.play().catch(() => {}); }
  async function deliver(speech, ttsUrl) {
    addMsg("j", speech || "I'm afraid I have no answer for that.");
    const reply = $("#jreply") ? $("#jreply").value : "device";
    if (reply === "device" && ttsUrl && J.audio) { J.audio.src = /^https?:/.test(ttsUrl) ? ttsUrl : store.hassUrl + ttsUrl; J.audio.play().catch(() => {}); }
    else if (reply !== "device" && reply !== "none" && speech && store.mode === "live") {
      try { await svc("script", "turn_on", { variables: { message: speech, speaker: reply } }, { entity_id: C.jarvis.sayScript }); } catch { /* toast shown */ }
    }
  }
  function runPipeline(msg, handlers) {
    return new Promise((resolve) => {
      let unsub = null, done = false;
      const finish = () => { if (done) return; done = true; if (unsub) unsub(); resolve(); };
      store.conn.subscribeMessage(ev => {
        handlers(ev);
        if (ev.type === "run-end" || ev.type === "error") finish();
      }, msg).then(u => { unsub = u; if (done) u(); }).catch(e => { addMsg("sys", `Jarvis isn't available: ${e.message || e.code}`); finish(); });
    });
  }
  async function ask(text) {
    if (!text.trim()) return;
    primeAudio();
    addMsg("me", text);
    if (store.mode === "demo") { await deliver(Demo.jarvis(text)); return; }
    const reply = $("#jreply").value;
    let speech = "", url = "";
    await runPipeline(pipelineMsg("intent", reply, { text }), ev => {
      if (ev.type === "intent-end") { const o = ev.data.intent_output; speech = o.response.speech.plain.speech; J.convId = o.conversation_id; }
      if (ev.type === "tts-end") url = ev.data.tts_output.url;
      if (ev.type === "error" && !speech) speech = `Something went wrong: ${ev.data.message}`;
    });
    await deliver(speech, url);
  }
  // ---------- kiosk: inside the Home Assistant app, hide its sidebar and title bar (wall tablet) ----------
  // Same-origin page, so the parent's (shadow) DOM can be styled — what free kiosk add-ons do. Re-applied every 2 s
  // because Home Assistant redraws. Tap the Finca Ottero logo 3 times quickly to show/hide them again.
  const KIOSK_CSS = {
    main: "ha-sidebar{display:none!important} ha-drawer{--mdc-drawer-width:0px!important;--sidebar-width:0px!important;--ha-sidebar-width:0px!important} :host{--app-drawer-width:0px!important}",
    root: ".header,.toolbar,app-header,ha-top-app-bar-fixed{display:none!important} #view,hui-view-container{padding-top:0!important;margin-top:0!important;min-height:100vh!important;height:100vh!important}",
  };
  function kiosk(on) {
    clearInterval(kiosk.t);
    const put = (root, key) => {
      if (!root) return;
      let el = root.querySelector("style[data-finca-kiosk]");
      if (on && !el) { el = root.ownerDocument.createElement("style"); el.dataset.fincaKiosk = "1"; el.textContent = KIOSK_CSS[key]; root.appendChild(el); }
      if (!on && el) el.remove();
    };
    const apply = () => {
      try {
        const ha = window.parent.document.querySelector("home-assistant");
        const main = ha && ha.shadowRoot && ha.shadowRoot.querySelector("home-assistant-main");
        const mr = main && main.shadowRoot; put(mr, "main");
        const drawer = mr && mr.querySelector("ha-drawer"); if (drawer && drawer.shadowRoot) put(drawer.shadowRoot, "main");
        const panel = mr && mr.querySelector("partial-panel-resolver ha-panel-lovelace");
        const huiRoot = panel && panel.shadowRoot && panel.shadowRoot.querySelector("hui-root");
        put(huiRoot && huiRoot.shadowRoot, "root");
      } catch { /* not inside Home Assistant */ }
    };
    apply(); if (on) kiosk.t = setInterval(apply, 2000);
  }
  let logoTaps = [];
  document.addEventListener("click", ev => {
    if (!store.parentHass || !ev.target.closest(".brand")) return;
    const now = Date.now(); logoTaps = logoTaps.filter(t => now - t < 1200).concat(now);
    if (logoTaps.length >= 3) { logoTaps = []; const on = !mem.get("kiosk", true); mem.set("kiosk", on); kiosk(on); toast(on ? "Wall mode: Home Assistant menu hidden" : "Home Assistant menu shown — tap the logo 3 times to hide it again"); }
  });

  // Inside the Home Assistant app the page has no microphone of its own (plain http), but the app does: hand voice to
  // its built-in Assist, listening straight away, on the Jarvis pipeline.
  function nativeAssist() {
    const ext = store.parentHass && store.parentHass.auth && store.parentHass.auth.external;
    if (!ext || !ext.config || !ext.config.hasAssist) return false;
    const jarvis = (store.pipelines || []).find(p => /jarvis/i.test(p.name));
    try { ext.fireMessage({ type: "assist/show", payload: { pipeline_id: (jarvis && jarvis.id) || store.preferredPipeline || undefined, start_listening: true } }); return true; } catch { return false; }
  }
  async function listen() {
    if (J.listening) { J.listening.stop(); return; }
    if (nativeAssist()) { closeLayer(); return; }
    primeAudio();
    if (store.mode === "demo") { addMsg("sys", "Voice works when the app is connected to Home Assistant. Type a question to try the demo."); return; }
    if (!window.isSecureContext || !navigator.mediaDevices) {
      addMsg("sys", "Voice isn't available on the home link (the iPhone, iPad and Android only allow the microphone on a secure link). To talk to Jarvis, open the Home Assistant app — it opens on this Finca page and its Jarvis button listens. Or type here, or use the microphone on your keyboard to dictate.");
      $("#jtext").focus(); return;
    }
    // Keep the microphone for 2 minutes after each use, so iPhone/iPad ask permission once per session, not every tap.
    clearTimeout(J.micRelease);
    let stream = J.mic && J.mic.getTracks().some(t => t.readyState === "live") ? J.mic : null;
    if (!stream) {
      try { stream = J.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
      catch { addMsg("sys", "Microphone permission was declined."); return; }
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    let handler = null;
    const ratio = ctx.sampleRate / 16000;
    const stop = () => {
      if (!J.listening) return;
      J.listening = null; $("#jmic") && $("#jmic").classList.remove("listening");
      proc.disconnect(); src.disconnect(); ctx.close();
      J.micRelease = setTimeout(() => { if (J.mic && !J.listening) { J.mic.getTracks().forEach(t => t.stop()); J.mic = null; } }, 120000);
      if (handler !== null) store.conn.socket.send(new Uint8Array([handler]));
      handler = null;  // nothing more may be sent for this run (stray audio caused "non-existing handler" errors)
    };
    J.listening = { stop };
    $("#jmic").classList.add("listening");
    proc.onaudioprocess = e => {
      if (handler === null || !J.listening) return;
      const inp = e.inputBuffer.getChannelData(0), n = Math.floor(inp.length / ratio);
      const out = new Uint8Array(1 + n * 2); out[0] = handler;
      const dv = new DataView(out.buffer);
      for (let i = 0; i < n; i++) { const v = Math.max(-1, Math.min(1, inp[Math.floor(i * ratio)])); dv.setInt16(1 + i * 2, v * 0x7fff, true); }
      store.conn.socket.send(out);
    };
    src.connect(proc); proc.connect(ctx.destination);
    const reply = $("#jreply").value;
    let speech = "", url = "";
    await runPipeline(pipelineMsg("stt", reply, { sample_rate: 16000 }), ev => {
      if (ev.type === "run-start") handler = ev.data.runner_data.stt_binary_handler_id;
      if (ev.type === "stt-vad-end") stop();
      if (ev.type === "stt-end") addMsg("me", ev.data.stt_output.text);
      if (ev.type === "intent-end") { const o = ev.data.intent_output; speech = o.response.speech.plain.speech; J.convId = o.conversation_id; }
      if (ev.type === "tts-end") url = ev.data.tts_output.url;
      if (ev.type === "error") { stop(); if (!speech) speech = ev.data.code === "stt-no-text-recognized" ? "Sorry, I didn't catch that." : `Something went wrong: ${ev.data.message}`; }
    });
    stop();
    await deliver(speech, url);
  }

  // ---------- events ----------
  document.addEventListener("click", ev => {
    const t = ev.target.closest("[data-toggle],[data-action],[data-area],[data-temp],[data-hvac],[data-fan],[data-ac],[data-acquick],[data-acstep],[data-media],[data-shuffle],[data-repeat],[data-live],[data-clip],[data-colour],[data-ask],[data-askgo],[data-upd-now],[data-upd-later],[data-upd-skip],#jmic");
    if (!t) return;
    const d = t.dataset;
    try { recordUse(usageKey(d, t)); } catch { /* never block the button */ }
    if (t.id === "jmic") { listen(); return; }
    if (d.ask) { ask(d.ask); return; }
    if (d.askgo) { location.hash = "#jarvis"; setTimeout(() => ask(d.askgo), 400); return; }
    if (d.updNow) { svc("script", "turn_on", { variables: { entity: d.updNow } }, { entity_id: "script.finca_install_update" }).then(() => toast("Backing up, then updating. You'll get a message when it's checked.")).catch(() => {}); laterUpdates.add(d.updNow + ((st(d.updNow) || {}).attributes || {}).latest_version); updateBubble(); return; }
    if (d.updLater) { laterUpdates.add(d.updLater); updateBubble(); toast("OK, I'll ask again next time the app opens."); return; }
    if (d.updSkip) { svc("update", "skip", {}, { entity_id: d.updSkip }).then(() => toast("Ignored. You'll hear about the next version.")).catch(() => {}); return; }
    if (d.toggle) {
      ev.preventDefault();
      const s = st(d.toggle); if (!s || s.state === "unavailable") return;  // "unknown" (never used yet) counts as off
      if (MODE_WATCH[d.toggle]) {
        if (modeIsBusy(d.toggle)) return;   // already on its way: ignore extra taps
        const to = s.state === "on" ? "off" : "on"; modeBusy[d.toggle] = { to, at: Date.now() }; markModes();
        toast(`${MODE_WATCH[d.toggle].name} ${to === "on" ? "starting" : "ending"}…`);
      }
      svc(domainOf(d.toggle), s.state === "on" || (domainOf(d.toggle) === "climate" && s.state !== "off") ? "turn_off" : "turn_on", {}, { entity_id: d.toggle });
      return;
    }
    if (d.area) { const ids = d.area.split(","); const on = t.getAttribute("aria-checked") === "true"; svc("light", on ? "turn_off" : "turn_on", {}, { entity_id: ids }); return; }
    if (d.temp) { const s = st(d.temp); svc("climate", "set_temperature", { temperature: Math.round((s.attributes.temperature + parseFloat(d.delta)) * 10) / 10 }, { entity_id: d.temp }); return; }
    if (d.hvac) { svc("climate", "set_hvac_mode", { hvac_mode: d.mode }, { entity_id: d.hvac }); return; }
    if (d.fan) { svc("climate", "set_fan_mode", { fan_mode: d.mode }, { entity_id: d.fan }); return; }
    if (d.acquick) {
      const u = C.alexaAC.find(x => x.id === d.acquick);
      const run = async () => {
        for (const [cmd, val] of [["mode", d.mode], ["temp", "23"], ["on", ""]]) {
          await svc("script", "turn_on", { variables: { unit: u.id, command: cmd, value: val } }, { entity_id: "script.finca_ac_command" });
          await new Promise(r => setTimeout(r, 5000));
        }
      };
      toast(`Asking Alexa to ${d.mode} the ${u.name.toLowerCase()} to 23 °C…`);
      run().then(() => { mem.set("ac." + u.id + ".last", { at: new Date().toISOString(), phrase: `${d.mode} to 23 degrees` }); toast(`${u.name}: ${d.mode} to 23 °C sent. Power check in 3½ minutes.`); render(false); }).catch(() => {});
      return;
    }
    if (d.acstep) { const k = "ac." + d.acstep + ".t"; mem.set(k, Math.max(16, Math.min(30, mem.get(k, 22) + parseInt(d.delta, 10)))); render(false); return; }
    if (d.ac) {
      const u = C.alexaAC.find(x => x.id === d.ac);
      svc("script", "turn_on", { variables: { unit: d.ac, command: d.cmd, value: d.val || "" } }, { entity_id: "script.finca_ac_command" }).then(() => {
        const phrase = { on: `turn on ${u.alexaName}`, off: `turn off ${u.alexaName}`, temp: `set ${u.alexaName} to ${d.val} degrees`, mode: `set ${u.alexaName} to ${d.val} mode`, fan: `set ${u.alexaName} fan speed to ${d.val}` }[d.cmd];
        mem.set("ac." + d.ac + ".last", { at: new Date().toISOString(), phrase });
        toast(`Sent to Alexa: “${phrase}”`); render(false);
      }).catch(() => {});
      return;
    }
    if (d.media) { svc("media_player", d.cmd, {}, { entity_id: d.media }); return; }
    if (d.shuffle) { svc("media_player", "shuffle_set", { shuffle: t.getAttribute("aria-pressed") !== "true" }, { entity_id: d.shuffle }); return; }
    if (d.repeat) { const nx = { off: "all", all: "one", one: "off" }[d.now] || "all"; svc("media_player", "repeat_set", { repeat: nx }, { entity_id: d.repeat }).then(() => toast(nx === "off" ? "Repeat off" : nx === "one" ? "Repeat this song" : "Repeat all")); return; }
    if (d.live) { liveView(d.live); return; }
    if (d.clip) { clipView(d.clip); return; }
    if (d.colour) { colourSheet(d.colour); return; }
    const a = d.action;
    if (a === "gate") { ev.preventDefault(); gateSheet(); }
    else if (a === "gate-go") { closeLayer(); openGate(); }
    else if (a === "weather") { ev.preventDefault(); wx.sheet = true; sheet(weatherCard(true) || '<p>Loading the forecast…</p>', true); }
    else if (a === "intruder-test") {
      sheet(`<span class="ico big-ico" style="--tint:var(--coral)">${icon("siren")}</span><h2>Test the intruder warning?</h2>
        <p>Plays the Spanish warning twice on every Sonos speaker at low volume (25 %) and turns every colour light bright red (white lights off) for about 20 seconds, then puts speakers and lights back exactly as they were.</p>
        <div class="acts"><button class="btn" data-action="close" id="sheet-cancel">Cancel</button><button class="btn btn-primary" data-action="intruder-test-go">Play test</button></div>`);
      $("#sheet-cancel").focus();
    }
    else if (a === "intruder-test-go") { closeLayer(); svc("script", "turn_on", { variables: { repeats: 2, volume: 0.25, lights: true } }, { entity_id: "script.finca_intruder_warning" }).then(() => toast(store.mode === "demo" ? "Demo only. Nothing was played." : "Test playing on the Sonos speakers.")).catch(() => {}); }
    else if (a === "intruder-stop") { svc("script", "turn_on", {}, { entity_id: "script.finca_intruder_stop" }).then(() => toast("Stopping. Speakers and lights go back to how they were.")).catch(() => {}); }
    else if (a === "scan") scanDevices(true);
    else if (a === "all-off") allOffSheet();
    else if (a === "all-off-go") { closeLayer(); svc("light", "turn_off", {}, { entity_id: realLights().filter(s => s.state === "on").map(s => s.entity_id) }); }
    else if (a === "victron-lock") {
      // hide every Victron control (switch/number/select/button) from Assist so Jarvis can't change them; sensors stay visible
      const ids = Object.values(store.ents).filter(e => e.platform === "victron_gx" && /^(switch|number|select|button)\./.test(e.entity_id)).map(e => e.entity_id);
      if (store.mode === "demo") { toast("Demo only."); return; }
      store.conn.sendMessagePromise({ type: "homeassistant/expose_entity", assistants: ["conversation"], entity_ids: ids, should_expose: false })
        .then(() => { mem.set("victron.locked", true); toast(`Done: ${ids.length} solar room controls hidden from Jarvis.`); lastHtml = ""; render(false); })
        .catch(e => toast(`Home Assistant refused that: ${e.message || e.code}`));
    }
    else if (a === "more") { ev.preventDefault(); moreSheet(); }
    else if (a === "share-app") { ev.preventDefault(); shareApp(); }
    else if (a === "sys-enable") { ev.preventDefault(); enableSysHealth(); }
    else if (a === "fix-recovery") { ev.preventDefault(); fixRecovery(); }
    else if (a === "close-nav") closeLayer();
    else if (a === "close") { if (ev.target === t || t.tagName === "BUTTON") { closeLayer(); if (location.hash === "#jarvis") history.replaceState(null, "", "#home"); renderNav(current()); } }
  });
  async function updateDevice(id, changes, done) {
    try {
      if (store.mode === "demo") Object.assign(store.devices[id], changes);
      else { const d = await store.conn.sendMessagePromise({ type: "config/device_registry/update", device_id: id, ...changes }); store.devices[id] = d; }
      toast(done); lastHtml = ""; render(false);
    } catch (e) { toast(`Home Assistant refused that: ${e.message || e.code}`); }
  }
  document.addEventListener("submit", ev => {
    const f = ev.target.closest("[data-rename]");
    if (f) { ev.preventDefault(); const v = f.querySelector("input").value.trim(); if (v) updateDevice(f.dataset.rename, { name_by_user: v }, `Renamed to ${v}`); return; }
  });
  document.addEventListener("submit", ev => {
    if (ev.target.id !== "music-search") return;
    ev.preventDefault();
    const q = $("#music-q").value.trim(); $("#music-q").blur(); msSearch(q);
  });
  document.addEventListener("click", ev => {
    const lb = ev.target.closest("[data-libi]");
    if (lb) { const x = (ms.libRows || [])[+lb.dataset.libi]; if (!x) return; ms.sel = ms.sel && ms.sel.uri === x.uri ? null : x; lastHtml = ""; render(false); return; }
    const r = ev.target.closest("[data-msi]");
    if (r) { const x = (ms.rows || [])[+r.dataset.msi]; if (!x) return; ms.sel = ms.sel && ms.sel.uri === x.uri ? null : x; lastHtml = ""; render(false); return; }
    if (!ev.target.closest("[data-msplay]")) return;
    const typed = ($("#music-q") || {}).value; if (typed !== undefined && typed.trim() !== ms.q) { ms.q = typed.trim(); ms.sel = null; }
    const pick = ms.sel, q = pick ? pick.name : ms.q; if (!q) { toast("Search for something first"); $("#music-q") && $("#music-q").focus(); return; }
    const where = [...document.querySelectorAll('#music-where [data-spk][aria-pressed="true"]')].map(b => b.dataset.spk);
    if (!where.length) { toast("Pick at least one speaker first"); return; }
    mem.set("music.speakers", where.join(","));
    // Several speakers: join the Sonos ones into one group (in sync), the TV just plays alongside.
    // Only speakers that support grouping in Music Assistant can be joined (the bedroom DLNA renderers and the TV can't).
    const sonos = where.filter(e => ((store.states[e] || {}).attributes || {}).supported_features & 524288), lead = sonos[0] || where[0];
    const others = where.filter(e => e !== lead && !sonos.includes(e));
    // First drop any speaker left in the lead's group from last time that isn't picked now.
    const stale = (((store.states[lead] || {}).attributes || {}).group_members || []).filter(e => e !== lead && !where.includes(e));
    const group = Promise.all(stale.map(e => svc("media_player", "unjoin", {}, { entity_id: e }).catch(() => null)))
      .then(() => sonos.length > 1 ? svc("media_player", "join", { group_members: sonos.slice(1) }, { entity_id: lead }).catch(() => null) : null);
    const targets = sonos.length > 1 ? [lead, ...others] : where;
    const data = pick ? { media_id: pick.uri, media_type: pick.media_type || ({ Artist: "artist", Album: "album", Playlist: "playlist", Song: "track" })[pick.kind], enqueue: "replace", radio_mode: pick.kind === "Song" || pick.kind === "Artist" }
                      : { media_id: q, enqueue: "replace", radio_mode: true };
    setPlay("busy");
    group.then(() => svc("music_assistant", "play_media", data, { entity_id: targets }))
      .then(() => pick && /^liked songs/i.test(pick.name) ? svc("media_player", "shuffle_set", { shuffle: true }, { entity_id: targets[0] }).catch(() => null) : null)
      .then(() => { setPlay("ok", 3000); toast(`Playing ${q}${where.length > 1 ? ` on ${where.length} speakers` : ""}`); })
      .catch(() => { setPlay("fail", 3500); toast(`Couldn't play "${q}". Spotify may be busy; try again in a minute.`); });
  });
  document.addEventListener("click", ev => {
    const f = ev.target.closest("[data-favgo]"); if (!f) return;
    const sel = $("#fav-sel"); if (!sel || !sel.value) { toast("Choose a station first"); return; }
    const picked = [...document.querySelectorAll('#music-where [data-spk][aria-pressed="true"]')].map(b => SONOS_OF[b.dataset.spk]).filter(Boolean);
    if (!picked.length) { toast("Pick at least one Sonos speaker above first"); return; }
    const lead = picked[0], fav = sel.value;
    const stale = ((st(lead) || { attributes: {} }).attributes.group_members || []).filter(e => e !== lead && !picked.includes(e));
    Promise.all(stale.map(e => svc("media_player", "unjoin", {}, { entity_id: e }).catch(() => null)))
      .then(() => picked.length > 1 ? svc("media_player", "join", { group_members: picked.slice(1) }, { entity_id: lead }).catch(() => null) : null)
      .then(() => svc("media_player", "select_source", { source: fav }, { entity_id: lead }))
      .then(() => toast(`Playing ${fav}${picked.length > 1 ? ` on ${picked.length} speakers` : ""}`)).catch(() => null);
  });
  document.addEventListener("click", ev => {
    const b = ev.target.closest("#music-where [data-spk], #music-where [data-spk-all]"); if (!b) return;
    const btns = [...document.querySelectorAll("#music-where [data-spk]")];
    if (b.dataset.spkAll) { const allOn = btns.every(x => x.getAttribute("aria-pressed") === "true"); btns.forEach(x => x.setAttribute("aria-pressed", String(!allOn))); }
    else b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
    mem.set("music.speakers", btns.filter(x => x.getAttribute("aria-pressed") === "true").map(x => x.dataset.spk).join(","));
    liveRegroup(b.dataset.spkAll ? btns : [b]);
  });
  // Music already playing (15 Nov): tapping a speaker on joins it to what's playing straight away; tapping off takes it out.
  function liveRegroup(changed) {
    // Uses the Sonos speakers themselves for grouping (Music Assistant's copy can show "paused" while the Sonos is playing).
    const sonosOf = e => SONOS_OF[e] || e;
    const playing = e => { const a = st(e), b = st(sonosOf(e)); return (a && a.state === "playing") || (b && b.state === "playing"); };
    const ma = [...document.querySelectorAll("#music-where [data-spk]")].map(x => x.dataset.spk);
    const leadMa = ma.filter(playing).sort((a, b) => (((st(sonosOf(b)) || {}).attributes || {}).group_members || []).length - (((st(sonosOf(a)) || {}).attributes || {}).group_members || []).length)[0];
    if (!leadMa) return;   // nothing playing: the selection just waits for Play
    const lead = sonosOf(leadMa), members = ((st(lead) || {}).attributes || {}).group_members || [lead];
    const add = [], drop = [], s1add = [], s1drop = [];
    const S1 = ["media_player.bedroom_bedroom", "media_player.bedroom_2_bedroom_2"];   // Sonos S1: a separate system, can't join S2 groups
    changed.forEach(x => {
      const e = sonosOf(x.dataset.spk), on = x.getAttribute("aria-pressed") === "true";
      if (e === lead || !st(e)) return;
      if (S1.includes(e)) { (on ? s1add : s1drop).push(x.dataset.spk); return; }
      if (on && !members.includes(e)) add.push(e);
      if (!on && members.includes(e)) drop.push(e);
    });
    // S1 bedrooms: start the same song there through Music Assistant (then similar music), roughly in time, not perfectly synced
    const leadState = st(leadMa) || {}, now = (leadState.attributes || {}).media_content_id;
    if (s1add.length && now) svc("music_assistant", "play_media", { media_id: now, enqueue: "replace", radio_mode: true }, { entity_id: s1add })
      .then(() => toast(`${s1add.map(nmOf).join(" and ")} playing too (separate Sonos S1 system)`)).catch(() => null);
    if (s1drop.length) svc("media_player", "media_pause", {}, { entity_id: s1drop }).catch(() => null);
    if (add.length) svc("media_player", "join", { group_members: [...new Set(add)] }, { entity_id: lead })
      .then(() => toast(add.length === 1 ? `${nmOf(add[0])} joined the music` : `${add.length} speakers joined the music`)).catch(() => null);
    if (drop.length) svc("media_player", "unjoin", {}, { entity_id: drop }).then(() => toast(drop.length === 1 ? `${nmOf(drop[0])} left the music` : `${drop.length} speakers left the music`)).catch(() => null);
  }
  const nmOf = e => /^media_player\.tv_room(_tv_room)?$/.test(e) ? "Living room" : (st(e) ? nm(st(e)).replace(/ - Sonos.*$/, "") : e);
  document.addEventListener("submit", ev => { if (ev.target.id === "jform") { ev.preventDefault(); const i = $("#jtext"); const v = i.value; i.value = ""; ask(v); } });
  document.addEventListener("change", ev => {
    const t = ev.target;
    if (t.dataset.bri) svc("light", "turn_on", { brightness_pct: +t.value }, { entity_id: t.dataset.bri.split(",") });
    if (t.dataset.seek) { np.drag = false; svc("media_player", "media_seek", { seek_position: +t.value }, { entity_id: t.dataset.seek }); }
    if (t.dataset.vol) setVolumeSafely(t);
    if (t.id === "jreply") mem.set("jarvis.reply", t.value);
    if (t.dataset.roomFor) updateDevice(t.dataset.roomFor, { area_id: t.value || null }, t.value ? `Moved to ${(store.areas[t.value] || {}).name || "room"}` : "Removed from its room");
    if (pending) setTimeout(() => render(false), 50);
  });
  document.addEventListener("input", ev => {
    const t = ev.target; if (t.type !== "range") return;
    t.style.setProperty("--val", t.value + "%");
    const v = t.parentElement.querySelector(".v"); if (v) v.textContent = t.value + "%";
  });
  document.addEventListener("keydown", ev => { if (ev.key === "Escape") closeLayer(); });
  window.addEventListener("hashchange", () => {
    if (location.hash === "#jarvis") { renderNav("jarvis"); openJarvis(); return; }
    if (location.hash === "#more") return;
    closeLayer(); render(true);
  });
  // Self-heal (14 Nov): a phone holding an old start page keeps loading old versions. If this page didn't come
  // through the version.txt loader, fetch a fresh start page into the cache once and reload.
  try { if (!/\(home\)/.test(window.FINCA_VERSION || "") && !sessionStorage.getItem("finca.healed") && /^https?:/.test(location.protocol)) {
    sessionStorage.setItem("finca.healed", "1");
    fetch("index.html", { cache: "reload" }).then(r => r.text()).then(t => { if (/version\.txt/.test(t)) { localStorage.removeItem("finca.sha"); location.reload(); } }).catch(() => {});
  } } catch { /* storage unavailable */ }
  { const fab = $("#jarvis-fab"); if (fab && !fab.querySelector("svg.hud")) fab.innerHTML = `<svg class="hud" viewBox="0 0 100 100" aria-hidden="true">
  <defs>
    <radialGradient id="jcore" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#1b4fd8"/><stop offset=".55" stop-color="#0b1f6e"/><stop offset="1" stop-color="#040b2c"/></radialGradient>
    <radialGradient id="jglow" cx="50%" cy="50%" r="50%"><stop offset=".55" stop-color="#5fd4ff" stop-opacity="0"/><stop offset=".8" stop-color="#5fd4ff" stop-opacity=".55"/><stop offset="1" stop-color="#5fd4ff" stop-opacity="0"/></radialGradient>
  </defs>
  <circle cx="50" cy="50" r="49" fill="url(#jglow)"/>
  <g class="ring r1"><circle cx="50" cy="50" r="45" fill="none" stroke="#7fdcff" stroke-width="1.2" stroke-dasharray="18 6 4 6" opacity=".9"/></g>
  <g class="ring r2"><circle cx="50" cy="50" r="40.5" fill="none" stroke="#3ab8ff" stroke-width="3" stroke-dasharray="2 3.2" opacity=".75"/></g>
  <g class="ring r3"><circle cx="50" cy="50" r="36" fill="none" stroke="#9fe8ff" stroke-width="1.4" stroke-dasharray="40 10 12 10" opacity=".85"/></g>
  <circle cx="50" cy="50" r="32" fill="url(#jcore)" stroke="#6fd7ff" stroke-width="1.2"/>
  <circle class="spark" cx="40" cy="38" r="14" fill="#7fdcff" opacity=".18"/>
  <text x="50" y="54.5" text-anchor="middle" class="jlabel">JARVIS</text>
</svg>`; }
  $("#jarvis-fab").addEventListener("click", () => { primeAudio(); if (!nativeAssist()) openJarvis(); });

  // ---------- connection ----------
  async function connectLive(hassUrl) {
    store.mode = "live"; store.hassUrl = hassUrl;
    // The sign-in round trip drops the page name (#security etc.); remember it and put it back.
    try { if (location.hash && !location.search.includes("auth_callback")) sessionStorage.setItem("finca.hash", location.hash); } catch { /* storage unavailable */ }
    const H = window.HAWS;
    // Shown inside the Home Assistant app (a "Webpage" dashboard, e.g. on the wall tablet): borrow its sign-in and
    // connection — a second sign-in inside the embedded page is refused ("Invalid redirect URI").
    const parentHass = (() => { try { if (window.parent === window) return null; const el = window.parent.document.querySelector("home-assistant"); return el && el.hass && el.hass.connection ? el.hass : null; } catch { return null; } })();
    if (parentHass) {
      store.parentHass = parentHass;
      // On the wall tablet (landscape) the Home Assistant sidebar took a third of the screen: keep it hidden; the ☰ in the
      // title bar still opens it.
      kiosk(mem.get("kiosk", true));
      await startWith(parentHass.connection); return;
    }
    let auth;
    try {
      auth = await H.getAuth({
        hassUrl,
        saveTokens: t => mem.set("tokens", t),
        loadTokens: () => Promise.resolve(mem.get("tokens", null))
      });
    } catch (e) {
      $("#main").innerHTML = `<div class="login card"><h1 style="margin:0;font-size:22px">Sign in needed</h1><p class="note">Home Assistant didn't accept the sign-in (code ${esc(e)}). Try again.</p><button class="btn btn-primary" onclick="localStorage.removeItem('finca.tokens');location.reload()">Sign in with Home Assistant</button></div>`;
      return;
    }
    if (location.search.includes("auth_callback")) {
      let h = location.hash; try { h = h || sessionStorage.getItem("finca.hash") || ""; sessionStorage.removeItem("finca.hash"); } catch { /* storage unavailable */ }
      history.replaceState(null, "", location.pathname + h);
    }
    await startWith(await H.createConnection({ auth }));
  }
  async function startWith(conn) {
    const H = window.HAWS;
    store.conn = conn; store.online = true;
    conn.addEventListener("ready", () => { store.online = true; scheduleRender(); });
    conn.addEventListener("disconnected", () => { store.online = false; scheduleRender(); });
    const reg = async (type, key) => { try { return await conn.sendMessagePromise({ type }); } catch { return []; } };
    const [areas, devices, ents] = await Promise.all([reg("config/area_registry/list"), reg("config/device_registry/list"), reg("config/entity_registry/list")]);
    areas.forEach(a => { store.areas[a.area_id] = a; });
    devices.forEach(d => { store.devices[d.id] = d; });
    ents.forEach(e => { store.ents[e.entity_id] = e; });
    try { const p = await conn.sendMessagePromise({ type: "assist_pipeline/pipeline/list" }); store.pipelines = p.pipelines; store.preferredPipeline = p.preferred_pipeline; } catch { /* Assist not set up */ }
    let booted = false;
    H.subscribeEntities(conn, ents2 => { store.states = ents2; scheduleRender(); if (!booted) { booted = true; setTimeout(jarvisBoot, 400); } });
  }

  // "System at work" background layer (15 Nov): drawn once, animated by CSS only (cheap for the phone).
  (function hudBackground() {
    if (document.getElementById("hud-bg")) return;
    const el = document.createElement("div"); el.id = "hud-bg"; el.setAttribute("aria-hidden", "true");
    const lines = ["M-20 210 H120 L170 260 H300", "M420 520 H330 L290 480 H180 L140 520 H-20", "M60 -20 V90 L110 140 V330", "M300 880 V760 L340 720 V600 L380 560 H460", "M-20 690 H70 L110 650 H210",
      "M420 150 H330 L300 120 H230", "M200 -20 V40 L240 80 H420", "M-20 400 H40 L80 360 V300", "M150 880 V800 L190 760 H260", "M420 330 H360 L330 360 V430"];
    el.innerHTML = `<svg viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice">
      <g><circle class="rg r1" cx="360" cy="760" r="170"/><circle class="rg r2" cx="360" cy="760" r="130"/><circle class="rg r3" cx="360" cy="760" r="95"/><circle class="rg r4" cx="360" cy="760" r="60"/></g>
      <g><circle class="rg r3" cx="30" cy="120" r="90"/><circle class="rg r1" cx="30" cy="120" r="64"/><circle class="rg r4" cx="30" cy="120" r="40"/></g>
      <g><circle class="rg r1" cx="395" cy="300" r="58"/><circle class="rg r4" cx="395" cy="300" r="38"/><circle class="rg r3" cx="395" cy="300" r="24"/></g>
      <g class="sweep"><path d="M360 760 L360 600 A160 160 0 0 1 498 680 Z"/></g>
      ${lines.map(d => `<path class="ln" d="${d}"/>`).join("")}
      ${lines.map((d, i) => `<path class="pk ${["", "b", "c", "", "b", "c", "", "b", "c", ""][i]}" style="animation-delay:${-i * 1.7}s" d="${d}"/>`).join("")}
      ${lines.slice(0, 6).map((d, i) => `<path class="pk c" style="animation-delay:${-i * 3.1 - 5}s" d="${d}"/>`).join("")}
      ${[[120, 210], [170, 260], [290, 480], [180, 480], [110, 140], [340, 720], [380, 560], [110, 650], [300, 120], [240, 80], [80, 360], [190, 760], [330, 360]].map(([x, y]) => `<circle class="nd" cx="${x}" cy="${y}" r="2.6"/>`).join("")}
    </svg>`;
    document.body.prepend(el);
  })();
  function tick() { const d = new Date(); $("#clock").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  const np = { drag: false };
  document.addEventListener("pointerdown", ev => { if (ev.target.id === "np-seek") np.drag = true; });
  document.addEventListener("input", ev => { if (ev.target.id === "np-seek") { np.drag = true; const c = $("#np-cur"); if (c) c.textContent = fmtDur(+ev.target.value); } });
  setInterval(() => {
    const r = $("#np-seek"); if (!r || np.drag) return;
    const s = st(r.dataset.seek); if (!s || s.state !== "playing") return;
    const pos = npPos(s.attributes, true), dur = +r.dataset.dur;
    r.value = Math.round(pos); r.style.setProperty("--val", (dur ? pos / dur * 100 : 0) + "%");
    const c = $("#np-cur"); if (c) c.textContent = fmtDur(pos);
  }, 1000);
  setInterval(() => {
    tick();
    // Refresh pictures by loading the new one first, then swapping it in (no blank frame).
    document.querySelectorAll("img[data-cam]").forEach(img => {
      const s = st(img.dataset.cam); if (!s || !s.attributes.entity_picture) return;
      const next = new Image();
      next.onload = () => { img.src = next.src; };
      next.src = store.hassUrl + s.attributes.entity_picture + "&t=" + Date.now();
    });
    if (!$("#layer").innerHTML) scheduleRender();
  }, 30000);
  tick();

  const hassUrl = C.hassUrl || (location.pathname.includes("/local/") ? location.origin : "");
  if (hassUrl && window.HAWS) {
    connectLive(hassUrl).then(() => { render(true); if (location.hash === "#jarvis") openJarvis(); })
      .catch(e => { $("#main").innerHTML = `<p class="empty">Can't reach Home Assistant at ${esc(hassUrl)} (${esc(e.message || e)}). Check you're on the finca Wi-Fi.</p>`; });
  } else {
    Demo.load(store, scheduleRender);
    store.online = true;
    render(true);
    setTimeout(jarvisBoot, 400);
    if (location.hash === "#jarvis") openJarvis();
  }

})();
